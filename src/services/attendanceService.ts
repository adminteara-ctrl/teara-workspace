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
  setDoc,
  updateDoc,
  query,
  where,
} from 'firebase/firestore';
import {
  AttendanceRecord,
  WorkSession,
  BreakRecord,
  WorkMode,
  CorrectionRequest,
  AuditLog,
} from '../types';
import { getTodayDateString } from '../lib/utils';

class AttendanceService {
  private localAttendanceMap = new Map<string, AttendanceRecord>();
  private localSessions = new Map<string, WorkSession>();
  private localBreaks = new Map<string, BreakRecord>();
  private localCorrections: CorrectionRequest[] = [];
  private localAuditLogs: AuditLog[] = [];

  async getTodayAttendance(employeeId: string): Promise<AttendanceRecord | null> {
    const today = getTodayDateString();
    const docId = `att_${employeeId}_${today}`;

    try {
      const docRef = doc(db, 'attendance', docId);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const data = snap.data() as AttendanceRecord;
        this.localAttendanceMap.set(docId, data);
        return data;
      }
    } catch (err) {
      console.warn('Firestore read in getTodayAttendance:', err);
    }

    // Check in-memory store
    return this.localAttendanceMap.get(docId) || null;
  }

  async checkIn(
    employeeId: string,
    employeeName: string,
    employeeEmail: string,
    department: string,
    workMode: WorkMode
  ): Promise<AttendanceRecord> {
    const today = getTodayDateString();
    const docId = `att_${employeeId}_${today}`;
    const nowIso = new Date().toISOString();
    const sessionId = `sess_${employeeId}_${Date.now()}`;

    // Verify existing record
    let currentRecord = await this.getTodayAttendance(employeeId);

    if (currentRecord && currentRecord.status === 'checked_in') {
      throw new Error('You already have an active checked-in session.');
    }
    if (currentRecord && currentRecord.status === 'on_break') {
      throw new Error('You are currently on break. Please click "End Break" to resume working.');
    }

    const newSession: WorkSession = {
      id: sessionId,
      sessionId,
      attendanceId: docId,
      employeeId,
      workMode,
      checkInAt: nowIso,
      status: 'active',
    };
    this.localSessions.set(sessionId, newSession);

    const updatedRecord: AttendanceRecord = {
      id: docId,
      attendanceId: docId,
      employeeId,
      employeeName,
      employeeEmail,
      department: department || 'R&D',
      workDate: today,
      workMode,
      status: 'checked_in',
      totalWorkingSeconds: currentRecord?.totalWorkingSeconds || 0,
      totalBreakSeconds: currentRecord?.totalBreakSeconds || 0,
      firstCheckIn: currentRecord?.firstCheckIn || nowIso,
      currentSessionStart: nowIso,
      activeSessionId: sessionId,
      activeBreakId: undefined,
      createdAt: currentRecord?.createdAt || nowIso,
      updatedAt: nowIso,
    };

    this.localAttendanceMap.set(docId, updatedRecord);

    try {
      await setDoc(doc(db, 'workSessions', sessionId), newSession);
      await setDoc(doc(db, 'attendance', docId), updatedRecord);
      await this.recordAuditLog(employeeId, employeeEmail, 'CHECK_IN', docId, { workMode });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `attendance/${docId}`);
    }

    return updatedRecord;
  }

  async startBreak(employeeId: string, reason = 'Break'): Promise<AttendanceRecord> {
    const record = await this.getTodayAttendance(employeeId);
    if (!record || record.status !== 'checked_in') {
      throw new Error('You must be actively checked in to take a break.');
    }

    const nowIso = new Date().toISOString();
    const breakId = `break_${employeeId}_${Date.now()}`;

    // Calculate accrued working seconds up to break start
    let sessionAccrued = 0;
    if (record.currentSessionStart) {
      sessionAccrued = Math.max(
        0,
        Math.floor((new Date(nowIso).getTime() - new Date(record.currentSessionStart).getTime()) / 1000)
      );
    }

    const breakItem: BreakRecord = {
      id: breakId,
      breakId,
      sessionId: record.activeSessionId || '',
      attendanceId: record.attendanceId,
      employeeId,
      breakStartAt: nowIso,
      reason,
    };
    this.localBreaks.set(breakId, breakItem);

    const updatedRecord: AttendanceRecord = {
      ...record,
      status: 'on_break',
      totalWorkingSeconds: (record.totalWorkingSeconds || 0) + sessionAccrued,
      currentSessionStart: undefined,
      currentBreakStart: nowIso,
      activeBreakId: breakId,
      updatedAt: nowIso,
    };

    this.localAttendanceMap.set(record.attendanceId, updatedRecord);

    try {
      await setDoc(doc(db, 'breaks', breakId), breakItem);
      await updateDoc(doc(db, 'attendance', record.attendanceId), updatedRecord as any);
      await this.recordAuditLog(employeeId, record.employeeEmail, 'START_BREAK', breakId, { reason });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `attendance/${record.attendanceId}`);
    }

    return updatedRecord;
  }

  async endBreak(employeeId: string): Promise<AttendanceRecord> {
    const record = await this.getTodayAttendance(employeeId);
    if (!record || record.status !== 'on_break') {
      throw new Error('No active break found to end.');
    }

    const nowIso = new Date().toISOString();
    let breakDuration = 0;
    if (record.currentBreakStart) {
      breakDuration = Math.max(
        0,
        Math.floor((new Date(nowIso).getTime() - new Date(record.currentBreakStart).getTime()) / 1000)
      );
    }

    const updatedRecord: AttendanceRecord = {
      ...record,
      status: 'checked_in',
      totalBreakSeconds: (record.totalBreakSeconds || 0) + breakDuration,
      currentBreakStart: undefined,
      activeBreakId: undefined,
      currentSessionStart: nowIso,
      updatedAt: nowIso,
    };

    this.localAttendanceMap.set(record.attendanceId, updatedRecord);

    try {
      if (record.activeBreakId) {
        await updateDoc(doc(db, 'breaks', record.activeBreakId), {
          breakEndAt: nowIso,
          durationSeconds: breakDuration,
        });
      }
      await updateDoc(doc(db, 'attendance', record.attendanceId), updatedRecord as any);
      await this.recordAuditLog(employeeId, record.employeeEmail, 'END_BREAK', record.activeBreakId || '', {
        breakDuration,
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `attendance/${record.attendanceId}`);
    }

    return updatedRecord;
  }

  async checkOut(employeeId: string): Promise<AttendanceRecord> {
    const record = await this.getTodayAttendance(employeeId);
    if (!record || record.status === 'checked_out') {
      throw new Error('No active work session to check out from.');
    }

    const nowIso = new Date().toISOString();

    // If still on break, finalize the break
    let addBreakSeconds = 0;
    if (record.status === 'on_break' && record.currentBreakStart) {
      addBreakSeconds = Math.max(
        0,
        Math.floor((new Date(nowIso).getTime() - new Date(record.currentBreakStart).getTime()) / 1000)
      );
    }

    // Accrue final session segment
    let addWorkingSeconds = 0;
    if (record.status === 'checked_in' && record.currentSessionStart) {
      addWorkingSeconds = Math.max(
        0,
        Math.floor((new Date(nowIso).getTime() - new Date(record.currentSessionStart).getTime()) / 1000)
      );
    }

    const updatedRecord: AttendanceRecord = {
      ...record,
      status: 'checked_out',
      lastCheckOut: nowIso,
      totalWorkingSeconds: (record.totalWorkingSeconds || 0) + addWorkingSeconds,
      totalBreakSeconds: (record.totalBreakSeconds || 0) + addBreakSeconds,
      currentSessionStart: undefined,
      currentBreakStart: undefined,
      activeSessionId: undefined,
      activeBreakId: undefined,
      updatedAt: nowIso,
    };

    this.localAttendanceMap.set(record.attendanceId, updatedRecord);

    try {
      if (record.activeSessionId) {
        await updateDoc(doc(db, 'workSessions', record.activeSessionId), {
          checkOutAt: nowIso,
          status: 'completed',
        });
      }
      await updateDoc(doc(db, 'attendance', record.attendanceId), updatedRecord as any);
      await this.recordAuditLog(employeeId, record.employeeEmail, 'CHECK_OUT', record.attendanceId, {
        totalWorkingSeconds: updatedRecord.totalWorkingSeconds,
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `attendance/${record.attendanceId}`);
    }

    return updatedRecord;
  }

  async getEmployeeAttendanceHistory(employeeId: string): Promise<AttendanceRecord[]> {
    const results: AttendanceRecord[] = [];
    try {
      const q = query(collection(db, 'attendance'), where('employeeId', '==', employeeId));
      const snaps = await getDocs(q);
      snaps.forEach((d) => results.push(d.data() as AttendanceRecord));
    } catch (err) {
      console.warn('Firestore history fetch error, using local:', err);
    }

    this.localAttendanceMap.forEach((att) => {
      if (att.employeeId === employeeId && !results.some((r) => r.attendanceId === att.attendanceId)) {
        results.push(att);
      }
    });

    return results.sort((a, b) => b.workDate.localeCompare(a.workDate));
  }

  async getAllAttendanceRecords(): Promise<AttendanceRecord[]> {
    const list: AttendanceRecord[] = [];
    try {
      const snaps = await getDocs(collection(db, 'attendance'));
      snaps.forEach((d) => list.push(d.data() as AttendanceRecord));
    } catch (err) {
      console.warn('Firestore all attendance fetch error, using local:', err);
    }

    this.localAttendanceMap.forEach((rec) => {
      if (!list.some((r) => r.attendanceId === rec.attendanceId)) {
        list.push(rec);
      }
    });

    return list.sort((a, b) => b.workDate.localeCompare(a.workDate));
  }

  async submitCorrectionRequest(
    employeeId: string,
    employeeName: string,
    attendanceId: string,
    workDate: string,
    requestedChanges: string,
    reason: string
  ): Promise<CorrectionRequest> {
    const reqId = `corr_${Date.now()}`;
    const req: CorrectionRequest = {
      id: reqId,
      requestId: reqId,
      employeeId,
      employeeName,
      attendanceId,
      workDate,
      requestedChanges,
      reason,
      approvalStatus: 'pending',
      createdAt: new Date().toISOString(),
    };

    this.localCorrections.unshift(req);

    try {
      await setDoc(doc(db, 'correctionRequests', reqId), req);
      await this.recordAuditLog(employeeId, employeeName, 'SUBMIT_CORRECTION', reqId, {
        workDate,
        reason,
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `correctionRequests/${reqId}`);
    }

    return req;
  }

  async getCorrectionRequests(employeeId?: string): Promise<CorrectionRequest[]> {
    const results: CorrectionRequest[] = [];
    try {
      const snaps = await getDocs(collection(db, 'correctionRequests'));
      snaps.forEach((d) => results.push(d.data() as CorrectionRequest));
    } catch (err) {
      console.warn('Correction requests read:', err);
    }

    this.localCorrections.forEach((c) => {
      if (!results.some((r) => r.requestId === c.requestId)) {
        results.push(c);
      }
    });

    if (employeeId) {
      return results.filter((r) => r.employeeId === employeeId);
    }
    return results.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async reviewCorrectionRequest(
    requestId: string,
    reviewerName: string,
    status: 'approved' | 'rejected',
    comment: string,
    adjustedWorkingSeconds?: number
  ): Promise<void> {
    const item = this.localCorrections.find((c) => c.requestId === requestId);
    if (item) {
      item.approvalStatus = status;
      item.reviewedBy = reviewerName;
      item.reviewComment = comment;
      item.reviewedAt = new Date().toISOString();
    }

    try {
      await updateDoc(doc(db, 'correctionRequests', requestId), {
        approvalStatus: status,
        reviewedBy: reviewerName,
        reviewComment: comment,
        reviewedAt: new Date().toISOString(),
      });

      if (status === 'approved' && item && adjustedWorkingSeconds !== undefined) {
        const att = this.localAttendanceMap.get(item.attendanceId);
        if (att) {
          att.totalWorkingSeconds = adjustedWorkingSeconds;
          att.updatedAt = new Date().toISOString();
          await updateDoc(doc(db, 'attendance', item.attendanceId), {
            totalWorkingSeconds: adjustedWorkingSeconds,
            updatedAt: att.updatedAt,
          });
        }
      }

      await this.recordAuditLog('admin', reviewerName, `CORRECTION_${status.toUpperCase()}`, requestId, {
        comment,
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `correctionRequests/${requestId}`);
    }
  }

  async recordAuditLog(
    actorId: string,
    actorEmail: string,
    action: string,
    targetId: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    const auditId = `audit_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const log: AuditLog = {
      id: auditId,
      auditId,
      actorId,
      actorEmail,
      action,
      targetId,
      timestamp: new Date().toISOString(),
      metadata,
    };
    this.localAuditLogs.unshift(log);
    try {
      await setDoc(doc(db, 'auditLogs', auditId), log);
    } catch (err) {
      // Non-blocking
    }
  }

  getAuditLogs(): AuditLog[] {
    return this.localAuditLogs;
  }
}

export const attendanceService = new AttendanceService();
