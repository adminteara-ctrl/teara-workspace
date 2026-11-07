
import {
  db,
  handleFirestoreError,
  OperationType,
} from '../lib/firebase';

import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  writeBatch,
  updateDoc,
} from 'firebase/firestore';

import { WorkLog, WorkLogRevision } from '../types';

/**
 * Remove undefined values before sending data to Firestore.
 * Preserve Firestore objects, Dates and other non-plain objects.
 */
const cleanFirestoreData = (value: any): any => {
  if (Array.isArray(value)) {
    return value.map((item) =>
      item === undefined ? null : cleanFirestoreData(item)
    );
  }

  if (
    value !== null &&
    typeof value === 'object' &&
    (Object.getPrototypeOf(value) === Object.prototype ||
      Object.getPrototypeOf(value) === null)
  ) {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([_, item]) => item !== undefined)
        .map(([key, item]) => [key, cleanFirestoreData(item)])
    );
  }

  return value;
};

class WorkLogService {
  /**
   * Create a new work log or update an existing one.
   */
  async createOrUpdateWorkLog(
    log: WorkLog,
    isRevision = false
  ): Promise<WorkLog> {
    if (!log.workLogId) {
      throw new Error('A valid work log ID is required.');
    }

    if (!log.employeeId) {
      throw new Error('Employee ID is missing.');
    }

    const workLogRef = doc(db, 'workLogs', log.workLogId);

    try {
      // Retrieve the persisted record to preserve revision history.
      const existingSnapshot = await getDoc(workLogRef);

      const existing = existingSnapshot.exists()
        ? (existingSnapshot.data() as WorkLog)
        : null;

      if (isRevision && !existing) {
        throw new Error(
          'The original work log could not be found. Refresh your work logs and try again.'
        );
      }

      let revisions: WorkLogRevision[] = existing?.revisions || [];

      if (existing && isRevision) {
        const previousRevision: WorkLogRevision = {
          timestamp:
            existing.updatedAt ||
            existing.createdAt ||
            new Date().toISOString(),
          editedBy: log.employeeName,
          workUndertaken: existing.workUndertaken,
          workCompleted: existing.workCompleted,
          pendingWork: existing.pendingWork,
          blockers: existing.blockers,
        };

        revisions = [...revisions, previousRevision];
      }

      const nowIso = new Date().toISOString();

      const payload: WorkLog = {
        ...log,
        revisions,
        createdAt: existing?.createdAt || log.createdAt || nowIso,
        updatedAt: nowIso,
      };

      const batch = writeBatch(db);

      batch.set(
        workLogRef,
        cleanFirestoreData(payload)
      );

      // Save associated resources in the same batch.
      if (payload.resources?.length) {
        for (const resource of payload.resources) {
          const resourceId =
            (resource as any).resourceId ||
            (resource as any).id;

          if (!resourceId || typeof resourceId !== 'string') {
            throw new Error(
              'An attached resource is missing its resource ID.'
            );
          }

          const resourceRef = doc(
            db,
            'workLogResources',
            resourceId
          );

          batch.set(
            resourceRef,
            cleanFirestoreData({
              ...resource,
              resourceId,
              workLogId: payload.workLogId,
              employeeId: payload.employeeId,
            })
          );
        }
      }

      // Wait for Firestore to confirm the batch write.
      await batch.commit();

      return payload;
    } catch (err) {
      handleFirestoreError(
        err,
        OperationType.WRITE,
        `workLogs/${log.workLogId}`
      );
    }
  }

  /**
   * Retrieve work logs belonging to an employee.
   */
  async getWorkLogsByEmployee(
    employeeId: string
  ): Promise<WorkLog[]> {
    if (!employeeId) {
      throw new Error('Employee ID is required.');
    }

    try {
      const workLogsQuery = query(
        collection(db, 'workLogs'),
        where('employeeId', '==', employeeId)
      );

      const snapshot = await getDocs(workLogsQuery);

      return snapshot.docs
        .map((document) => {
          const data = document.data() as WorkLog;

          return {
            ...data,
            id: data.id || document.id,
            workLogId: data.workLogId || document.id,
          };
        })
        .sort((a, b) =>
          (b.date || '').localeCompare(a.date || '')
        );
    } catch (err) {
      handleFirestoreError(
        err,
        OperationType.GET,
        `workLogs (employee: ${employeeId})`
      );
    }
  }

  /**
   * Retrieve all work logs for administrative monitoring.
   */
  async getAllWorkLogs(): Promise<WorkLog[]> {
    try {
      const snapshot = await getDocs(
        collection(db, 'workLogs')
      );

      return snapshot.docs
        .map((document) => {
          const data = document.data() as WorkLog;

          return {
            ...data,
            id: data.id || document.id,
            workLogId: data.workLogId || document.id,
          };
        })
        .sort((a, b) =>
          (b.date || '').localeCompare(a.date || '')
        );
    } catch (err) {
      handleFirestoreError(
        err,
        OperationType.LIST,
        'workLogs'
      );
    }
  }

  /**
   * Save administrative review remarks.
   */
  async reviewWorkLog(
    workLogId: string,
    reviewerName: string,
    reviewRemarks: string
  ): Promise<WorkLog> {
    if (!workLogId) {
      throw new Error('Work log ID is required.');
    }

    if (!reviewerName.trim()) {
      throw new Error('Reviewer name is required.');
    }

    const workLogRef = doc(db, 'workLogs', workLogId);

    try {
      const snapshot = await getDoc(workLogRef);

      if (!snapshot.exists()) {
        throw new Error(
          'Work log not found in Firestore. Refresh the dashboard and try again.'
        );
      }

      const existing = snapshot.data() as WorkLog;
      const nowIso = new Date().toISOString();

      const reviewUpdate = {
        submissionStatus: 'reviewed',
        reviewedBy: reviewerName,
        reviewRemarks,
        reviewedAt: nowIso,
        updatedAt: nowIso,
      };

      await updateDoc(
        workLogRef,
        cleanFirestoreData(reviewUpdate)
      );

      return {
        ...existing,
        ...reviewUpdate,
        id: existing.id || snapshot.id,
        workLogId: existing.workLogId || snapshot.id,
      } as WorkLog;
    } catch (err) {
      handleFirestoreError(
        err,
        OperationType.UPDATE,
        `workLogs/${workLogId}`
      );
    }
  }
}

export const workLogService = new WorkLogService();
