import {
  db,
  handleFirestoreError,
  OperationType,
} from '../lib/firebase';
import {
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { WorkLog, WorkLogRevision } from '../types';

class WorkLogService {
  private localWorkLogs = new Map<string, WorkLog>();

  async createOrUpdateWorkLog(log: WorkLog, isRevision = false): Promise<WorkLog> {
    const nowIso = new Date().toISOString();
    let existing = this.localWorkLogs.get(log.workLogId);

    let revisions: WorkLogRevision[] = existing?.revisions || [];
    if (existing && isRevision) {
      revisions = [
        ...revisions,
        {
          timestamp: existing.updatedAt || existing.createdAt,
          editedBy: log.employeeName,
          workUndertaken: existing.workUndertaken,
          workCompleted: existing.workCompleted,
          pendingWork: existing.pendingWork,
          blockers: existing.blockers,
        },
      ];
    }

    const payload: WorkLog = {
      ...log,
      revisions,
      updatedAt: nowIso,
      createdAt: existing?.createdAt || nowIso,
    };

    this.localWorkLogs.set(payload.workLogId, payload);

    try {
      await setDoc(doc(db, 'workLogs', payload.workLogId), payload);
      if (payload.resources && payload.resources.length > 0) {
        for (const res of payload.resources) {
          await setDoc(doc(db, 'workLogResources', res.resourceId), res);
        }
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `workLogs/${payload.workLogId}`);
    }

    return payload;
  }

  async getWorkLogsByEmployee(employeeId: string): Promise<WorkLog[]> {
    const list: WorkLog[] = [];
    try {
      const snaps = await getDocs(collection(db, 'workLogs'));
      snaps.forEach((d) => {
        const item = d.data() as WorkLog;
        if (item.employeeId === employeeId) list.push(item);
      });
    } catch (err) {
      console.warn('Firestore work logs read, using local cache:', err);
    }

    this.localWorkLogs.forEach((log) => {
      if (log.employeeId === employeeId && !list.some((l) => l.workLogId === log.workLogId)) {
        list.push(log);
      }
    });

    return list.sort((a, b) => b.date.localeCompare(a.date));
  }

  async getAllWorkLogs(): Promise<WorkLog[]> {
    const list: WorkLog[] = [];
    try {
      const snaps = await getDocs(collection(db, 'workLogs'));
      snaps.forEach((d) => list.push(d.data() as WorkLog));
    } catch (err) {
      console.warn('Firestore all work logs read, using local cache:', err);
    }

    this.localWorkLogs.forEach((log) => {
      if (!list.some((l) => l.workLogId === log.workLogId)) {
        list.push(log);
      }
    });

    return list.sort((a, b) => b.date.localeCompare(a.date));
  }

  async reviewWorkLog(
    workLogId: string,
    reviewerName: string,
    reviewRemarks: string
  ): Promise<WorkLog> {
    const item = this.localWorkLogs.get(workLogId);
    if (!item) throw new Error('Work log not found');

    item.submissionStatus = 'reviewed';
    item.reviewedBy = reviewerName;
    item.reviewRemarks = reviewRemarks;
    item.reviewedAt = new Date().toISOString();
    item.updatedAt = new Date().toISOString();

    try {
      await updateDoc(doc(db, 'workLogs', workLogId), {
        submissionStatus: 'reviewed',
        reviewedBy: reviewerName,
        reviewRemarks,
        reviewedAt: item.reviewedAt,
        updatedAt: item.updatedAt,
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `workLogs/${workLogId}`);
    }

    return item;
  }
}

export const workLogService = new WorkLogService();
