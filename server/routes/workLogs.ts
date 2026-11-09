
import { Router, type Response } from 'express';
import { randomUUID } from 'node:crypto';

import { adminDb } from '../firebaseAdmin';
import {
    verifyUser,
    type AuthenticatedUserRequest,
} from '../middleware/verifyUser';

const router = Router();
const COLLECTION = 'workLogs';

type SubmissionStatus =
    | 'draft'
    | 'submitted'
    | 'under_review'
    | 'revision_requested'
    | 'reviewed'
    | 'rejected';

class ApiError extends Error {
    constructor(
        message: string,
        public readonly statusCode = 400
    ) {
        super(message);
        this.name = 'ApiError';
    }
}

function getUid(req: AuthenticatedUserRequest): string {
    if (!req.authenticatedUid) {
        throw new ApiError('Authentication is required.', 401);
    }

    return req.authenticatedUid;
}

function getProfile(req: AuthenticatedUserRequest) {
    if (!req.authenticatedProfile) {
        throw new ApiError('Authenticated profile is unavailable.', 401);
    }

    return req.authenticatedProfile;
}

function requireAdmin(req: AuthenticatedUserRequest): void {
    if (getProfile(req).role !== 'admin') {
        throw new ApiError('Administrator access is required.', 403);
    }
}

function cleanData(value: any): any {
    if (Array.isArray(value)) {
        return value.map((item) =>
            item === undefined ? null : cleanData(item)
        );
    }

    if (
        value !== null &&
        typeof value === 'object' &&
        (
            Object.getPrototypeOf(value) === Object.prototype ||
            Object.getPrototypeOf(value) === null
        )
    ) {
        return Object.fromEntries(
            Object.entries(value)
                .filter(([, item]) => item !== undefined)
                .map(([key, item]) => [key, cleanData(item)])
        );
    }

    return value;
}

function normalizeWorkLog(
    id: string,
    data: Record<string, any>
): Record<string, any> {
    return {
        ...data,
        id: data.id || id,
        workLogId: data.workLogId || id,
        revisionNumber: data.revisionNumber || 0,
        revisions: data.revisions || [],
        reviewHistory: data.reviewHistory || [],
        resources: data.resources || [],
    };
}

function createSnapshot(log: Record<string, any>) {
    return {
        date: log.date,
        workUndertaken: log.workUndertaken,
        workCompleted: log.workCompleted,
        pendingWork: log.pendingWork,
        blockers: log.blockers,
        remarks: log.remarks,
        attendanceId: log.attendanceId,
        sessionId: log.sessionId,
        loginTime: log.loginTime,
        logoutTime: log.logoutTime,
        jiraTaskId: log.jiraTaskId,
        jiraTaskUrl: log.jiraTaskUrl,
        resources: log.resources || [],
    };
}

function sendError(res: Response, error: unknown): void {
    if (error instanceof ApiError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
    }

    console.error('Work log API error:', error);

    res.status(500).json({
        error: 'An unexpected work-log error occurred.',
    });
}

function getWorkLogId(req: AuthenticatedUserRequest): string {
    const workLogId = req.params.workLogId;

    if (
        typeof workLogId !== 'string' ||
        !/^[a-zA-Z0-9_-]{1,150}$/.test(workLogId)
    ) {
        throw new ApiError('Invalid work log ID.');
    }

    return workLogId;
}

// All work-log endpoints require a valid, active WorkHub account.
router.use(verifyUser);

// --------------------------------------------------
// CREATE / UPDATE / RESUBMIT
// POST /api/work-logs
// --------------------------------------------------

router.post(
    '/',
    async (req: AuthenticatedUserRequest, res: Response) => {
        try {
            const uid = getUid(req);
            const profile = getProfile(req);
            const input = req.body ?? {};

            const workLogId = input.workLogId;

            if (
                typeof workLogId !== 'string' ||
                !/^[a-zA-Z0-9_-]{1,150}$/.test(workLogId)
            ) {
                throw new ApiError('A valid work log ID is required.');
            }

            if (
                typeof input.date !== 'string' ||
                !/^\d{4}-\d{2}-\d{2}$/.test(input.date)
            ) {
                throw new ApiError('A valid work date is required.');
            }

            if (
                typeof input.workUndertaken !== 'string' ||
                !input.workUndertaken.trim()
            ) {
                throw new ApiError('Please describe the work undertaken.');
            }

            if (
                typeof input.workCompleted !== 'string' ||
                !input.workCompleted.trim()
            ) {
                throw new ApiError('Please describe the work accomplished.');
            }

            const requestedStatus = input.submissionStatus;

            if (
                requestedStatus !== 'draft' &&
                requestedStatus !== 'submitted'
            ) {
                throw new ApiError(
                    'A work log can only be saved as a draft or submitted.'
                );
            }

            const workLogRef = adminDb
                .collection(COLLECTION)
                .doc(workLogId);

            const now = new Date().toISOString();

            await adminDb.runTransaction(async (transaction) => {
                const snapshot = await transaction.get(workLogRef);

                const existing: Record<string, any> | null = snapshot.exists
                    ? normalizeWorkLog(snapshot.id, snapshot.data()!)
                    : null;

                // CREATE
                if (!existing) {
                    const payload = {
                        ...input,
                        id: workLogId,
                        workLogId,
                        employeeId: uid,
                        employeeName: profile.name || '',
                        employeeEmail: profile.email || '',
                        department: profile.department || '',
                        submissionStatus: requestedStatus as SubmissionStatus,
                        revisionNumber: 0,
                        revisions: [],
                        reviewHistory: [],
                        resources: Array.isArray(input.resources)
                            ? input.resources
                            : [],
                        submittedAt:
                            requestedStatus === 'submitted' ? now : undefined,
                        createdAt: now,
                        updatedAt: now,
                    };

                    transaction.create(workLogRef, cleanData(payload));

                    return;
                }

                // OWNERSHIP
                if (existing.employeeId !== uid) {
                    throw new ApiError(
                        'You are not authorized to modify this work log.',
                        403
                    );
                }

                // UPDATE DRAFT
                if (existing.submissionStatus === 'draft') {
                    const payload = {
                        ...existing,
                        ...input,
                        id: workLogId,
                        workLogId,
                        employeeId: uid,
                        employeeName: profile.name || existing.employeeName,
                        employeeEmail: profile.email || existing.employeeEmail,
                        department: profile.department || existing.department,
                        submissionStatus: requestedStatus,
                        revisionNumber: existing.revisionNumber || 0,
                        revisions: existing.revisions || [],
                        reviewHistory: existing.reviewHistory || [],
                        resources: Array.isArray(input.resources)
                            ? input.resources
                            : existing.resources || [],
                        submittedAt:
                            requestedStatus === 'submitted'
                                ? now
                                : existing.submittedAt,
                        createdAt: existing.createdAt,
                        updatedAt: now,
                    };

                    transaction.set(workLogRef, cleanData(payload));

                    return;
                }

                // RESUBMIT AFTER REVISION REQUEST
                if (existing.submissionStatus === 'revision_requested') {
                    if (requestedStatus !== 'submitted') {
                        throw new ApiError(
                            'A requested revision must be submitted for administrative review.'
                        );
                    }

                    const nextRevisionNumber =
                        (existing.revisionNumber || 0) + 1;

                    const previousRevision = {
                        revisionId: `rev_${nextRevisionNumber}_${randomUUID().slice(0, 8)}`,
                        revisionNumber: existing.revisionNumber || 0,
                        timestamp: now,
                        editedBy: profile.name || uid,
                        workUndertaken: existing.workUndertaken,
                        workCompleted: existing.workCompleted,
                        pendingWork: existing.pendingWork,
                        blockers: existing.blockers,
                        remarks: existing.remarks,
                        snapshot: createSnapshot(existing),
                        resources: existing.resources || [],
                        submissionStatus: existing.submissionStatus,
                        submittedAt: existing.submittedAt,
                    };

                    const payload = {
                        ...existing,
                        ...input,
                        id: workLogId,
                        workLogId,
                        employeeId: uid,
                        employeeName: profile.name || existing.employeeName,
                        employeeEmail: profile.email || existing.employeeEmail,
                        department: profile.department || existing.department,
                        submissionStatus: 'submitted',
                        revisionNumber: nextRevisionNumber,
                        revisions: [
                            ...(existing.revisions || []),
                            previousRevision,
                        ],
                        reviewHistory: existing.reviewHistory || [],
                        resources: Array.isArray(input.resources)
                            ? input.resources
                            : existing.resources || [],
                        revisionRequestedBy: undefined,
                        revisionRequestedById: undefined,
                        revisionRequestedAt: undefined,
                        revisionRequestRemarks: undefined,
                        reviewedBy: undefined,
                        reviewedAt: undefined,
                        reviewRemarks: undefined,
                        submittedAt: now,
                        createdAt: existing.createdAt,
                        updatedAt: now,
                    };

                    transaction.set(workLogRef, cleanData(payload));

                    return;
                }

                throw new ApiError(
                    `This work log cannot be edited while its status is "${existing.submissionStatus}". An administrator must request a revision first.`,
                    409
                );
            });

            // Confirm the transaction's persisted result before reporting success.
            const persistedSnapshot = await workLogRef.get();

            if (!persistedSnapshot.exists) {
                throw new ApiError(
                    'The work log could not be verified after saving.',
                    500
                );
            }

            res.status(200).json({
                workLog: normalizeWorkLog(
                    persistedSnapshot.id,
                    persistedSnapshot.data()!
                ),
            });
        } catch (error) {
            sendError(res, error);
        }
    }
);

// --------------------------------------------------
// GET EMPLOYEE WORK LOGS
// GET /api/work-logs/mine
// --------------------------------------------------

router.get(
    '/mine',
    async (req: AuthenticatedUserRequest, res: Response) => {
        try {
            const uid = getUid(req);

            const snapshot = await adminDb
                .collection(COLLECTION)
                .where('employeeId', '==', uid)
                .get();

            const workLogs = snapshot.docs.map((document) =>
                normalizeWorkLog(document.id, document.data())
            );

            workLogs.sort((a, b) => {
                const dateOrder = (b.date || '').localeCompare(a.date || '');

                return dateOrder !== 0
                    ? dateOrder
                    : (b.updatedAt || '').localeCompare(a.updatedAt || '');
            });

            res.json({ workLogs });
        } catch (error) {
            sendError(res, error);
        }
    }
);

// --------------------------------------------------
// GET ALL WORK LOGS
// GET /api/work-logs
//
// Admin: all records.
// Employee: only their own records.
// --------------------------------------------------

router.get(
    '/',
    async (req: AuthenticatedUserRequest, res: Response) => {
        try {
            const uid = getUid(req);
            const profile = getProfile(req);

            const query =
                profile.role === 'admin'
                    ? adminDb.collection(COLLECTION)
                    : adminDb
                        .collection(COLLECTION)
                        .where('employeeId', '==', uid);

            const snapshot = await query.get();

            const workLogs = snapshot.docs.map((document) =>
                normalizeWorkLog(document.id, document.data())
            );

            workLogs.sort((a, b) => {
                const dateOrder = (b.date || '').localeCompare(a.date || '');

                return dateOrder !== 0
                    ? dateOrder
                    : (b.updatedAt || '').localeCompare(a.updatedAt || '');
            });

            res.json({ workLogs });
        } catch (error) {
            sendError(res, error);
        }
    }
);

// --------------------------------------------------
// GET SINGLE WORK LOG
// GET /api/work-logs/:workLogId
// --------------------------------------------------

router.get(
    '/:workLogId',
    async (req: AuthenticatedUserRequest, res: Response) => {
        try {
            const uid = getUid(req);
            const profile = getProfile(req);
            const workLogId = getWorkLogId(req);

            const snapshot = await adminDb
                .collection(COLLECTION)
                .doc(workLogId)
                .get();

            if (!snapshot.exists) {
                res.json({ workLog: null });
                return;
            }

            const workLog = normalizeWorkLog(
                snapshot.id,
                snapshot.data()!
            );

            if (
                profile.role !== 'admin' &&
                workLog.employeeId !== uid
            ) {
                throw new ApiError(
                    'You are not authorized to view this work log.',
                    403
                );
            }

            res.json({ workLog });
        } catch (error) {
            sendError(res, error);
        }
    }
);

// --------------------------------------------------
// MARK WORK LOG UNDER REVIEW
// PATCH /api/work-logs/:workLogId/under-review
// --------------------------------------------------

router.patch(
    '/:workLogId/under-review',
    async (req: AuthenticatedUserRequest, res: Response) => {
        try {
            requireAdmin(req);

            const workLogId = getWorkLogId(req);
            const workLogRef = adminDb
                .collection(COLLECTION)
                .doc(workLogId);

            const updated = await adminDb.runTransaction(async (transaction) => {
                const snapshot = await transaction.get(workLogRef);

                if (!snapshot.exists) {
                    throw new ApiError('Work log not found.', 404);
                }

                const existing = normalizeWorkLog(
                    snapshot.id,
                    snapshot.data()!
                );

                if (existing.submissionStatus !== 'submitted') {
                    throw new ApiError(
                        'Only submitted work logs can enter review.',
                        409
                    );
                }

                const update = {
                    submissionStatus: 'under_review',
                    updatedAt: new Date().toISOString(),
                };

                transaction.update(workLogRef, update);

                return { ...existing, ...update };
            });

            res.json({ workLog: updated });
        } catch (error) {
            sendError(res, error);
        }
    }
);

// --------------------------------------------------
// APPROVE / REVIEW WORK LOG
// PATCH /api/work-logs/:workLogId/review
// --------------------------------------------------

router.patch(
    '/:workLogId/review',
    async (req: AuthenticatedUserRequest, res: Response) => {
        try {
            requireAdmin(req);

            const uid = getUid(req);
            const profile = getProfile(req);
            const workLogId = getWorkLogId(req);

            const remarks =
                typeof req.body?.reviewRemarks === 'string'
                    ? req.body.reviewRemarks.trim()
                    : '';

            const reviewerName = profile.name || profile.email || uid;

            const workLogRef = adminDb
                .collection(COLLECTION)
                .doc(workLogId);

            const updated = await adminDb.runTransaction(async (transaction) => {
                const snapshot = await transaction.get(workLogRef);

                if (!snapshot.exists) {
                    throw new ApiError('Work log not found.', 404);
                }

                const existing = normalizeWorkLog(
                    snapshot.id,
                    snapshot.data()!
                );

                if (
                    existing.submissionStatus !== 'submitted' &&
                    existing.submissionStatus !== 'under_review'
                ) {
                    throw new ApiError(
                        'Only submitted or under-review work logs can be approved.',
                        409
                    );
                }

                const now = new Date().toISOString();

                const review = {
                    reviewId: `review_${randomUUID()}`,
                    workLogId,
                    reviewerId: uid,
                    reviewerName,
                    reviewerEmail: profile.email || '',
                    reviewStatus: 'approved',
                    remarks,
                    revisionNumber: existing.revisionNumber || 0,
                    reviewedAt: now,
                };

                const update = {
                    submissionStatus: 'reviewed',
                    reviewedBy: reviewerName,
                    reviewRemarks: remarks,
                    reviewedAt: now,
                    reviewHistory: [
                        ...(existing.reviewHistory || []),
                        review,
                    ],
                    updatedAt: now,
                };

                transaction.update(workLogRef, update);

                return { ...existing, ...update };
            });

            res.json({ workLog: updated });
        } catch (error) {
            sendError(res, error);
        }
    }
);

// --------------------------------------------------
// REQUEST WORK LOG REVISION
// PATCH /api/work-logs/:workLogId/request-revision
// --------------------------------------------------

router.patch(
    '/:workLogId/request-revision',
    async (req: AuthenticatedUserRequest, res: Response) => {
        try {
            requireAdmin(req);

            const uid = getUid(req);
            const profile = getProfile(req);
            const workLogId = getWorkLogId(req);

            const remarks =
                typeof req.body?.revisionRemarks === 'string'
                    ? req.body.revisionRemarks.trim()
                    : '';

            if (!remarks) {
                throw new ApiError(
                    'Please provide a reason for requesting a revision.'
                );
            }

            const reviewerName = profile.name || profile.email || uid;

            const workLogRef = adminDb
                .collection(COLLECTION)
                .doc(workLogId);

            const updated = await adminDb.runTransaction(async (transaction) => {
                const snapshot = await transaction.get(workLogRef);

                if (!snapshot.exists) {
                    throw new ApiError('Work log not found.', 404);
                }

                const existing = normalizeWorkLog(
                    snapshot.id,
                    snapshot.data()!
                );

                if (
                    existing.submissionStatus !== 'submitted' &&
                    existing.submissionStatus !== 'under_review'
                ) {
                    throw new ApiError(
                        'A revision can only be requested for a submitted or under-review work log.',
                        409
                    );
                }

                const now = new Date().toISOString();

                const review = {
                    reviewId: `review_${randomUUID()}`,
                    workLogId,
                    reviewerId: uid,
                    reviewerName,
                    reviewerEmail: profile.email || '',
                    reviewStatus: 'revision_requested',
                    remarks,
                    revisionNumber: existing.revisionNumber || 0,
                    reviewedAt: now,
                };

                const update = {
                    submissionStatus: 'revision_requested',
                    revisionRequestedBy: reviewerName,
                    revisionRequestedById: uid,
                    revisionRequestedAt: now,
                    revisionRequestRemarks: remarks,
                    reviewRemarks: remarks,
                    reviewedBy: reviewerName,
                    reviewedAt: now,
                    reviewHistory: [
                        ...(existing.reviewHistory || []),
                        review,
                    ],
                    updatedAt: now,
                };

                transaction.update(workLogRef, update);

                return { ...existing, ...update };
            });

            res.json({ workLog: updated });
        } catch (error) {
            sendError(res, error);
        }
    }
);


// --------------------------------------------------
// REJECT WORK LOG (TERMINAL DECISION)
// PATCH /api/work-logs/:workLogId/reject
// --------------------------------------------------

router.patch(
    '/:workLogId/reject',
    async (req: AuthenticatedUserRequest, res: Response) => {
        try {
            requireAdmin(req);

            const uid = getUid(req);
            const profile = getProfile(req);
            const workLogId = getWorkLogId(req);

            const remarks =
                typeof req.body?.reviewRemarks === 'string'
                    ? req.body.reviewRemarks.trim()
                    : '';

            if (!remarks) {
                throw new ApiError(
                    'Please provide a reason for rejecting this work log.'
                );
            }

            const reviewerName = profile.name || profile.email || uid;
            const workLogRef = adminDb
                .collection(COLLECTION)
                .doc(workLogId);

            const updated = await adminDb.runTransaction(async (transaction) => {
                const snapshot = await transaction.get(workLogRef);

                if (!snapshot.exists) {
                    throw new ApiError('Work log not found.', 404);
                }

                const existing = normalizeWorkLog(
                    snapshot.id,
                    snapshot.data()!
                );

                if (
                    existing.submissionStatus !== 'submitted' &&
                    existing.submissionStatus !== 'under_review'
                ) {
                    throw new ApiError(
                        'Only submitted or under-review work logs can be rejected.',
                        409
                    );
                }

                const now = new Date().toISOString();

                const review = {
                    reviewId: `review_${randomUUID()}`,
                    workLogId,
                    reviewerId: uid,
                    reviewerName,
                    reviewerEmail: profile.email || '',
                    reviewStatus: 'rejected',
                    remarks,
                    revisionNumber: existing.revisionNumber || 0,
                    reviewedAt: now,
                };

                const update = {
                    submissionStatus: 'rejected',
                    reviewedBy: reviewerName,
                    reviewRemarks: remarks,
                    reviewedAt: now,
                    reviewHistory: [
                        ...(existing.reviewHistory || []),
                        review,
                    ],
                    updatedAt: now,
                };

                transaction.update(workLogRef, update);

                return { ...existing, ...update };
            });

            res.json({ workLog: updated });
        } catch (error) {
            sendError(res, error);
        }
    }
);

export default router;
