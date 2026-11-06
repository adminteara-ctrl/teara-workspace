import React from 'react';
import {
  Clock,
  Target,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ExternalLink,
  Laptop,
  Building2,
  FileText,
  TrendingUp,
  Coffee,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { AttendanceRecord, WorkLog } from '../../types';
import { formatDuration, formatDate, formatTime, getTodayDateString } from '../../lib/utils';

interface EmployeeDashboardProps {
  todayAttendance: AttendanceRecord | null;
  attendanceHistory: AttendanceRecord[];
  workLogs: WorkLog[];
  onNavigateTab: (tab: string) => void;
  onOpenCheckInModal: () => void;
  onStartBreak: () => void;
  onEndBreak: () => void;
  onCheckOut: () => void;
}

export const EmployeeDashboard: React.FC<EmployeeDashboardProps> = ({
  todayAttendance,
  attendanceHistory,
  workLogs,
  onNavigateTab,
  onOpenCheckInModal,
  onStartBreak,
  onEndBreak,
  onCheckOut,
}) => {
  const { currentUser } = useAuth();
  const todayStr = getTodayDateString();

  // Daily target: 3 hours = 10,800s
  const dailyTargetSeconds = 10800;
  const todayWorkedSeconds = todayAttendance?.totalWorkingSeconds || 0;
  const dailyProgress = Math.min(100, Math.round((todayWorkedSeconds / dailyTargetSeconds) * 100));
  const dailyTargetMet = todayWorkedSeconds >= dailyTargetSeconds;
  const dailyRemainingSeconds = Math.max(0, dailyTargetSeconds - todayWorkedSeconds);

  // Weekly target: 18 hours = 64,800s
  // Sum past 6 working days (Mon-Sat, excluding Sun)
  const weeklyTargetSeconds = 64800;
  const weeklyWorkedSeconds = attendanceHistory.reduce((acc, curr) => {
    return acc + (curr.totalWorkingSeconds || 0);
  }, 0);
  const weeklyProgress = Math.min(100, Math.round((weeklyWorkedSeconds / weeklyTargetSeconds) * 100));
  const weeklyTargetMet = weeklyWorkedSeconds >= weeklyTargetSeconds;
  const weeklyRemainingSeconds = Math.max(0, weeklyTargetSeconds - weeklyWorkedSeconds);

  // Check if work log has been submitted today
  const todaySubmittedLog = workLogs.find(
    (l) => l.date === todayStr && l.employeeId === currentUser?.uid && l.submissionStatus !== 'draft'
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-[#192B16] via-[#243E20] to-[#122010] rounded-2xl p-6 text-[#FEFCF7] shadow-sm border border-[#243E20] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-[#CDB487] text-xs font-semibold tracking-wider uppercase mb-1">
            <span>Teara Workforce Hub</span>
            <span>•</span>
            <span>Employee Portal</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#FEFCF7]">
            Welcome back, {currentUser?.name}
          </h1>
          <p className="text-sm text-[#A3B89E] mt-1 max-w-xl">
            {currentUser?.jobTitle || 'Internal Team Member'}. Track your daily working hours, record breaks, and submit daily work logs.
          </p>
        </div>

        {/* Quick Status Pill & Action */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="bg-[#122010]/80 border border-[#B29261]/30 px-3.5 py-2 rounded-xl text-left">
            <span className="text-[10px] text-[#A3B89E] block uppercase tracking-wider font-semibold">
              Current Session
            </span>
            <div className="flex items-center space-x-1.5 mt-0.5">
              {todayAttendance?.status === 'checked_in' ? (
                <>
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping"></span>
                  <span className="text-xs font-bold text-emerald-300">Actively Working</span>
                </>
              ) : todayAttendance?.status === 'on_break' ? (
                <>
                  <Coffee className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-xs font-bold text-amber-300">Taking Break</span>
                </>
              ) : (
                <>
                  <span className="h-2 w-2 rounded-full bg-stone-400"></span>
                  <span className="text-xs font-medium text-stone-300">Not Checked In</span>
                </>
              )}
            </div>
          </div>

          {!todayAttendance || todayAttendance.status === 'checked_out' ? (
            <button
              onClick={onOpenCheckInModal}
              className="bg-[#B29261] hover:bg-[#CDB487] text-[#192B16] font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-sm flex items-center space-x-1.5"
            >
              <span>Check In Now</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              onClick={() => onNavigateTab('attendance')}
              className="bg-[#B29261] hover:bg-[#CDB487] text-[#192B16] font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-sm flex items-center space-x-1.5"
            >
              <span>Manage Session</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Daily Work Log Warning / Prompt */}
      {todayAttendance && !todaySubmittedLog && (
        <div className="bg-[#F7EFE1] border border-[#B29261]/40 rounded-xl p-4 flex items-center justify-between shadow-xs">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg bg-[#B29261]/20 flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5 text-[#917448]" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-[#192B16]">Daily Work Log Pending Submission</h4>
              <p className="text-xs text-stone-600">
                You are checked in today. Please record your daily tasks, achievements, and Jira references before checking out.
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigateTab('worklogs')}
            className="px-3.5 py-1.5 text-xs font-semibold bg-[#192B16] text-[#FEFCF7] hover:bg-[#243E20] rounded-lg transition-colors shrink-0 ml-4"
          >
            Submit Work Log
          </button>
        </div>
      )}

      {/* Grid of Key Contribution Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Card 1: Daily Contribution */}
        <div className="bg-[#FEFCF7] border border-[#E8E2D3] rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-stone-500 flex items-center">
                <Clock className="w-3.5 h-3.5 text-[#B29261] mr-1.5" />
                Daily Target
              </span>
              {dailyTargetMet ? (
                <span className="flex items-center text-[10px] font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-full">
                  <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-600" /> Target Achieved
                </span>
              ) : (
                <span className="text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                  Below Target
                </span>
              )}
            </div>

            <div className="mt-2">
              <div className="text-3xl font-extrabold text-[#192B16] font-mono">
                {formatDuration(todayWorkedSeconds, 'short')}
              </div>
              <p className="text-xs text-stone-500 mt-1">
                Target: <span className="font-semibold text-stone-700">3.0 hours</span> minimum per working day
              </p>
            </div>

            {/* Progress bar */}
            <div className="mt-4">
              <div className="flex justify-between text-xs font-medium text-stone-600 mb-1">
                <span>Progress: {dailyProgress}%</span>
                <span>
                  {dailyTargetMet
                    ? 'Goal Met (+ ' + formatDuration(todayWorkedSeconds - dailyTargetSeconds, 'short') + ')'
                    : `${formatDuration(dailyRemainingSeconds, 'short')} remaining`}
                </span>
              </div>
              <div className="w-full bg-[#E8E2D3]/60 h-2.5 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 rounded-full ${
                    dailyTargetMet ? 'bg-emerald-600' : 'bg-[#B29261]'
                  }`}
                  style={{ width: `${dailyProgress}%` }}
                ></div>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-[#E8E2D3]/60 flex items-center justify-between text-xs text-stone-500">
            <span>Breaks today: {formatDuration(todayAttendance?.totalBreakSeconds || 0, 'short')}</span>
            <span className="capitalize">Mode: {todayAttendance?.workMode || 'Hybrid'}</span>
          </div>
        </div>

        {/* Card 2: Weekly Contribution */}
        <div className="bg-[#FEFCF7] border border-[#E8E2D3] rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-stone-500 flex items-center">
                <Target className="w-3.5 h-3.5 text-[#B29261] mr-1.5" />
                Weekly Target
              </span>
              {weeklyTargetMet ? (
                <span className="flex items-center text-[10px] font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-full">
                  <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-600" /> Target Met
                </span>
              ) : (
                <span className="text-[10px] font-bold text-stone-700 bg-stone-100 border border-stone-200 px-2 py-0.5 rounded-full">
                  {Math.round(weeklyProgress)}% Contributed
                </span>
              )}
            </div>

            <div className="mt-2">
              <div className="text-3xl font-extrabold text-[#192B16] font-mono">
                {formatDuration(weeklyWorkedSeconds, 'short')}
              </div>
              <p className="text-xs text-stone-500 mt-1">
                Target: <span className="font-semibold text-stone-700">18.0 hours</span> (Mon - Sat)
              </p>
            </div>

            {/* Progress bar */}
            <div className="mt-4">
              <div className="flex justify-between text-xs font-medium text-stone-600 mb-1">
                <span>Weekly: {weeklyProgress}%</span>
                <span>
                  {weeklyTargetMet
                    ? 'Target Complete'
                    : `${formatDuration(weeklyRemainingSeconds, 'short')} remaining`}
                </span>
              </div>
              <div className="w-full bg-[#E8E2D3]/60 h-2.5 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 rounded-full ${
                    weeklyTargetMet ? 'bg-emerald-600' : 'bg-[#192B16]'
                  }`}
                  style={{ width: `${weeklyProgress}%` }}
                ></div>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-[#E8E2D3]/60 flex items-center justify-between text-xs text-stone-500">
            <span>Sunday is designated weekly off</span>
            <button
              onClick={() => onNavigateTab('history')}
              className="text-[#B29261] hover:text-[#917448] font-semibold text-xs flex items-center"
            >
              History <ArrowRight className="w-3 h-3 ml-0.5" />
            </button>
          </div>
        </div>

        {/* Card 3: Attendance Details */}
        <div className="bg-[#FEFCF7] border border-[#E8E2D3] rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-stone-500 flex items-center">
                <Calendar className="w-3.5 h-3.5 text-[#B29261] mr-1.5" />
                Session Details
              </span>
              <span className="text-xs text-stone-400 font-mono">{todayStr}</span>
            </div>

            <div className="space-y-2.5 mt-3 text-xs">
              <div className="flex items-center justify-between p-2 bg-[#F7F4EC] rounded-lg">
                <span className="text-stone-500">First Check-In:</span>
                <span className="font-semibold text-stone-800">
                  {formatTime(todayAttendance?.firstCheckIn)}
                </span>
              </div>
              <div className="flex items-center justify-between p-2 bg-[#F7F4EC] rounded-lg">
                <span className="text-stone-500">Last Check-Out:</span>
                <span className="font-semibold text-stone-800">
                  {formatTime(todayAttendance?.lastCheckOut)}
                </span>
              </div>
              <div className="flex items-center justify-between p-2 bg-[#F7F4EC] rounded-lg">
                <span className="text-stone-500">Work Mode:</span>
                <span className="font-semibold text-stone-800 capitalize flex items-center">
                  {todayAttendance?.workMode === 'home' ? (
                    <>
                      <Laptop className="w-3.5 h-3.5 text-[#B29261] mr-1" /> Work From Home
                    </>
                  ) : (
                    <>
                      <Building2 className="w-3.5 h-3.5 text-[#B29261] mr-1" /> Work From Office
                    </>
                  )}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-[#E8E2D3]/60 flex items-center justify-between text-xs">
            <span className="text-stone-500">Net Active Time:</span>
            <span className="font-bold text-[#192B16] font-mono">
              {formatDuration(todayWorkedSeconds, 'hms')}
            </span>
          </div>
        </div>
      </div>

      {/* Two Column Section: Recent Work Logs & Recent Attendance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Work Logs */}
        <div className="bg-[#FEFCF7] border border-[#E8E2D3] rounded-2xl p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <FileText className="w-4 h-4 text-[#B29261]" />
              <h3 className="font-bold text-sm text-[#192B16]">Recent Daily Work Logs</h3>
            </div>
            <button
              onClick={() => onNavigateTab('worklogs')}
              className="text-xs font-semibold text-[#B29261] hover:text-[#917448] flex items-center"
            >
              View All <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </button>
          </div>

          {workLogs.length === 0 ? (
            <div className="text-center py-8 text-stone-400 text-xs">
              No work logs submitted yet. Click "Submit Work Log" to create your first entry.
            </div>
          ) : (
            <div className="space-y-3">
              {workLogs.slice(0, 3).map((log) => (
                <div
                  key={log.workLogId}
                  className="p-3.5 rounded-xl border border-[#E8E2D3] bg-[#F7F4EC]/50 hover:bg-[#F7F4EC] transition-all"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-[#192B16]">{formatDate(log.date)}</span>
                    <div className="flex items-center space-x-2">
                      {log.jiraTaskId && (
                        <a
                          href={log.jiraTaskUrl || '#'}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center text-[10px] bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded font-mono font-medium hover:bg-blue-100"
                        >
                          <span>{log.jiraTaskId}</span>
                          <ExternalLink className="w-2.5 h-2.5 ml-1" />
                        </a>
                      )}
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded uppercase ${
                          log.submissionStatus === 'reviewed'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {log.submissionStatus}
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-stone-700 line-clamp-2">{log.workCompleted || log.workUndertaken}</p>
                  {log.reviewRemarks && (
                    <div className="mt-2 text-[11px] text-stone-600 bg-white p-2 rounded border border-[#E8E2D3]">
                      <span className="font-semibold text-stone-800">Admin Remark:</span> {log.reviewRemarks}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Attendance Records */}
        <div className="bg-[#FEFCF7] border border-[#E8E2D3] rounded-2xl p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="w-4 h-4 text-[#B29261]" />
              <h3 className="font-bold text-sm text-[#192B16]">Recent Attendance History</h3>
            </div>
            <button
              onClick={() => onNavigateTab('attendance')}
              className="text-xs font-semibold text-[#B29261] hover:text-[#917448] flex items-center"
            >
              Full History <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#E8E2D3] text-stone-500 uppercase text-[10px] tracking-wider">
                  <th className="pb-2 font-semibold">Date</th>
                  <th className="pb-2 font-semibold">Mode</th>
                  <th className="pb-2 font-semibold">Time</th>
                  <th className="pb-2 font-semibold">Hours</th>
                  <th className="pb-2 font-semibold">Target</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8E2D3]/60">
                {attendanceHistory.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-stone-400 text-xs">
                      No attendance records logged yet. Click "Check In Now" to start your first working session.
                    </td>
                  </tr>
                ) : (
                  attendanceHistory.slice(0, 5).map((rec) => {
                    const met = rec.totalWorkingSeconds >= 10800;
                    return (
                      <tr key={rec.attendanceId} className="hover:bg-[#F7F4EC]/40">
                        <td className="py-2.5 font-medium text-stone-800">{formatDate(rec.workDate)}</td>
                        <td className="py-2.5 capitalize text-stone-600">
                          {rec.workMode === 'office' ? (
                            <span className="flex items-center text-[10px]">
                              <Building2 className="w-3 h-3 text-[#B29261] mr-1" /> Office
                            </span>
                          ) : (
                            <span className="flex items-center text-[10px]">
                              <Laptop className="w-3 h-3 text-[#B29261] mr-1" /> Home
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 text-stone-500 font-mono text-[11px]">
                          {formatTime(rec.firstCheckIn)} - {formatTime(rec.lastCheckOut)}
                        </td>
                        <td className="py-2.5 font-bold font-mono text-stone-800">
                          {formatDuration(rec.totalWorkingSeconds, 'short')}
                        </td>
                        <td className="py-2.5">
                          {met ? (
                            <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded">
                              Met
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded">
                              Below
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
    </div>
  );
};
