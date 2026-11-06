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
import {
  UserProfile,
  WorkScheduleConfig,
  NotificationItem,
  AttendanceRecord,
  WorkLog,
} from '../types';
import { PREDEFINED_USERS } from '../context/AuthContext';
import { getTodayDateString } from '../lib/utils';

export const DEFAULT_SCHEDULE: WorkScheduleConfig = {
  scheduleId: 'sched_teara_default',
  departmentId: 'R&D',
  workingDays: [1, 2, 3, 4, 5, 6], // Mon to Sat
  dailyMinimumSeconds: 10800, // 3 Hours
  weeklyMinimumSeconds: 64800, // 18 Hours
  workModel: 'hybrid',
  effectiveFrom: '2026-01-01',
};

class AdminService {
  private localUsers = new Map<string, UserProfile>();
  private scheduleConfig: WorkScheduleConfig = { ...DEFAULT_SCHEDULE };
  private notifications: NotificationItem[] = [];

  constructor() {
    this.init();
  }

  private init() {
    PREDEFINED_USERS.forEach((u) => this.localUsers.set(u.uid, u));
    this.notifications = [];
  }

  async getAllUsers(): Promise<UserProfile[]> {
    const list: UserProfile[] = [];
    try {
      const snaps = await getDocs(collection(db, 'users'));
      snaps.forEach((d) => list.push(d.data() as UserProfile));
    } catch (err) {
      console.warn('Firestore users fetch note, using local users:', err);
    }

    this.localUsers.forEach((u) => {
      if (!list.some((existing) => existing.uid === u.uid)) {
        list.push(u);
      }
    });

    return list.sort((a, b) => a.name.localeCompare(b.name));
  }

  async createEmployee(data: Omit<UserProfile, 'createdAt' | 'updatedAt'>): Promise<UserProfile> {
    const nowIso = new Date().toISOString();
    const newUser: UserProfile = {
      ...data,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    this.localUsers.set(newUser.uid, newUser);

    try {
      await setDoc(doc(db, 'users', newUser.uid), newUser);
      await this.queueNotification(
        'Account Created',
        `Welcome to Teara WorkHub. Your internal employee account is now active under the ${newUser.department} department.`,
        'success',
        newUser.email
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `users/${newUser.uid}`);
    }

    return newUser;
  }

  async updateUser(uid: string, changes: Partial<UserProfile>): Promise<UserProfile> {
    const user = this.localUsers.get(uid);
    if (!user) throw new Error('User not found');

    const updated: UserProfile = {
      ...user,
      ...changes,
      updatedAt: new Date().toISOString(),
    };
    this.localUsers.set(uid, updated);

    try {
      await updateDoc(doc(db, 'users', uid), updated as any);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${uid}`);
    }

    return updated;
  }

  async toggleAccountStatus(uid: string): Promise<UserProfile> {
    const user = this.localUsers.get(uid);
    if (!user) throw new Error('User not found');

    const newStatus = user.accountStatus === 'active' ? 'inactive' : 'active';
    return this.updateUser(uid, { accountStatus: newStatus });
  }

  async getScheduleConfig(): Promise<WorkScheduleConfig> {
    try {
      const snaps = await getDocs(collection(db, 'workSchedules'));
      if (!snaps.empty) {
        return snaps.docs[0].data() as WorkScheduleConfig;
      }
    } catch (err) {
      console.warn('Using local work schedule config:', err);
    }
    return this.scheduleConfig;
  }

  async updateScheduleConfig(config: WorkScheduleConfig): Promise<WorkScheduleConfig> {
    this.scheduleConfig = { ...config };
    try {
      await setDoc(doc(db, 'workSchedules', config.scheduleId), config);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `workSchedules/${config.scheduleId}`);
    }
    return this.scheduleConfig;
  }

  async queueNotification(
    title: string,
    message: string,
    type: 'info' | 'warning' | 'success' | 'alert',
    recipientEmail: string,
    link?: string
  ): Promise<NotificationItem> {
    const notif: NotificationItem = {
      id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      title,
      message,
      type,
      recipientEmail,
      sentAt: new Date().toISOString(),
      read: false,
      link,
    };
    this.notifications.unshift(notif);
    return notif;
  }

  getNotifications(email?: string): NotificationItem[] {
    if (email) {
      return this.notifications.filter((n) => n.recipientEmail === email || n.recipientEmail === 'admin.teara@gmail.com');
    }
    return this.notifications;
  }

  markNotificationRead(id: string): void {
    const item = this.notifications.find((n) => n.id === id);
    if (item) item.read = true;
  }

  calculateProductivityOverview(
    users: UserProfile[],
    attendanceList: AttendanceRecord[],
    workLogs: WorkLog[]
  ) {
    const today = getTodayDateString();
    const activeEmployees = users.filter((u) => u.role === 'employee' && u.accountStatus === 'active');
    const todayAttendance = attendanceList.filter((a) => a.workDate === today);

    const presentTodayCount = todayAttendance.length;
    const currentlyWorkingCount = todayAttendance.filter((a) => a.status === 'checked_in').length;
    const metDailyTargetCount = todayAttendance.filter(
      (a) => a.totalWorkingSeconds >= this.scheduleConfig.dailyMinimumSeconds
    ).length;
    const belowDailyTargetCount = todayAttendance.filter(
      (a) => a.totalWorkingSeconds < this.scheduleConfig.dailyMinimumSeconds
    ).length;

    // Missing work-log submissions: employees who attended or are present today but have not submitted a work log
    const todayLogEmployeeIds = new Set(
      workLogs.filter((l) => l.date === today && l.submissionStatus !== 'draft').map((l) => l.employeeId)
    );
    const missingSubmissionsCount = todayAttendance.filter(
      (a) => !todayLogEmployeeIds.has(a.employeeId)
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
