import React, { useState, useEffect, useCallback } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { EmployeeDashboard } from './components/employee/EmployeeDashboard';
import { AttendanceView } from './components/employee/AttendanceView';
import { WorkLogView } from './components/employee/WorkLogView';
import { EmployeeHistoryView } from './components/employee/EmployeeHistoryView';
import { ProfileView } from './components/employee/ProfileView';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { EmployeeManagement } from './components/admin/EmployeeManagement';
import { AttendanceMonitoring } from './components/admin/AttendanceMonitoring';
import { WorkLogMonitoring } from './components/admin/WorkLogMonitoring';
import { ProductivityReports } from './components/admin/ProductivityReports';
import { ScheduleConfig } from './components/admin/ScheduleConfig';
import { AuditTrailView } from './components/admin/AuditTrailView';
import { NotificationDrawer } from './components/notifications/NotificationDrawer';
import { LoginView } from './components/auth/LoginView';
import {
  AttendanceRecord,
  WorkLog,
  CorrectionRequest,
  WorkMode,
  NotificationItem,
} from './types';
import { attendanceService } from './services/attendanceService';
import { workLogService } from './services/workLogService';
import { adminService } from './services/adminService';
import { Menu, X, Sparkles } from 'lucide-react';

function WorkHubMain() {
  const { currentUser, isAdmin, loading, allUsers } = useAuth();
  const [currentTab, setCurrentTab] = useState<string>(isAdmin ? 'admin-dashboard' : 'dashboard');
  const [todayAttendance, setTodayAttendance] = useState<AttendanceRecord | null>(null);
  const [attendanceHistory, setAttendanceHistory] = useState<AttendanceRecord[]>([]);
  const [workLogs, setWorkLogs] = useState<WorkLog[]>([]);
  const [allAttendance, setAllAttendance] = useState<AttendanceRecord[]>([]);
  const [allWorkLogs, setAllWorkLogs] = useState<WorkLog[]>([]);
  const [correctionRequests, setCorrectionRequests] = useState<CorrectionRequest[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [checkInModalOpen, setCheckInModalOpen] = useState(false);

  // Sync tab when switching role (Admin vs Employee)
  useEffect(() => {
    if (isAdmin) {
      if (!currentTab.startsWith('admin-')) {
        setCurrentTab('admin-dashboard');
      }
    } else {
      if (currentTab.startsWith('admin-')) {
        setCurrentTab('dashboard');
      }
    }
  }, [isAdmin]);

  const loadData = useCallback(async () => {
    if (!currentUser) return;
    try {
      const [todayAtt, history, logs, allAtt, allLogs, corrections, notifs] = await Promise.all([
        attendanceService.getTodayAttendance(currentUser.uid),
        attendanceService.getEmployeeAttendanceHistory(currentUser.uid),
        workLogService.getWorkLogsByEmployee(currentUser.uid),
        attendanceService.getAllAttendanceRecords(),
        workLogService.getAllWorkLogs(),
        attendanceService.getCorrectionRequests(isAdmin ? undefined : currentUser.uid),
        Promise.resolve(adminService.getNotifications(currentUser.email)),
      ]);

      setTodayAttendance(todayAtt);
      setAttendanceHistory(history);
      setWorkLogs(logs);
      setAllAttendance(allAtt);
      setAllWorkLogs(allLogs);
      setCorrectionRequests(corrections);
      setNotifications(notifs);
    } catch (err) {
      console.error('Data refresh error:', err);
    }
  }, [currentUser, isAdmin]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Attendance Actions
  const handleCheckIn = async (mode: WorkMode) => {
    if (!currentUser) return;
    try {
      const updated = await attendanceService.checkIn(
        currentUser.uid,
        currentUser.name,
        currentUser.email,
        currentUser.department,
        mode
      );
      setTodayAttendance(updated);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Check-in failed');
    }
  };

  const handleStartBreak = async () => {
    if (!currentUser) return;
    try {
      const updated = await attendanceService.startBreak(currentUser.uid, 'Break');
      setTodayAttendance(updated);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Break failed');
    }
  };

  const handleEndBreak = async () => {
    if (!currentUser) return;
    try {
      const updated = await attendanceService.endBreak(currentUser.uid);
      setTodayAttendance(updated);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Resume failed');
    }
  };

  const handleCheckOut = async () => {
    if (!currentUser) return;
    try {
      const updated = await attendanceService.checkOut(currentUser.uid);
      setTodayAttendance(updated);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Check-out failed');
    }
  };

  const unreadNotifs = notifications.filter((n) => !n.read).length;

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-[#FEFCF7] text-[#192B16]">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-[#192B16] text-[#B29261] font-bold text-2xl flex items-center justify-center mx-auto animate-pulse">
            T
          </div>
          <p className="text-sm font-semibold tracking-wide">Loading Teara WorkHub...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <LoginView />;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#FEFCF7] text-[#192B16]">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block shrink-0">
        <Sidebar
          currentTab={currentTab}
          onSelectTab={setCurrentTab}
          todayAttendance={todayAttendance}
        />
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative z-10">
            <Sidebar
              currentTab={currentTab}
              onSelectTab={(tab) => {
                setCurrentTab(tab);
                setMobileMenuOpen(false);
              }}
              todayAttendance={todayAttendance}
            />
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile top strip for toggling sidebar */}
        <div className="lg:hidden flex items-center justify-between px-4 py-2 bg-[#192B16] text-white">
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="p-1.5 rounded-lg bg-[#243E20] text-[#FEFCF7]"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="font-bold text-sm tracking-wide flex items-center space-x-1.5">
            <span className="text-[#CDB487]">TEARA</span>
            <span className="text-xs bg-[#B29261]/25 px-1 rounded">WORKHUB</span>
          </div>
          <div className="text-[10px] text-stone-300 font-medium">
            {currentUser?.name?.split(' ')[0]}
          </div>
        </div>

        {/* Universal Header */}
        <Header
          todayAttendance={todayAttendance}
          onCheckIn={handleCheckIn}
          onStartBreak={handleStartBreak}
          onEndBreak={handleEndBreak}
          onCheckOut={handleCheckOut}
          onToggleNotifications={() => setIsNotificationOpen(true)}
          unreadNotificationsCount={unreadNotifs}
        />

        {/* View Routing Container */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-[#FEFCF7]">
          {/* Employee Tabs */}
          {!isAdmin && currentTab === 'dashboard' && (
            <EmployeeDashboard
              todayAttendance={todayAttendance}
              attendanceHistory={attendanceHistory}
              workLogs={workLogs}
              onNavigateTab={setCurrentTab}
              onOpenCheckInModal={() => handleCheckIn('office')}
              onStartBreak={handleStartBreak}
              onEndBreak={handleEndBreak}
              onCheckOut={handleCheckOut}
            />
          )}

          {!isAdmin && currentTab === 'attendance' && (
            <AttendanceView
              todayAttendance={todayAttendance}
              attendanceHistory={attendanceHistory}
              correctionRequests={correctionRequests}
              onCheckIn={handleCheckIn}
              onStartBreak={handleStartBreak}
              onEndBreak={handleEndBreak}
              onCheckOut={handleCheckOut}
              onRefreshData={loadData}
            />
          )}

          {!isAdmin && currentTab === 'worklogs' && (
            <WorkLogView
              workLogs={workLogs}
              todayAttendance={todayAttendance}
              onRefreshData={loadData}
            />
          )}

          {!isAdmin && currentTab === 'history' && (
            <EmployeeHistoryView attendanceHistory={attendanceHistory} />
          )}

          {!isAdmin && currentTab === 'profile' && <ProfileView />}

          {/* Admin Tabs */}
          {isAdmin && currentTab === 'admin-dashboard' && (
            <AdminDashboard
              users={allUsers}
              allAttendance={allAttendance}
              allWorkLogs={allWorkLogs}
              correctionRequests={correctionRequests}
              onNavigateTab={setCurrentTab}
              onRefreshData={loadData}
            />
          )}

          {isAdmin && currentTab === 'admin-employees' && (
            <EmployeeManagement
              users={allUsers}
              allAttendance={allAttendance}
              onRefreshData={loadData}
            />
          )}

          {isAdmin && currentTab === 'admin-attendance' && (
            <AttendanceMonitoring
              allAttendance={allAttendance}
              correctionRequests={correctionRequests}
              onRefreshData={loadData}
            />
          )}

          {isAdmin && currentTab === 'admin-worklogs' && (
            <WorkLogMonitoring
              allWorkLogs={allWorkLogs}
              onRefreshData={loadData}
            />
          )}

          {isAdmin && currentTab === 'admin-reports' && (
            <ProductivityReports
              users={allUsers}
              allAttendance={allAttendance}
              allWorkLogs={allWorkLogs}
            />
          )}

          {isAdmin && currentTab === 'admin-schedule' && <ScheduleConfig />}

          {isAdmin && currentTab === 'admin-audit' && <AuditTrailView />}
        </main>
      </div>

      {/* Transactional Notifications Drawer */}
      <NotificationDrawer
        isOpen={isNotificationOpen}
        onClose={() => setIsNotificationOpen(false)}
        notifications={notifications}
        onRefresh={loadData}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <WorkHubMain />
    </AuthProvider>
  );
}
