
import {
  auth,
  db,
  handleFirestoreError,
  OperationType,
} from '../lib/firebase';

import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
} from 'firebase/firestore';

import {
  UserProfile,
  WorkScheduleConfig,
  NotificationItem,
  AttendanceRecord,
  WorkLog,
} from '../types';

import { getTodayDateString } from '../lib/utils';

export const DEFAULT_SCHEDULE: WorkScheduleConfig = {
  scheduleId: 'sched_teara_default',
  departmentId: 'R&D',
  workingDays: [1, 2, 3, 4, 5, 6],
  dailyMinimumSeconds: 10800,
  weeklyMinimumSeconds: 64800,
  workModel: 'hybrid',
  effectiveFrom: '2026-01-01',
};

interface EmployeeCreationResponse {
  message: string;
  uid: string;
  email: string;
  passwordSetupLink: string;
  note?: string;
}

interface AccountStatusResponse {
  message: string;
  uid: string;
  accountStatus: 'active' | 'inactive';
}

class AdminService {
  private scheduleConfig: WorkScheduleConfig = { ...DEFAULT_SCHEDULE };
  private notifications: NotificationItem[] = [];

  private async getAdminAuthorizationHeaders(): Promise<HeadersInit> {
    const currentUser = auth.currentUser;

    if (!currentUser) {
      throw new Error('Your administrator session has expired. Please sign in again.');
    }

    const idToken = await currentUser.getIdToken();

    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    };
  }

  async getAllUsers(): Promise<UserProfile[]> {
    const headers = await this.getAdminAuthorizationHeaders();
    const response = await fetch('/api/admin/users', { headers });
    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(result.error || 'Unable to load the employee directory.');
    }

    const users = Array.isArray(result.users)
      ? result.users as UserProfile[]
      : [];

    return users.sort((a, b) =>
      (a.name || '').localeCompare(b.name || '')
    );
  }

  async createEmployee(
    data: Omit<UserProfile, 'createdAt' | 'updatedAt'>
  ): Promise<UserProfile & { passwordSetupLink?: string }> {
    const headers = await this.getAdminAuthorizationHeaders();

    const response = await fetch('/api/admin/users', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        name: data.name.trim(),
        email: data.email.trim().toLowerCase(),
        username:
          data.username?.trim().toLowerCase() ||
          data.email.split('@')[0].trim().toLowerCase(),
        department: data.department,
        jobTitle: data.jobTitle || '',
        workModePreference: data.workModePreference || 'hybrid',
      }),
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(
        result.error || 'Unable to create the employee account.'
      );
    }

    const created = result as EmployeeCreationResponse;
    const now = new Date().toISOString();

    const newUser: UserProfile & { passwordSetupLink?: string } = {
      ...data,
      uid: created.uid,
      email: created.email,
      username:
        data.username?.trim().toLowerCase() ||
        created.email.split('@')[0].toLowerCase(),
      role: 'employee',
      accountStatus: 'active',
      createdAt: now,
      updatedAt: now,
      passwordSetupLink: created.passwordSetupLink,
    };

    await this.queueNotification(
      'Account Created',
      `An employee account has been created for ${newUser.name}. A password setup link has been generated.`,
      'success',
      newUser.email
    );

    return newUser;
  }

  async updateUser(
    uid: string,
    changes: Partial<UserProfile>
  ): Promise<UserProfile> {
    try {
      const userRef = doc(db, 'users', uid);
      const userSnapshot = await getDoc(userRef);

      if (!userSnapshot.exists()) {
        throw new Error('User not found.');
      }

      const existingUser = userSnapshot.data() as UserProfile;
      const safeChanges = { ...changes };

      delete safeChanges.uid;
      delete safeChanges.createdAt;
      delete safeChanges.password;

      // Account status must be changed through the backend.
      delete safeChanges.accountStatus;

      const updatedAt = new Date().toISOString();

      await updateDoc(userRef, {
        ...safeChanges,
        updatedAt,
      });

      return {
        ...existingUser,
        ...safeChanges,
        updatedAt,
      };
    } catch (error) {
      if (error instanceof Error && error.message === 'User not found.') {
        throw error;
      }

      handleFirestoreError(error, OperationType.UPDATE, `users/${uid}`);
      throw error;
    }
  }

  async toggleAccountStatus(uid: string): Promise<UserProfile> {
    const users = await this.getAllUsers();
    const user = users.find((item) => item.uid === uid);

    if (!user) {
      throw new Error('User not found.');
    }

    if (user.role === 'admin') {
      throw new Error('Administrator account status cannot be changed here.');
    }

    const newStatus =
      user.accountStatus === 'active' ? 'inactive' : 'active';

    const headers = await this.getAdminAuthorizationHeaders();
    const response = await fetch(
      `/api/admin/users/${encodeURIComponent(uid)}/status`,
      {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ accountStatus: newStatus }),
      }
    );

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(
        result.error || 'Unable to update the employee account status.'
      );
    }

    const statusResult = result as AccountStatusResponse;

    if (statusResult.accountStatus !== newStatus) {
      throw new Error('The server returned an unexpected account status.');
    }

    return {
      ...user,
      accountStatus: newStatus,
      updatedAt: new Date().toISOString(),
    };
  }

  async getScheduleConfig(): Promise<WorkScheduleConfig> {
    try {
      const snapshot = await getDoc(
        doc(db, 'workSchedules', DEFAULT_SCHEDULE.scheduleId)
      );

      if (snapshot.exists()) {
        return snapshot.data() as WorkScheduleConfig;
      }
    } catch (error) {
      console.warn('Unable to fetch work schedule configuration:', error);
    }

    return this.scheduleConfig;
  }

  async updateScheduleConfig(
    config: WorkScheduleConfig
  ): Promise<WorkScheduleConfig> {
    try {
      await setDoc(doc(db, 'workSchedules', config.scheduleId), config);
      this.scheduleConfig = { ...config };
      return this.scheduleConfig;
    } catch (error) {
      handleFirestoreError(
        error,
        OperationType.WRITE,
        `workSchedules/${config.scheduleId}`
      );
      throw error;
    }
  }

  async queueNotification(
    title: string,
    message: string,
    type: 'info' | 'warning' | 'success' | 'alert',
    recipientEmail: string,
    link?: string
  ): Promise<NotificationItem> {
    const notification: NotificationItem = {
      id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      title,
      message,
      type,
      recipientEmail,
      sentAt: new Date().toISOString(),
      read: false,
      link,
    };

    this.notifications.unshift(notification);
    return notification;
  }

  getNotifications(email?: string): NotificationItem[] {
    if (email) {
      return this.notifications.filter(
        (notification) =>
          notification.recipientEmail === email ||
          notification.recipientEmail === 'admin.teara@gmail.com'
      );
    }

    return this.notifications;
  }

  markNotificationRead(id: string): void {
    const notification = this.notifications.find((item) => item.id === id);

    if (notification) {
      notification.read = true;
    }
  }

  calculateProductivityOverview(
    users: UserProfile[],
    attendanceList: AttendanceRecord[],
    workLogs: WorkLog[]
  ) {
    const today = getTodayDateString();

    const activeEmployees = users.filter(
      (user) =>
        user.role === 'employee' && user.accountStatus === 'active'
    );

    const todayAttendance = attendanceList.filter(
      (attendance) => attendance.workDate === today
    );

    const presentTodayCount = todayAttendance.length;

    const currentlyWorkingCount = todayAttendance.filter(
      (attendance) => attendance.status === 'checked_in'
    ).length;

    const metDailyTargetCount = todayAttendance.filter(
      (attendance) =>
        attendance.totalWorkingSeconds >=
        this.scheduleConfig.dailyMinimumSeconds
    ).length;

    const belowDailyTargetCount = todayAttendance.filter(
      (attendance) =>
        attendance.totalWorkingSeconds <
        this.scheduleConfig.dailyMinimumSeconds
    ).length;

    const todayLogEmployeeIds = new Set(
      workLogs
        .filter(
          (log) =>
            log.date === today && log.submissionStatus !== 'draft'
        )
        .map((log) => log.employeeId)
    );

    const missingSubmissionsCount = todayAttendance.filter(
      (attendance) => !todayLogEmployeeIds.has(attendance.employeeId)
    ).length;

    return {
      totalEmployees: activeEmployees.length,
      presentToday: presentTodayCount,
      currentlyWorking: currentlyWorkingCount,
      metDailyTarget: metDailyTargetCount,
      belowDailyTarget: belowDailyTargetCount,
      missingSubmissions: missingSubmissionsCount,
    };
  }
}

export const adminService = new AdminService();
