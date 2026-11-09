
import { auth } from '../lib/firebase';
import type { WorkLog } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

// --------------------------------------------------
// RESPONSE TYPES
// --------------------------------------------------

interface WorkLogResponse {
  workLog: WorkLog | null;
}

interface WorkLogsResponse {
  workLogs: WorkLog[];
}

// --------------------------------------------------
// HELPERS
// --------------------------------------------------

const normalizeWorkLog = (
  data: WorkLog,
  documentId?: string
): WorkLog => ({
  ...data,
  id: data.id || documentId || data.workLogId,
  workLogId: data.workLogId || documentId || data.id,
  revisionNumber: data.revisionNumber || 0,
  revisions: data.revisions || [],
  reviewHistory: data.reviewHistory || [],
  resources: data.resources || [],
});

const sortWorkLogs = (logs: WorkLog[]): WorkLog[] => {
  return [...logs].sort((a, b) => {
    const dateComparison = (b.date || '').localeCompare(a.date || '');

    if (dateComparison !== 0) {
      return dateComparison;
    }

    return (b.updatedAt || '').localeCompare(a.updatedAt || '');
  });
};

const getAuthToken = async (): Promise<string> => {
  const user = auth.currentUser;

  if (!user) {
    throw new Error('You must be signed in to access work logs.');
  }

  return user.getIdToken();
};

const apiRequest = async <T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> => {
  const token = await getAuthToken();

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });

  const responseText = await response.text();

  let result: any = {};

  if (responseText) {
    try {
      result = JSON.parse(responseText);
    } catch {
      throw new Error(
        `Invalid server response (${response.status}).`
      );
    }
  }

  if (!response.ok) {
    throw new Error(
      result.error ||
      result.message ||
      `Work-log request failed (${response.status}).`
    );
  }

  return result as T;
};

// --------------------------------------------------
// WORK LOG SERVICE
// --------------------------------------------------

class WorkLogService {

  // ------------------------------------------------
  // CREATE / UPDATE / RESUBMIT
  // ------------------------------------------------

  async createOrUpdateWorkLog(
    log: WorkLog,
    isRevision = false
  ): Promise<WorkLog> {

    if (!log.workLogId?.trim()) {
      throw new Error('A valid work log ID is required.');
    }

    if (!log.employeeId?.trim()) {
      throw new Error('Employee ID is missing.');
    }

    if (!log.date?.trim()) {
      throw new Error('Work date is required.');
    }

    if (!log.workUndertaken?.trim()) {
      throw new Error('Please describe the work undertaken.');
    }

    if (
      isRevision &&
      log.submissionStatus !== 'submitted'
    ) {
      throw new Error(
        'A revised work log must be submitted for administrative review.'
      );
    }

    const response = await apiRequest<WorkLogResponse>(
      '/work-logs',
      {
        method: 'POST',
        body: JSON.stringify(log),
      }
    );

    if (!response.workLog) {
      throw new Error(
        'The server did not return the saved work log.'
      );
    }

    return normalizeWorkLog(response.workLog, log.workLogId);
  }

  // ------------------------------------------------
  // EMPLOYEE WORK LOG RETRIEVAL
  // ------------------------------------------------

  async getWorkLogsByEmployee(
    employeeId: string
  ): Promise<WorkLog[]> {

    if (!employeeId) {
      throw new Error('Employee ID is required.');
    }

    const user = auth.currentUser;

    if (!user) {
      throw new Error('You must be signed in.');
    }

    if (user.uid !== employeeId) {
      throw new Error(
        'You cannot retrieve another employee’s work logs.'
      );
    }

    const response = await apiRequest<WorkLogsResponse>(
      '/work-logs/mine'
    );

    return sortWorkLogs(
      (response.workLogs || []).map((log) =>
        normalizeWorkLog(log)
      )
    );
  }

  // ------------------------------------------------
  // ADMIN WORK LOG RETRIEVAL
  // ------------------------------------------------

  async getAllWorkLogs(): Promise<WorkLog[]> {

    const response = await apiRequest<WorkLogsResponse>(
      '/work-logs'
    );

    return sortWorkLogs(
      (response.workLogs || []).map((log) =>
        normalizeWorkLog(log)
      )
    );
  }

  // ------------------------------------------------
  // MARK AS UNDER REVIEW
  // ------------------------------------------------

  async markWorkLogUnderReview(
    workLogId: string
  ): Promise<WorkLog> {

    if (!workLogId) {
      throw new Error('Work log ID is required.');
    }

    const response = await apiRequest<WorkLogResponse>(
      `/work-logs/${encodeURIComponent(workLogId)}/under-review`,
      {
        method: 'PATCH',
      }
    );

    if (!response.workLog) {
      throw new Error('The server did not return the updated work log.');
    }

    return normalizeWorkLog(response.workLog, workLogId);
  }

  // ------------------------------------------------
  // ADMIN APPROVAL / REVIEW
  // ------------------------------------------------

  async reviewWorkLog(
    workLogId: string,
    reviewerName: string,
    reviewRemarks: string,
    reviewerId = 'admin'
  ): Promise<WorkLog> {

    if (!workLogId) {
      throw new Error('Work log ID is required.');
    }

    if (!reviewerName.trim()) {
      throw new Error('Reviewer name is required.');
    }

    const response = await apiRequest<WorkLogResponse>(
      `/work-logs/${encodeURIComponent(workLogId)}/review`,
      {
        method: 'PATCH',
        body: JSON.stringify({
          reviewRemarks: reviewRemarks.trim(),
        }),
      }
    );

    if (!response.workLog) {
      throw new Error('The server did not return the reviewed work log.');
    }

    return normalizeWorkLog(response.workLog, workLogId);
  }

  // ------------------------------------------------
  // ADMIN REQUESTS REVISION
  // ------------------------------------------------

  async requestWorkLogRevision(
    workLogId: string,
    reviewerName: string,
    revisionRemarks: string,
    reviewerId = 'admin'
  ): Promise<WorkLog> {

    if (!workLogId) {
      throw new Error('Work log ID is required.');
    }

    if (!reviewerName.trim()) {
      throw new Error('Reviewer name is required.');
    }

    if (!revisionRemarks.trim()) {
      throw new Error(
        'Please provide a reason for requesting a revision.'
      );
    }

    const response = await apiRequest<WorkLogResponse>(
      `/work-logs/${encodeURIComponent(workLogId)}/request-revision`,
      {
        method: 'PATCH',
        body: JSON.stringify({
          revisionRemarks: revisionRemarks.trim(),
        }),
      }
    );

    if (!response.workLog) {
      throw new Error('The server did not return the revised work log.');
    }

    return normalizeWorkLog(response.workLog, workLogId);
  }

  // ------------------------------------------------
  // ADMIN REJECTS WORK LOG (TERMINAL DECISION)
  // ------------------------------------------------

  async rejectWorkLog(
    workLogId: string,
    reviewerName: string,
    reviewRemarks: string,
    reviewerId = 'admin'
  ): Promise<WorkLog> {
    if (!workLogId) {
      throw new Error('Work log ID is required.');
    }

    if (!reviewerName.trim()) {
      throw new Error('Reviewer name is required.');
    }

    if (!reviewRemarks.trim()) {
      throw new Error('Please provide a reason for rejecting this work log.');
    }

    const response = await apiRequest<WorkLogResponse>(
      `/work-logs/${encodeURIComponent(workLogId)}/reject`,
      {
        method: 'PATCH',
        body: JSON.stringify({
          reviewRemarks: reviewRemarks.trim(),
        }),
      }
    );

    if (!response.workLog) {
      throw new Error('The server did not return the rejected work log.');
    }

    return normalizeWorkLog(response.workLog, workLogId);
  }

  // ------------------------------------------------
  // GET SINGLE WORK LOG
  // ------------------------------------------------

  async getWorkLogById(
    workLogId: string
  ): Promise<WorkLog | null> {

    if (!workLogId) {
      throw new Error('Work log ID is required.');
    }

    const response = await apiRequest<WorkLogResponse>(
      `/work-logs/${encodeURIComponent(workLogId)}`
    );

    if (!response.workLog) {
      return null;
    }

    return normalizeWorkLog(response.workLog, workLogId);
  }
}

export const workLogService = new WorkLogService();
