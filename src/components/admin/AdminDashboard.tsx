import React from 'react';
import {
  Users,
  UserCheck,
  Clock,
  CheckCircle2,
  AlertTriangle,
  FileWarning,
  Building2,
  Laptop,
  ArrowRight,
  ShieldCheck,
  Send,
  Calendar,
  ExternalLink,
} from 'lucide-react';
import {
  UserProfile,
  AttendanceRecord,
  WorkLog,
  CorrectionRequest,
} from '../../types';
import { formatDuration, formatDate, formatTime, getTodayDateString } from '../../lib/utils';
import { adminService } from '../../services/adminService';

interface AdminDashboardProps {
  users: UserProfile[];
  allAttendance: AttendanceRecord[];
  allWorkLogs: WorkLog[];
  correctionRequests: CorrectionRequest[];
  onNavigateTab: (tab: string) => void;
  onRefreshData: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  users,
  allAttendance,
  allWorkLogs,
  correctionRequests,
  onNavigateTab,
  onRefreshData,
}) => {
  const today = getTodayDateString();
  const overview = adminService.calculateProductivityOverview(users, allAttendance, allWorkLogs);
  const todayAttendance = allAttendance.filter((a) => a.workDate === today);
  const pendingCorrections = correctionRequests.filter((c) => c.approvalStatus === 'pending');

  const handleSendReminderToAllMissing = async () => {
    const todayLogEmployeeIds = new Set(
      allWorkLogs.filter((l) => l.date === today && l.submissionStatus !== 'draft').map((l) => l.employeeId)
    );
    const missing = todayAttendance.filter((a) => !todayLogEmployeeIds.has(a.employeeId));

    for (const att of missing) {
      await adminService.queueNotification(
        'Missing Daily Work Log',
        `Urgent: You are currently active/checked-in for ${today}. Please submit your daily work log before checking out.`,
        'warning',
        att.employeeEmail
      );
    }
    alert(`Dispatched automated work-log reminders to ${missing.length} employee(s).`);
    onRefreshData();
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-[#192B16] via-[#243E20] to-[#122010] rounded-2xl p-6 text-[#FEFCF7] border border-[#243E20] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-[#CDB487] text-xs font-semibold tracking-wider uppercase mb-1">
            <ShieldCheck className="w-4 h-4 text-[#B29261]" />
            <span>Teara Executive Command & Control</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#FEFCF7]">
            Workforce & Productivity Overview
          </h1>
          <p className="text-xs text-[#A3B89E] mt-1 max-w-xl">
            Live operational dashboard for Teara's internal R&D workforce. Monitoring attendance compliance, 3-hour minimum daily thresholds, and daily work logs.
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            onClick={() => onNavigateTab('admin-employees')}
            className="px-4 py-2 bg-[#B29261] hover:bg-[#CDB487] text-[#192B16] text-xs font-bold rounded-xl shadow-xs transition-colors"
          >
            Manage Employees
          </button>
          <button
            onClick={() => onNavigateTab('admin-reports')}
            className="px-4 py-2 bg-[#122010] hover:bg-[#1A2E16] text-[#FEFCF7] border border-[#B29261]/40 text-xs font-bold rounded-xl transition-colors"
          >
            Productivity Reports
          </button>
        </div>
      </div>

      {/* 6 Key Overview KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {/* Card 1 */}
        <div className="bg-[#FEFCF7] border border-[#E8E2D3] rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-stone-500 mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider">Total Staff</span>
            <Users className="w-4 h-4 text-[#B29261]" />
          </div>
          <div className="text-2xl font-black text-[#192B16] font-mono">
            {overview.totalEmployees}
          </div>
          <span className="text-[10px] text-stone-500 mt-1 block">Active R&D headcount</span>
        </div>

        {/* Card 2 */}
        <div className="bg-[#FEFCF7] border border-[#E8E2D3] rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-stone-500 mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider">Present Today</span>
            <UserCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-800 font-mono">
            {overview.presentToday}
          </div>
          <span className="text-[10px] text-stone-500 mt-1 block">
            {overview.totalEmployees > 0
              ? `${Math.round((overview.presentToday / overview.totalEmployees) * 100)}% attendance rate`
              : '0%'}
          </span>
        </div>

        {/* Card 3 */}
        <div className="bg-[#FEFCF7] border border-[#E8E2D3] rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-stone-500 mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider">Currently Working</span>
            <Clock className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-black text-blue-900 font-mono">
            {overview.currentlyWorking}
          </div>
          <span className="text-[10px] text-stone-500 mt-1 block">Live active sessions</span>
        </div>

        {/* Card 4 */}
        <div className="bg-[#FEFCF7] border border-[#E8E2D3] rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-stone-500 mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider">Met 3h Target</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-800 font-mono">
            {overview.metDailyTarget}
          </div>
          <span className="text-[10px] text-emerald-700 font-medium mt-1 block">
            Target fulfilled today
          </span>
        </div>

        {/* Card 5 */}
        <div className="bg-[#FEFCF7] border border-[#E8E2D3] rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-stone-500 mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider">Below Target</span>
            <AlertTriangle className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-black text-amber-800 font-mono">
            {overview.belowDailyTarget}
          </div>
          <span className="text-[10px] text-amber-700 font-medium mt-1 block">
            &lt; 3h working hours
          </span>
        </div>

        {/* Card 6 */}
        <div className="bg-[#FEFCF7] border border-[#E8E2D3] rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-stone-500 mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider">Missing Logs</span>
            <FileWarning className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl font-black text-rose-800 font-mono">
            {overview.missingSubmissions}
          </div>
          <span className="text-[10px] text-rose-700 font-medium mt-1 block">
            Log not yet submitted
          </span>
        </div>
      </div>

      {/* Action Banners (Missing Submissions & Pending Corrections) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {overview.missingSubmissions > 0 && (
          <div className="bg-[#F7EFE1] border border-[#B29261]/40 rounded-xl p-4 flex items-center justify-between shadow-xs">
            <div className="flex items-center space-x-3">
              <FileWarning className="w-5 h-5 text-amber-700 shrink-0" />
              <div>
                <h4 className="text-xs font-bold text-[#192B16]">
                  {overview.missingSubmissions} Employee(s) Have Not Submitted Work Logs Today
                </h4>
                <p className="text-[11px] text-stone-600">
                  Daily work log submission is required per Teara policy. Send automated reminders.
                </p>
              </div>
            </div>
            <button
              onClick={handleSendReminderToAllMissing}
              className="px-3 py-1.5 text-xs font-bold bg-[#192B16] text-[#FEFCF7] hover:bg-[#243E20] rounded-lg transition-colors flex items-center space-x-1 shrink-0 ml-3"
            >
              <Send className="w-3 h-3 text-[#B29261]" />
              <span>Remind All</span>
            </button>
          </div>
        )}

        {pendingCorrections.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center justify-between shadow-xs">
            <div className="flex items-center space-x-3">
              <Clock className="w-5 h-5 text-blue-700 shrink-0" />
              <div>
                <h4 className="text-xs font-bold text-blue-900">
                  {pendingCorrections.length} Attendance Correction Request(s) Pending
                </h4>
                <p className="text-[11px] text-blue-700">
                  Staff submitted adjustments for timestamp irregularities requiring audit review.
                </p>
              </div>
            </div>
            <button
              onClick={() => onNavigateTab('admin-attendance')}
              className="px-3 py-1.5 text-xs font-bold bg-blue-800 text-white hover:bg-blue-900 rounded-lg transition-colors shrink-0 ml-3"
            >
              Review
            </button>
          </div>
        )}
      </div>

      {/* Live Presence Table for Today */}
      <div className="bg-[#FEFCF7] border border-[#E8E2D3] rounded-2xl p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <h3 className="font-bold text-sm text-[#192B16]">Live Employee Presence — {formatDate(today)}</h3>
            <p className="text-xs text-stone-500">
              Real-time attendance status, work mode distribution, and active working session duration.
            </p>
          </div>
          <button
            onClick={() => onNavigateTab('admin-attendance')}
            className="text-xs font-bold text-[#B29261] hover:text-[#917448] flex items-center"
          >
            <span>Full Attendance Master</span>
            <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#E8E2D3] text-stone-500 uppercase text-[10px] tracking-wider">
                <th className="pb-3 font-semibold">Employee</th>
                <th className="pb-3 font-semibold">Work Mode</th>
                <th className="pb-3 font-semibold">First Login</th>
                <th className="pb-3 font-semibold">Last Logout</th>
                <th className="pb-3 font-semibold">Breaks</th>
                <th className="pb-3 font-semibold">Net Work Time</th>
                <th className="pb-3 font-semibold">Status</th>
                <th className="pb-3 font-semibold">3h Daily Target</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8E2D3]/60">
              {todayAttendance.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-stone-400">
                    No employee check-ins recorded yet today.
                  </td>
                </tr>
              ) : (
                todayAttendance.map((rec) => {
                  const met = rec.totalWorkingSeconds >= 10800;
                  return (
                    <tr key={rec.attendanceId} className="hover:bg-[#F7F4EC]/40">
                      <td className="py-3 font-bold text-[#192B16]">
                        {rec.employeeName}
                        <span className="block text-[10px] text-stone-400 font-normal">
                          {rec.employeeEmail}
                        </span>
                      </td>
                      <td className="py-3 capitalize text-stone-700">
                        {rec.workMode === 'office' ? (
                          <span className="flex items-center text-[10px] bg-stone-100 text-stone-800 px-2 py-0.5 rounded w-max">
                            <Building2 className="w-3 h-3 text-[#B29261] mr-1" /> Office
                          </span>
                        ) : (
                          <span className="flex items-center text-[10px] bg-stone-100 text-stone-800 px-2 py-0.5 rounded w-max">
                            <Laptop className="w-3 h-3 text-[#B29261] mr-1" /> Home
                          </span>
                        )}
                      </td>
                      <td className="py-3 font-mono text-[11px] text-stone-600">
                        {formatTime(rec.firstCheckIn)}
                      </td>
                      <td className="py-3 font-mono text-[11px] text-stone-600">
                        {formatTime(rec.lastCheckOut)}
                      </td>
                      <td className="py-3 font-mono text-stone-600">
                        {formatDuration(rec.totalBreakSeconds, 'short')}
                      </td>
                      <td className="py-3 font-black font-mono text-stone-900 text-sm">
                        {formatDuration(rec.totalWorkingSeconds, 'short')}
                      </td>
                      <td className="py-3">
                        {rec.status === 'checked_in' ? (
                          <span className="inline-flex items-center text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 mr-1.5 animate-pulse"></span>
                            Checked In
                          </span>
                        ) : rec.status === 'on_break' ? (
                          <span className="inline-flex items-center text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded">
                            On Break
                          </span>
                        ) : (
                          <span className="inline-flex items-center text-[10px] font-bold text-stone-700 bg-stone-100 px-2 py-0.5 rounded">
                            Checked Out
                          </span>
                        )}
                      </td>
                      <td className="py-3">
                        {met ? (
                          <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                            Target Achieved
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded">
                            {formatDuration(10800 - rec.totalWorkingSeconds, 'short')} Left
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
