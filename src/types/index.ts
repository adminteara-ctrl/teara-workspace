
export type UserRole = 'admin' | 'employee';
export type AccountStatus = 'active' | 'inactive';
export type WorkMode = 'office' | 'home';
export type AttendanceStatus = 'checked_in' | 'on_break' | 'checked_out';

export type SubmissionStatus =
  | 'draft'
  | 'submitted'
  | 'under_review'
  | 'revision_requested'
  | 'reviewed'
  | 'rejected';

export type ApprovalStatus = 'pending' | 'approved' | 'rejected';

export type ReviewStatus = 'approved' | 'revision_requested' | 'rejected';

export type ResourceType =
  | 'jira'
  | 'gdrive'
  | 'gdocs'
  | 'gsheets'
  | 'gslides'
  | 'figma'
  | 'github'
  | 'research'
  | 'file'
  | 'other';

// --------------------------------------------------
// USER
// --------------------------------------------------

export interface UserProfile {
  uid: string;
  username?: string;
  password?: string;
  name: string;
  email: string;
  role: UserRole;
  department: string;
  jobTitle?: string;
  accountStatus: AccountStatus;
  workModePreference?: 'office' | 'home' | 'hybrid';
  createdAt: string;
  updatedAt: string;
}

// --------------------------------------------------
// ATTENDANCE
// --------------------------------------------------

export interface AttendanceRecord {
  id: string;
  attendanceId: string;
  employeeId: string;
  employeeName: string;
  employeeEmail: string;
  department: string;
  workDate: string;
  workMode: WorkMode;
  status: AttendanceStatus;
  totalWorkingSeconds: number;
  totalBreakSeconds: number;
  firstCheckIn?: string;
  lastCheckOut?: string;
  activeSessionId?: string | null;
  activeBreakId?: string | null;
  currentSessionStart?: string | null;
  currentBreakStart?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WorkSession {
  id: string;
  sessionId: string;
  attendanceId: string;
  employeeId: string;
  workMode: WorkMode;
  checkInAt: string;
  checkOutAt?: string;
  durationSeconds?: number;
  status: 'active' | 'completed';
}

export interface BreakRecord {
  id: string;
  breakId: string;
  sessionId: string;
  attendanceId: string;
  employeeId: string;
  breakStartAt: string;
  breakEndAt?: string;
  durationSeconds?: number;
  reason?: string;
}

// --------------------------------------------------
// WORK LOG RESOURCES
// --------------------------------------------------

export interface WorkLogResource {
  id: string;
  resourceId: string;
  workLogId: string;
  employeeId: string;
  title: string;
  url?: string;
  resourceType: ResourceType;
  fileName?: string;
  fileSize?: number;

  // Prefer Firebase Storage URLs for uploaded files.
  // Legacy base64 data URLs remain optional for compatibility.
  fileDataUrl?: string;

  createdAt: string;
}

// --------------------------------------------------
// WORK LOG SNAPSHOT
// --------------------------------------------------

/**
 * Represents the content of a work-log version.
 * Used to preserve previously submitted content.
 */
export interface WorkLogSnapshot {
  date: string;
  workUndertaken: string;
  workCompleted: string;
  pendingWork: string;
  blockers: string;
  remarks?: string;
  attendanceId?: string;
  sessionId?: string;
  loginTime?: string;
  logoutTime?: string;
  jiraTaskId?: string;
  jiraTaskUrl?: string;
  resources?: WorkLogResource[];
}

// --------------------------------------------------
// WORK LOG REVISION HISTORY
// --------------------------------------------------

export interface WorkLogRevision {
  revisionId?: string;
  revisionNumber?: number;

  // Previous version content
  timestamp: string;
  editedBy: string;
  workUndertaken: string;
  workCompleted: string;
  pendingWork: string;
  blockers: string;

  remarks?: string;
  snapshot?: WorkLogSnapshot;
  resources?: WorkLogResource[];

  // Submission metadata
  submissionStatus?: SubmissionStatus;
  submittedAt?: string;
}

// --------------------------------------------------
// WORK LOG ADMIN REVIEW HISTORY
// --------------------------------------------------

export interface WorkLogReview {
  reviewId: string;
  workLogId: string;

  reviewerId: string;
  reviewerName: string;
  reviewerEmail?: string;

  reviewStatus: ReviewStatus;
  remarks: string;

  revisionNumber?: number;

  reviewedAt: string;
}

// --------------------------------------------------
// WORK LOG
// --------------------------------------------------

export interface WorkLog {
  id: string;
  workLogId: string;

  // Employee information
  employeeId: string;
  employeeName: string;
  employeeEmail: string;
  department: string;

  // Attendance reference
  attendanceId?: string;
  sessionId?: string;

  // Work date and timing
  date: string;
  loginTime?: string;
  logoutTime?: string;

  // Task references
  jiraTaskId?: string;
  jiraTaskUrl?: string;

  // Work details
  workUndertaken: string;
  workCompleted: string;
  pendingWork: string;
  blockers: string;
  remarks?: string;

  // Submission lifecycle
  submissionStatus: SubmissionStatus;

  revisionNumber?: number;
  submittedAt?: string;

  // Latest review information
  reviewRemarks?: string;
  reviewedBy?: string;
  reviewedAt?: string;

  // Revision request information
  revisionRequestedBy?: string;
  revisionRequestedById?: string;
  revisionRequestedAt?: string;
  revisionRequestRemarks?: string;

  // Resources and historical records
  resources?: WorkLogResource[];
  revisions?: WorkLogRevision[];
  reviewHistory?: WorkLogReview[];

  // Timestamps
  createdAt: string;
  updatedAt: string;
}

// --------------------------------------------------
// WORK SCHEDULE
// --------------------------------------------------

export interface WorkScheduleConfig {
  id?: string;
  scheduleId: string;
  departmentId?: string;
  workingDays: number[];
  dailyMinimumSeconds: number;
  weeklyMinimumSeconds: number;
  workModel: 'hybrid' | 'office' | 'remote';
  effectiveFrom: string;
}

// --------------------------------------------------
// ATTENDANCE CORRECTION
// --------------------------------------------------

export interface CorrectionRequest {
  id: string;
  requestId: string;
  employeeId: string;
  employeeName: string;
  attendanceId: string;
  workDate: string;
  requestedChanges: string;
  reason: string;
  approvalStatus: ApprovalStatus;
  reviewComment?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  createdAt: string;
}

// --------------------------------------------------
// AUDIT LOG
// --------------------------------------------------

export interface AuditLog {
  id: string;
  auditId: string;
  actorId: string;
  actorEmail: string;
  action: string;
  targetId: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

// --------------------------------------------------
// NOTIFICATIONS
// --------------------------------------------------

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'alert';
  recipientEmail: string;
  sentAt: string;
  read: boolean;
  link?: string;
}
