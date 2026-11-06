export type UserRole = 'admin' | 'employee';
export type AccountStatus = 'active' | 'inactive';
export type WorkMode = 'office' | 'home';
export type AttendanceStatus = 'checked_in' | 'on_break' | 'checked_out';
export type SubmissionStatus = 'draft' | 'submitted' | 'reviewed';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected';

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

export interface AttendanceRecord {
  id: string;
  attendanceId: string;
  employeeId: string;
  employeeName: string;
  employeeEmail: string;
  department: string;
  workDate: string; // YYYY-MM-DD
  workMode: WorkMode;
  status: AttendanceStatus;
  totalWorkingSeconds: number;
  totalBreakSeconds: number;
  firstCheckIn?: string;
  lastCheckOut?: string;
  activeSessionId?: string;
  activeBreakId?: string;
  currentSessionStart?: string;
  currentBreakStart?: string;
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
  fileDataUrl?: string; // Stored base64 or storage url for uploads
  createdAt: string;
}

export interface WorkLogRevision {
  timestamp: string;
  editedBy: string;
  workUndertaken: string;
  workCompleted: string;
  pendingWork: string;
  blockers: string;
}

export interface WorkLog {
  id: string;
  workLogId: string;
  employeeId: string;
  employeeName: string;
  employeeEmail: string;
  department: string;
  attendanceId?: string;
  sessionId?: string;
  date: string; // YYYY-MM-DD
  loginTime?: string;
  logoutTime?: string;
  jiraTaskId?: string;
  jiraTaskUrl?: string;
  workUndertaken: string;
  workCompleted: string;
  pendingWork: string;
  blockers: string;
  remarks?: string;
  submissionStatus: SubmissionStatus;
  reviewRemarks?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  resources?: WorkLogResource[];
  revisions?: WorkLogRevision[];
  createdAt: string;
  updatedAt: string;
}

export interface WorkScheduleConfig {
  id?: string;
  scheduleId: string;
  departmentId?: string;
  workingDays: number[]; // 1 to 6 (Mon to Sat)
  dailyMinimumSeconds: number; // 3 hours = 10,800s
  weeklyMinimumSeconds: number; // 18 hours = 64,800s
  workModel: 'hybrid' | 'office' | 'remote';
  effectiveFrom: string;
}

export interface CorrectionRequest {
  id: string;
  requestId: string;
  employeeId: string;
  employeeName: string;
  attendanceId: string;
  workDate: string;
  requestedChanges: string; // e.g. "Adjust check in from 10:15 to 09:30"
  reason: string;
  approvalStatus: ApprovalStatus;
  reviewComment?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  createdAt: string;
}

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
