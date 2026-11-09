
import { Router, type Response } from 'express';
import { randomUUID } from 'node:crypto';
import {
    FieldValue,
    type Query,
} from 'firebase-admin/firestore';

import { adminDb } from '../firebaseAdmin.js';
import {
    verifyUser,
    type AuthenticatedUserRequest,
} from '../middleware/verifyUser.js';
import { verifyAdmin } from '../middleware/verifyAdmin.js';

const router = Router();

const ATTENDANCE_COLLECTION = 'attendance';
const SESSION_COLLECTION = 'workSessions';
const BREAK_COLLECTION = 'breaks';
const CORRECTION_COLLECTION = 'correctionRequests';
const AUDIT_COLLECTION = 'auditLogs';

type WorkMode = 'office' | 'home';

class ApiError extends Error {
    constructor(
        message: string,
        public readonly statusCode: number = 400
    ) {
        super(message);
        this.name = 'ApiError';
    }
}

function getISTDateString(date = new Date()): string {
    return new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).format(date);
}

function getDurationSeconds(start: string, end: string): number {
    const startTime = new Date(start).getTime();
    const endTime = new Date(end).getTime();

    if (!Number.isFinite(startTime) || !Number.isFinite(endTime)) {
        return 0;
    }

    return Math.max(0, Math.floor((endTime - startTime) / 1000));
}

function createId(prefix: string): string {
    return `${prefix}_${Date.now()}_${randomUUID().slice(0, 8)}`;
}

function sendError(res: Response, error: unknown): void {
    if (error instanceof ApiError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
    }

    console.error('Attendance API error:', error);

    res.status(500).json({
        error: 'An unexpected attendance error occurred.',
    });
}

function createAuditRecord(
    actorId: string,
    actorEmail: string,
    action: string,
    targetId: string,
    metadata?: Record<string, unknown>
) {
    const auditId = createId('audit');

    return {
        ref: adminDb.collection(AUDIT_COLLECTION).doc(auditId),
        data: {
            id: auditId,
            auditId,
            actorId,
            actorEmail,
            action,
            targetId,
            timestamp: new Date().toISOString(),
            ...(metadata ? { metadata } : {}),
        },
    };
}

function getProfile(req: AuthenticatedUserRequest) {
    if (!req.authenticatedProfile) {
        throw new ApiError(
            'Authenticated user profile is unavailable.',
            401
        );
    }

    return req.authenticatedProfile;
}

function getUid(req: AuthenticatedUserRequest): string {
    if (!req.authenticatedUid) {
        throw new ApiError('Authentication is required.', 401);
    }

    return req.authenticatedUid;
}

function getTodayAttendanceRef(uid: string, workDate: string) {
    const attendanceId = `att_${uid}_${workDate}`;

    return {
        attendanceId,
        ref: adminDb
            .collection(ATTENDANCE_COLLECTION)
            .doc(attendanceId),
    };
}

// All routes require a valid, active WorkHub account.
router.use(verifyUser);

// --------------------------------------------------
// GET ATTENDANCE HISTORY
// GET /api/attendance/history
// Employees can access their own history.
// Admins can optionally request a specific employee.
// --------------------------------------------------

router.get(
    '/history',
    async (req: AuthenticatedUserRequest, res: Response) => {
        try {
            const uid = getUid(req);
            const profile = getProfile(req);

            const requestedEmployeeId =
                typeof req.query.employeeId === 'string'
                    ? req.query.employeeId.trim()
                    : '';

            if (
                profile.role !== 'admin' &&
                requestedEmployeeId &&
                requestedEmployeeId !== uid
            ) {
                throw new ApiError(
                    'You are not authorized to access this attendance history.',
                    403
                );
            }

            const targetEmployeeId =
                profile.role === 'admin' && requestedEmployeeId
                    ? requestedEmployeeId
                    : uid;

            const snapshot = await adminDb
                .collection(ATTENDANCE_COLLECTION)
                .where('employeeId', '==', targetEmployeeId)
                .get();

            const sortedDocuments = [...snapshot.docs].sort(
                (a, b) => {
                    const dateA = String(
                        a.data().workDate || ''
                    );

                    const dateB = String(
                        b.data().workDate || ''
                    );

                    return dateB.localeCompare(dateA);
                }
            );

            const records = sortedDocuments.map((document) => {
                const data = document.data();

                return {
                    ...data,
                    id: data.id || document.id,
                    attendanceId:
                        data.attendanceId || document.id,
                };
            });

            res.json({ records });
        } catch (error) {
            sendError(res, error);
        }
    }
);

// --------------------------------------------------
// GET ALL ATTENDANCE RECORDS
// GET /api/attendance
// Admin only
// --------------------------------------------------

router.get(
    '/',
    verifyAdmin,
    async (_req: AuthenticatedUserRequest, res: Response) => {
        try {
            const snapshot = await adminDb
                .collection(ATTENDANCE_COLLECTION)
                .get();

            const now = new Date().toISOString();

            const sortedDocuments = [...snapshot.docs].sort(
                (a, b) => {
                    const dateA = String(
                        a.data().workDate || ''
                    );

                    const dateB = String(
                        b.data().workDate || ''
                    );

                    return dateB.localeCompare(dateA);
                }
            );

            const records = sortedDocuments.map((document) => {
                const data = document.data();

                const liveWorkingSeconds =
                    data.status === 'checked_in' &&
                        typeof data.currentSessionStart === 'string'
                        ? getDurationSeconds(
                            data.currentSessionStart,
                            now
                        )
                        : 0;

                return {
                    ...data,
                    id: data.id || document.id,
                    attendanceId:
                        data.attendanceId || document.id,
                    totalWorkingSeconds:
                        (data.totalWorkingSeconds || 0) +
                        liveWorkingSeconds,
                };
            });

            res.json({ records });
        } catch (error) {
            sendError(res, error);
        }
    }
);


// --------------------------------------------------
// GET TODAY'S ATTENDANCE
// GET /api/attendance/today
// --------------------------------------------------

router.get(
    '/today',
    async (req: AuthenticatedUserRequest, res: Response) => {
        try {
            const uid = getUid(req);
            const workDate = getISTDateString();

            const { ref: attendanceRef } =
                getTodayAttendanceRef(uid, workDate);

            const snapshot = await attendanceRef.get();

            if (!snapshot.exists) {
                res.json(null);
                return;
            }

            const record = snapshot.data()!;

            const liveWorkingSeconds =
                record.status === 'checked_in' &&
                    typeof record.currentSessionStart === 'string'
                    ? getDurationSeconds(
                        record.currentSessionStart,
                        new Date().toISOString()
                    )
                    : 0;

            res.json({
                ...record,
                totalWorkingSeconds:
                    (record.totalWorkingSeconds || 0) +
                    liveWorkingSeconds,
            });
        } catch (error) {
            sendError(res, error);
        }
    }
);

// --------------------------------------------------
// CHECK IN
// POST /api/attendance/check-in
// --------------------------------------------------

router.post(
    '/check-in',
    async (req: AuthenticatedUserRequest, res: Response) => {
        try {
            const uid = getUid(req);
            const profile = getProfile(req);
            const { workMode } = req.body ?? {};

            if (workMode !== 'office' && workMode !== 'home') {
                throw new ApiError(
                    'Work mode must be office or home.'
                );
            }

            const now = new Date().toISOString();
            const workDate = getISTDateString(new Date(now));

            const { attendanceId, ref: attendanceRef } =
                getTodayAttendanceRef(uid, workDate);

            const sessionId = createId(`sess_${uid}`);

            const sessionRef = adminDb
                .collection(SESSION_COLLECTION)
                .doc(sessionId);

            const session = {
                id: sessionId,
                sessionId,
                attendanceId,
                employeeId: uid,
                workMode: workMode as WorkMode,
                checkInAt: now,
                status: 'active',
            };

            const result = await adminDb.runTransaction(async (transaction) => {
                const snapshot = await transaction.get(attendanceRef);

                const existing = snapshot.exists
                    ? snapshot.data()
                    : null;

                if (
                    existing?.status === 'checked_in' ||
                    existing?.status === 'on_break'
                ) {
                    throw new ApiError(
                        existing.status === 'on_break'
                            ? 'You are currently on break. Please end your break first.'
                            : 'You already have an active checked-in session.',
                        409
                    );
                }

                const attendance = {
                    id: attendanceId,
                    attendanceId,
                    employeeId: uid,
                    employeeName: profile.name,
                    employeeEmail: profile.email,
                    department: profile.department || 'R&D',
                    workDate,
                    workMode,
                    status: 'checked_in',
                    totalWorkingSeconds:
                        existing?.totalWorkingSeconds || 0,
                    totalBreakSeconds:
                        existing?.totalBreakSeconds || 0,
                    firstCheckIn: existing?.firstCheckIn || now,
                    currentSessionStart: now,
                    activeSessionId: sessionId,
                    createdAt: existing?.createdAt || now,
                    updatedAt: now,
                };

                transaction.set(sessionRef, session);

                // Full document replacement: omitted optional fields
                // are removed automatically. Do not use FieldValue.delete()
                // in this set operation.
                transaction.set(attendanceRef, attendance);

                const audit = createAuditRecord(
                    uid,
                    profile.email,
                    'CHECK_IN',
                    attendanceId,
                    { workMode }
                );

                transaction.set(audit.ref, audit.data);

                return attendance;
            });

            res.status(200).json(result);
        } catch (error) {
            sendError(res, error);
        }
    }
);

// --------------------------------------------------
// START BREAK
// POST /api/attendance/start-break
// --------------------------------------------------

router.post(
    '/start-break',
    async (req: AuthenticatedUserRequest, res: Response) => {
        try {
            const uid = getUid(req);
            const profile = getProfile(req);

            const reason =
                typeof req.body?.reason === 'string' &&
                    req.body.reason.trim()
                    ? req.body.reason.trim().slice(0, 200)
                    : 'Break';

            const now = new Date().toISOString();
            const workDate = getISTDateString(new Date(now));

            const { attendanceId, ref: attendanceRef } =
                getTodayAttendanceRef(uid, workDate);

            const breakId = createId(`break_${uid}`);

            const breakRef = adminDb
                .collection(BREAK_COLLECTION)
                .doc(breakId);

            const result = await adminDb.runTransaction(async (transaction) => {
                const snapshot = await transaction.get(attendanceRef);

                if (!snapshot.exists) {
                    throw new ApiError(
                        'No active attendance record found.',
                        404
                    );
                }

                const record = snapshot.data()!;

                if (record.employeeId !== uid) {
                    throw new ApiError(
                        'You are not authorized to modify this record.',
                        403
                    );
                }

                if (record.status !== 'checked_in') {
                    throw new ApiError(
                        'You must be actively checked in to take a break.',
                        409
                    );
                }

                if (
                    !record.activeSessionId ||
                    !record.currentSessionStart
                ) {
                    throw new ApiError(
                        'The active work session is incomplete.',
                        409
                    );
                }

                const sessionAccrued = getDurationSeconds(
                    record.currentSessionStart,
                    now
                );

                const breakItem = {
                    id: breakId,
                    breakId,
                    sessionId: record.activeSessionId,
                    attendanceId,
                    employeeId: uid,
                    breakStartAt: now,
                    reason,
                };

                const updatedRecord = {
                    ...record,
                    status: 'on_break',
                    totalWorkingSeconds:
                        (record.totalWorkingSeconds || 0) +
                        sessionAccrued,
                    currentSessionStart: undefined,
                    currentBreakStart: now,
                    activeBreakId: breakId,
                    updatedAt: now,
                };

                transaction.set(breakRef, breakItem);

                transaction.update(attendanceRef, {
                    status: 'on_break',
                    totalWorkingSeconds:
                        updatedRecord.totalWorkingSeconds,
                    currentSessionStart: FieldValue.delete(),
                    currentBreakStart: now,
                    activeBreakId: breakId,
                    updatedAt: now,
                });

                const audit = createAuditRecord(
                    uid,
                    profile.email,
                    'START_BREAK',
                    breakId,
                    { reason }
                );

                transaction.set(audit.ref, audit.data);

                return updatedRecord;
            });

            res.json(result);
        } catch (error) {
            sendError(res, error);
        }
    }
);

// --------------------------------------------------
// END BREAK
// POST /api/attendance/end-break
// --------------------------------------------------

router.post(
    '/end-break',
    async (req: AuthenticatedUserRequest, res: Response) => {
        try {
            const uid = getUid(req);
            const profile = getProfile(req);

            const now = new Date().toISOString();
            const workDate = getISTDateString(new Date(now));

            const { attendanceId, ref: attendanceRef } =
                getTodayAttendanceRef(uid, workDate);

            const result = await adminDb.runTransaction(async (transaction) => {
                const snapshot = await transaction.get(attendanceRef);

                if (!snapshot.exists) {
                    throw new ApiError(
                        'No attendance record found.',
                        404
                    );
                }

                const record = snapshot.data()!;

                if (record.employeeId !== uid) {
                    throw new ApiError(
                        'You are not authorized to modify this record.',
                        403
                    );
                }

                if (
                    record.status !== 'on_break' ||
                    !record.activeBreakId ||
                    !record.currentBreakStart
                ) {
                    throw new ApiError(
                        'No active break found to end.',
                        409
                    );
                }

                const breakRef = adminDb
                    .collection(BREAK_COLLECTION)
                    .doc(record.activeBreakId);

                const breakSnapshot = await transaction.get(breakRef);

                if (!breakSnapshot.exists) {
                    throw new ApiError(
                        'Active break record could not be found.',
                        404
                    );
                }

                const breakDuration = getDurationSeconds(
                    record.currentBreakStart,
                    now
                );

                const totalBreakSeconds =
                    (record.totalBreakSeconds || 0) +
                    breakDuration;

                transaction.update(breakRef, {
                    breakEndAt: now,
                    durationSeconds: breakDuration,
                });

                transaction.update(attendanceRef, {
                    status: 'checked_in',
                    totalBreakSeconds,
                    currentBreakStart: FieldValue.delete(),
                    activeBreakId: FieldValue.delete(),
                    currentSessionStart: now,
                    updatedAt: now,
                });

                const audit = createAuditRecord(
                    uid,
                    profile.email,
                    'END_BREAK',
                    record.activeBreakId,
                    { breakDuration }
                );

                transaction.set(audit.ref, audit.data);

                return {
                    ...record,
                    status: 'checked_in',
                    totalBreakSeconds,
                    currentBreakStart: undefined,
                    activeBreakId: undefined,
                    currentSessionStart: now,
                    updatedAt: now,
                };
            });

            res.json(result);
        } catch (error) {
            sendError(res, error);
        }
    }
);

// --------------------------------------------------
// CHECK OUT
// POST /api/attendance/check-out
// --------------------------------------------------

router.post(
    '/check-out',
    async (req: AuthenticatedUserRequest, res: Response) => {
        try {
            const uid = getUid(req);
            const profile = getProfile(req);

            const now = new Date().toISOString();
            const workDate = getISTDateString(new Date(now));

            const { attendanceId, ref: attendanceRef } =
                getTodayAttendanceRef(uid, workDate);

            const result = await adminDb.runTransaction(async (transaction) => {
                const snapshot = await transaction.get(attendanceRef);

                if (!snapshot.exists) {
                    throw new ApiError(
                        'No attendance record found.',
                        404
                    );
                }

                const record = snapshot.data()!;

                if (record.employeeId !== uid) {
                    throw new ApiError(
                        'You are not authorized to modify this record.',
                        403
                    );
                }

                if (
                    record.status !== 'checked_in' &&
                    record.status !== 'on_break'
                ) {
                    throw new ApiError(
                        'No active work session to check out from.',
                        409
                    );
                }

                if (!record.activeSessionId) {
                    throw new ApiError(
                        'The active work session could not be identified.',
                        409
                    );
                }

                const sessionRef = adminDb
                    .collection(SESSION_COLLECTION)
                    .doc(record.activeSessionId);

                const sessionSnapshot = await transaction.get(sessionRef);

                if (!sessionSnapshot.exists) {
                    throw new ApiError(
                        'The active work session record could not be found.',
                        404
                    );
                }

                const session = sessionSnapshot.data()!;

                if (
                    session.employeeId !== uid ||
                    session.attendanceId !== attendanceId ||
                    session.status !== 'active'
                ) {
                    throw new ApiError(
                        'The active work session could not be verified.',
                        409
                    );
                }

                const breaksQuery = adminDb
                    .collection(BREAK_COLLECTION)
                    .where(
                        'sessionId',
                        '==',
                        record.activeSessionId
                    );

                const breaksSnapshot = await transaction.get(breaksQuery);

                let totalSessionBreakSeconds = 0;

                breaksSnapshot.docs.forEach((breakDocument) => {
                    const breakRecord = breakDocument.data();

                    const breakEnd =
                        breakRecord.breakEndAt ||
                        (
                            breakRecord.breakId === record.activeBreakId
                                ? now
                                : undefined
                        );

                    if (breakRecord.breakStartAt && breakEnd) {
                        totalSessionBreakSeconds += getDurationSeconds(
                            breakRecord.breakStartAt,
                            breakEnd
                        );
                    }
                });

                const addWorkingSeconds =
                    record.status === 'checked_in' &&
                        record.currentSessionStart
                        ? getDurationSeconds(
                            record.currentSessionStart,
                            now
                        )
                        : 0;

                const addBreakSeconds =
                    record.status === 'on_break' &&
                        record.currentBreakStart
                        ? getDurationSeconds(
                            record.currentBreakStart,
                            now
                        )
                        : 0;

                if (
                    record.status === 'on_break' &&
                    (
                        !record.activeBreakId ||
                        !record.currentBreakStart
                    )
                ) {
                    throw new ApiError(
                        'The active break could not be verified.',
                        409
                    );
                }

                const totalWorkingSeconds =
                    (record.totalWorkingSeconds || 0) +
                    addWorkingSeconds;

                const totalBreakSeconds =
                    (record.totalBreakSeconds || 0) +
                    addBreakSeconds;

                const sessionDurationSeconds = Math.max(
                    0,
                    getDurationSeconds(session.checkInAt, now) -
                    totalSessionBreakSeconds
                );

                if (
                    record.status === 'on_break' &&
                    record.activeBreakId
                ) {
                    const activeBreakRef = adminDb
                        .collection(BREAK_COLLECTION)
                        .doc(record.activeBreakId);

                    transaction.update(activeBreakRef, {
                        breakEndAt: now,
                        durationSeconds: addBreakSeconds,
                    });
                }

                transaction.update(sessionRef, {
                    checkOutAt: now,
                    durationSeconds: sessionDurationSeconds,
                    status: 'completed',
                });

                transaction.update(attendanceRef, {
                    status: 'checked_out',
                    lastCheckOut: now,
                    totalWorkingSeconds,
                    totalBreakSeconds,
                    currentSessionStart: FieldValue.delete(),
                    currentBreakStart: FieldValue.delete(),
                    activeSessionId: FieldValue.delete(),
                    activeBreakId: FieldValue.delete(),
                    updatedAt: now,
                });

                const audit = createAuditRecord(
                    uid,
                    profile.email,
                    'CHECK_OUT',
                    attendanceId,
                    {
                        totalWorkingSeconds,
                        totalBreakSeconds,
                        sessionDurationSeconds,
                    }
                );

                transaction.set(audit.ref, audit.data);

                return {
                    ...record,
                    status: 'checked_out',
                    lastCheckOut: now,
                    totalWorkingSeconds,
                    totalBreakSeconds,
                    currentSessionStart: undefined,
                    currentBreakStart: undefined,
                    activeSessionId: undefined,
                    activeBreakId: undefined,
                    updatedAt: now,
                };
            });

            res.json(result);
        } catch (error) {
            sendError(res, error);
        }
    }
);

// --------------------------------------------------
// SUBMIT CORRECTION REQUEST
// POST /api/attendance/correction-requests
// --------------------------------------------------

router.post(
    '/correction-requests',
    async (req: AuthenticatedUserRequest, res: Response) => {
        try {
            const uid = getUid(req);
            const profile = getProfile(req);

            const {
                attendanceId,
                workDate,
                requestedChanges,
                reason,
            } = req.body ?? {};

            if (
                typeof attendanceId !== 'string' ||
                !attendanceId.trim() ||
                typeof workDate !== 'string' ||
                !/^\d{4}-\d{2}-\d{2}$/.test(workDate) ||
                typeof requestedChanges !== 'string' ||
                !requestedChanges.trim() ||
                typeof reason !== 'string' ||
                !reason.trim()
            ) {
                throw new ApiError(
                    'Attendance ID, valid work date, requested changes and reason are required.'
                );
            }

            const attendanceRef = adminDb
                .collection(ATTENDANCE_COLLECTION)
                .doc(attendanceId.trim());

            const attendanceSnapshot = await attendanceRef.get();
            const attendance = attendanceSnapshot.data();

            if (
                !attendanceSnapshot.exists ||
                attendance?.employeeId !== uid ||
                attendance?.workDate !== workDate
            ) {
                throw new ApiError(
                    'The specified attendance record was not found.',
                    404
                );
            }

            const requestId = createId('corr');
            const now = new Date().toISOString();

            const correction = {
                id: requestId,
                requestId,
                employeeId: uid,
                employeeName: profile.name,
                attendanceId: attendanceId.trim(),
                workDate,
                requestedChanges: requestedChanges.trim().slice(0, 2000),
                reason: reason.trim().slice(0, 2000),
                approvalStatus: 'pending',
                createdAt: now,
            };

            const correctionRef = adminDb
                .collection(CORRECTION_COLLECTION)
                .doc(requestId);

            const audit = createAuditRecord(
                uid,
                profile.email,
                'SUBMIT_CORRECTION',
                requestId,
                { workDate }
            );

            const batch = adminDb.batch();

            batch.set(correctionRef, correction);
            batch.set(audit.ref, audit.data);

            await batch.commit();

            res.status(201).json(correction);
        } catch (error) {
            sendError(res, error);
        }
    }
);

// --------------------------------------------------
// GET CORRECTION REQUESTS
// GET /api/attendance/correction-requests
// --------------------------------------------------

router.get(
    '/correction-requests',
    async (req: AuthenticatedUserRequest, res: Response) => {
        try {
            const uid = getUid(req);
            const profile = getProfile(req);

            let requestsQuery: Query = adminDb.collection(
                CORRECTION_COLLECTION
            );

            if (profile.role !== 'admin') {
                requestsQuery = requestsQuery.where(
                    'employeeId',
                    '==',
                    uid
                );
            }

            const snapshot = await requestsQuery.get();

            const requests = snapshot.docs
                .map((document) => document.data())
                .sort((a, b) =>
                    String(b.createdAt || '').localeCompare(
                        String(a.createdAt || '')
                    )
                );

            res.json(requests);
        } catch (error) {
            sendError(res, error);
        }
    }
);

// --------------------------------------------------
// REVIEW CORRECTION REQUEST
// PATCH /api/attendance/correction-requests/:requestId/review
// Admin only
// --------------------------------------------------

router.patch(
    '/correction-requests/:requestId/review',
    verifyAdmin,
    async (req: AuthenticatedUserRequest, res: Response) => {
        try {
            const uid = getUid(req);
            const profile = getProfile(req);

            const { requestId } = req.params;
            const {
                status,
                comment,
                adjustedWorkingSeconds,
            } = req.body ?? {};

            if (
                status !== 'approved' &&
                status !== 'rejected'
            ) {
                throw new ApiError(
                    'Status must be approved or rejected.'
                );
            }

            if (
                typeof comment !== 'string' ||
                !comment.trim()
            ) {
                throw new ApiError(
                    'A review comment is required.'
                );
            }

            if (
                adjustedWorkingSeconds !== undefined &&
                (
                    status !== 'approved' ||
                    !Number.isSafeInteger(adjustedWorkingSeconds) ||
                    adjustedWorkingSeconds < 0
                )
            ) {
                throw new ApiError(
                    'Adjusted working seconds must be a non-negative safe integer and can only be supplied for approved requests.'
                );
            }

            const correctionRef = adminDb
                .collection(CORRECTION_COLLECTION)
                .doc(requestId);

            const now = new Date().toISOString();

            const result = await adminDb.runTransaction(async (transaction) => {
                const correctionSnapshot = await transaction.get(correctionRef);

                if (!correctionSnapshot.exists) {
                    throw new ApiError(
                        'Correction request not found.',
                        404
                    );
                }

                const correction = correctionSnapshot.data()!;

                if (correction.approvalStatus !== 'pending') {
                    throw new ApiError(
                        'This correction request has already been reviewed.',
                        409
                    );
                }

                const attendanceRef = adminDb
                    .collection(ATTENDANCE_COLLECTION)
                    .doc(correction.attendanceId);

                const attendanceSnapshot =
                    adjustedWorkingSeconds !== undefined
                        ? await transaction.get(attendanceRef)
                        : null;

                if (
                    adjustedWorkingSeconds !== undefined &&
                    (
                        !attendanceSnapshot?.exists ||
                        attendanceSnapshot.data()?.employeeId !==
                        correction.employeeId
                    )
                ) {
                    throw new ApiError(
                        'The associated attendance record could not be verified.',
                        404
                    );
                }

                const reviewComment = comment.trim().slice(0, 2000);

                transaction.update(correctionRef, {
                    approvalStatus: status,
                    reviewedBy: profile.name,
                    reviewComment,
                    reviewedAt: now,
                });

                if (adjustedWorkingSeconds !== undefined) {
                    transaction.update(attendanceRef, {
                        totalWorkingSeconds: adjustedWorkingSeconds,
                        updatedAt: now,
                    });
                }

                const audit = createAuditRecord(
                    uid,
                    profile.email,
                    `CORRECTION_${status.toUpperCase()}`,
                    requestId,
                    {
                        comment: reviewComment,
                        adjustedWorkingSeconds,
                    }
                );

                transaction.set(audit.ref, audit.data);

                return {
                    requestId,
                    approvalStatus: status,
                    reviewedBy: profile.name,
                    reviewComment,
                    reviewedAt: now,
                };
            });

            res.json(result);
        } catch (error) {
            sendError(res, error);
        }
    }
);

export default router;
