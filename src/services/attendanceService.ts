
import { auth } from '../lib/firebase';

import {
  AttendanceRecord,
  WorkMode,
  CorrectionRequest,
  AuditLog,
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

class AttendanceService {
  private localAttendanceMap = new Map<string, AttendanceRecord>();
  private localCorrections: CorrectionRequest[] = [];
  private localAuditLogs: AuditLog[] = [];

  private async getAuthorizationHeaders(): Promise<HeadersInit> {
    const user = auth.currentUser;

    if (!user) {
      throw new Error('You must be signed in to perform this action.');
    }

    const token = await user.getIdToken();

    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };
  }

  private async apiRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const headers = await this.getAuthorizationHeaders();

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        ...headers,
        ...options.headers,
      },
    });

    const result = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(
        result?.error || 'The request could not be completed.'
      );
    }

    return result as T;
  }

  private cacheAttendance(record: AttendanceRecord): AttendanceRecord {
    this.localAttendanceMap.set(record.attendanceId, record);
    return record;
  }

  async getTodayAttendance(
    employeeId: string
  ): Promise<AttendanceRecord | null> {
    const record = await this.apiRequest<AttendanceRecord | null>(
      '/attendance/today'
    );

    if (!record) {
      return null;
    }

    return this.cacheAttendance(record);
  }

  async checkIn(
    employeeId: string,
    employeeName: string,
    employeeEmail: string,
    department: string,
    workMode: WorkMode
  ): Promise<AttendanceRecord> {
    const record = await this.apiRequest<AttendanceRecord>(
      '/attendance/check-in',
      {
        method: 'POST',
        body: JSON.stringify({ workMode }),
      }
    );

    return this.cacheAttendance(record);
  }

  async startBreak(
    employeeId: string,
    reason = 'Break'
  ): Promise<AttendanceRecord> {
    const record = await this.apiRequest<AttendanceRecord>(
      '/attendance/start-break',
      {
        method: 'POST',
        body: JSON.stringify({ reason }),
      }
    );

    return this.cacheAttendance(record);
  }

  async endBreak(employeeId: string): Promise<AttendanceRecord> {
    const record = await this.apiRequest<AttendanceRecord>(
      '/attendance/end-break',
      {
        method: 'POST',
      }
    );

    return this.cacheAttendance(record);
  }

  async checkOut(employeeId: string): Promise<AttendanceRecord> {
    const record = await this.apiRequest<AttendanceRecord>(
      '/attendance/check-out',
      {
        method: 'POST',
      }
    );

    return this.cacheAttendance(record);
  }

  async getEmployeeAttendanceHistory(
    employeeId: string
  ): Promise<AttendanceRecord[]> {
    if (!employeeId) {
      throw new Error('Employee ID is required.');
    }

    const response = await this.apiRequest<{
      records: AttendanceRecord[];
    }>(`/attendance/history?employeeId=${encodeURIComponent(employeeId)}`);

    return (response.records || [])
      .map((record) => this.cacheAttendance(record))
      .sort((a, b) => b.workDate.localeCompare(a.workDate));
  }

  async getAllAttendanceRecords(): Promise<AttendanceRecord[]> {
    const response = await this.apiRequest<{
      records: AttendanceRecord[];
    }>('/attendance');

    return (response.records || [])
      .map((record) => this.cacheAttendance(record))
      .sort((a, b) => b.workDate.localeCompare(a.workDate));
  }

  async submitCorrectionRequest(
    employeeId: string,
    employeeName: string,
    attendanceId: string,
    workDate: string,
    requestedChanges: string,
    reason: string
  ): Promise<CorrectionRequest> {
    const correction = await this.apiRequest<CorrectionRequest>(
      '/attendance/correction-requests',
      {
        method: 'POST',
        body: JSON.stringify({
          attendanceId,
          workDate,
          requestedChanges,
          reason,
        }),
      }
    );

    this.localCorrections.unshift(correction);

    return correction;
  }

  async getCorrectionRequests(
    employeeId?: string
  ): Promise<CorrectionRequest[]> {
    const requests = await this.apiRequest<CorrectionRequest[]>(
      '/attendance/correction-requests'
    );

    this.localCorrections = requests;

    return requests.sort((a, b) =>
      b.createdAt.localeCompare(a.createdAt)
    );
  }

  async reviewCorrectionRequest(
    requestId: string,
    reviewerName: string,
    status: 'approved' | 'rejected',
    comment: string,
    adjustedWorkingSeconds?: number
  ): Promise<void> {
    await this.apiRequest(
      `/attendance/correction-requests/${encodeURIComponent(requestId)}/review`,
      {
        method: 'PATCH',
        body: JSON.stringify({
          status,
          comment,
          adjustedWorkingSeconds,
        }),
      }
    );

    const item = this.localCorrections.find(
      (correction) => correction.requestId === requestId
    );

    if (item) {
      item.approvalStatus = status;
      item.reviewComment = comment;
      item.reviewedAt = new Date().toISOString();
    }
  }

  async recordAuditLog(
    actorId: string,
    actorEmail: string,
    action: string,
    targetId: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    console.info('Audit logging is handled by the backend:', {
      action,
      targetId,
    });
  }

  getAuditLogs(): AuditLog[] {
    return this.localAuditLogs;
  }
}

export const attendanceService = new AttendanceService();
