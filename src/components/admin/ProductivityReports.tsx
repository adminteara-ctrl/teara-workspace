import React, { useState } from 'react';
import {
  BarChart3,
  Download,
  Calendar,
  Users,
  Target,
  AlertTriangle,
  FileWarning,
  CheckCircle2,
  TrendingUp,
} from 'lucide-react';
import { UserProfile, AttendanceRecord, WorkLog } from '../../types';
import { formatDuration, formatDate, exportToCSV, getTodayDateString } from '../../lib/utils';

interface ProductivityReportsProps {
  users: UserProfile[];
  allAttendance: AttendanceRecord[];
  allWorkLogs: WorkLog[];
}

export const ProductivityReports: React.FC<ProductivityReportsProps> = ({
  users,
  allAttendance,
  allWorkLogs,
}) => {
  const [reportType, setReportType] = useState<'weekly' | 'daily' | 'below_target' | 'missing_logs'>('weekly');
  const today = getTodayDateString();

  const activeEmployees = users.filter((u) => u.role === 'employee' && u.accountStatus === 'active');

  // Employee-wise calculations
  const employeeSummaries = activeEmployees.map((emp) => {
    const records = allAttendance.filter((a) => a.employeeId === emp.uid);
    const todayRec = records.find((r) => r.workDate === today);
    const totalWeeklySecs = records.reduce((sum, r) => sum + (r.totalWorkingSeconds || 0), 0);
    const totalBreaksSecs = records.reduce((sum, r) => sum + (r.totalBreakSeconds || 0), 0);
    const hasTodayLog = allWorkLogs.some(
      (l) => l.employeeId === emp.uid && l.date === today && l.submissionStatus !== 'draft'
    );
    const weeklyTargetMet = totalWeeklySecs >= 64800; // 18h
    const dailyTargetMet = (todayRec?.totalWorkingSeconds || 0) >= 10800; // 3h

    return {
      uid: emp.uid,
      name: emp.name,
      email: emp.email,
      department: emp.department,
      jobTitle: emp.jobTitle || 'Staff',
      todayWorkingSecs: todayRec?.totalWorkingSeconds || 0,
      todayStatus: todayRec?.status || 'absent',
      totalWeeklySecs,
      totalBreaksSecs,
      weeklyTargetMet,
      dailyTargetMet,
      hasTodayLog,
    };
  });

  const exportWeeklyReport = () => {
    const rows = employeeSummaries.map((emp) => ({
      EmployeeName: emp.name,
      Email: emp.email,
      Designation: emp.jobTitle,
      WeeklyWorkedSeconds: emp.totalWeeklySecs,
      WeeklyHoursFormatted: formatDuration(emp.totalWeeklySecs, 'short'),
      Weekly18hTargetMet: emp.weeklyTargetMet ? 'YES' : 'NO',
      RemainingTo18h: formatDuration(Math.max(0, 64800 - emp.totalWeeklySecs), 'short'),
      TodayWorkedHours: formatDuration(emp.todayWorkingSecs, 'short'),
    }));
    exportToCSV(`Teara_Weekly_Productivity_${today}`, rows);
  };

  const exportDailyCompliance = () => {
    const rows = employeeSummaries.map((emp) => ({
      EmployeeName: emp.name,
      Email: emp.email,
      TodayStatus: emp.todayStatus,
      TodayWorkingSeconds: emp.todayWorkingSecs,
      TodayHoursFormatted: formatDuration(emp.todayWorkingSecs, 'short'),
      Daily3hTargetMet: emp.dailyTargetMet ? 'YES' : 'NO',
      SubmittedDailyLog: emp.hasTodayLog ? 'YES' : 'NO',
    }));
    exportToCSV(`Teara_Daily_Compliance_${today}`, rows);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E8E2D3] pb-4">
        <div>
          <h1 className="text-xl font-bold text-[#192B16] flex items-center">
            <BarChart3 className="w-5 h-5 text-[#B29261] mr-2" />
            Productivity & Workforce Analytics
          </h1>
          <p className="text-xs text-stone-600 mt-1">
            Weekly 18-hour threshold monitoring, daily 3-hour minimum tracking, missing log detection, and CSV audit exports.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={reportType === 'weekly' ? exportWeeklyReport : exportDailyCompliance}
            className="flex items-center space-x-1.5 bg-[#192B16] hover:bg-[#243E20] text-[#FEFCF7] px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm"
          >
            <Download className="w-3.5 h-3.5 text-[#B29261]" />
            <span>Export Report (CSV)</span>
          </button>
        </div>
      </div>

      {/* Report Switcher Tabs */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setReportType('weekly')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center space-x-2 ${
            reportType === 'weekly'
              ? 'bg-[#192B16] text-[#FEFCF7] shadow-xs'
              : 'bg-[#FEFCF7] border border-[#E8E2D3] text-stone-600 hover:text-stone-900'
          }`}
        >
          <Target className="w-3.5 h-3.5 text-[#B29261]" />
          <span>Weekly 18h Contribution Report</span>
        </button>

        <button
          onClick={() => setReportType('daily')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center space-x-2 ${
            reportType === 'daily'
              ? 'bg-[#192B16] text-[#FEFCF7] shadow-xs'
              : 'bg-[#FEFCF7] border border-[#E8E2D3] text-stone-600 hover:text-stone-900'
          }`}
        >
          <Calendar className="w-3.5 h-3.5 text-[#B29261]" />
          <span>Daily 3h Threshold Report</span>
        </button>

        <button
          onClick={() => setReportType('below_target')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center space-x-2 ${
            reportType === 'below_target'
              ? 'bg-[#192B16] text-[#FEFCF7] shadow-xs'
              : 'bg-[#FEFCF7] border border-[#E8E2D3] text-stone-600 hover:text-stone-900'
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
          <span>Below-Target Deficit Report</span>
        </button>

        <button
          onClick={() => setReportType('missing_logs')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center space-x-2 ${
            reportType === 'missing_logs'
              ? 'bg-[#192B16] text-[#FEFCF7] shadow-xs'
              : 'bg-[#FEFCF7] border border-[#E8E2D3] text-stone-600 hover:text-stone-900'
          }`}
        >
          <FileWarning className="w-3.5 h-3.5 text-rose-600" />
          <span>Missing Daily Submissions</span>
        </button>
      </div>

      {/* Main Report Table Container */}
      <div className="bg-[#FEFCF7] border border-[#E8E2D3] rounded-2xl p-6 shadow-xs">
        {/* Weekly View */}
        {reportType === 'weekly' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-sm text-[#192B16]">
                Weekly Working Hours Summary (Target: 18.0h Mon - Sat)
              </h3>
              <span className="text-xs text-stone-500">{employeeSummaries.length} R&D members</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#E8E2D3] text-stone-500 uppercase text-[10px] tracking-wider">
                    <th className="pb-3 font-semibold">Employee</th>
                    <th className="pb-3 font-semibold">Weekly Logged Time</th>
                    <th className="pb-3 font-semibold">Target Progress (18h)</th>
                    <th className="pb-3 font-semibold">Remaining Hours</th>
                    <th className="pb-3 font-semibold">Compliance Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8E2D3]/60">
                  {employeeSummaries.map((emp) => {
                    const pct = Math.min(100, Math.round((emp.totalWeeklySecs / 64800) * 100));
                    return (
                      <tr key={emp.uid} className="hover:bg-[#F7F4EC]/40">
                        <td className="py-3 font-bold text-[#192B16]">
                          {emp.name}
                          <span className="block text-[10px] text-stone-400 font-normal">{emp.jobTitle}</span>
                        </td>
                        <td className="py-3 font-mono font-bold text-stone-900 text-sm">
                          {formatDuration(emp.totalWeeklySecs, 'short')}
                        </td>
                        <td className="py-3">
                          <div className="w-32 bg-[#E8E2D3]/60 h-2 rounded-full overflow-hidden inline-block mr-2 align-middle">
                            <div
                              className={`h-full ${emp.weeklyTargetMet ? 'bg-emerald-600' : 'bg-[#B29261]'}`}
                              style={{ width: `${pct}%` }}
                            ></div>
                          </div>
                          <span className="font-mono text-stone-600 text-[11px] font-semibold">{pct}%</span>
                        </td>
                        <td className="py-3 font-mono text-stone-600">
                          {emp.weeklyTargetMet ? (
                            <span className="text-emerald-700 font-bold">Fulfilled</span>
                          ) : (
                            formatDuration(64800 - emp.totalWeeklySecs, 'short')
                          )}
                        </td>
                        <td className="py-3">
                          {emp.weeklyTargetMet ? (
                            <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                              Target Met
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold text-stone-700 bg-stone-100 px-2 py-0.5 rounded">
                              In Progress
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Daily Compliance View */}
        {reportType === 'daily' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-sm text-[#192B16]">
                Daily 3-Hour Minimum Compliance ({formatDate(today)})
              </h3>
              <span className="text-xs text-stone-500">Live operational snapshot</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#E8E2D3] text-stone-500 uppercase text-[10px] tracking-wider">
                    <th className="pb-3 font-semibold">Employee</th>
                    <th className="pb-3 font-semibold">Today's Attendance Status</th>
                    <th className="pb-3 font-semibold">Today Productive Hours</th>
                    <th className="pb-3 font-semibold">3-Hour Requirement</th>
                    <th className="pb-3 font-semibold">Work Log Submission</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8E2D3]/60">
                  {employeeSummaries.map((emp) => (
                    <tr key={emp.uid} className="hover:bg-[#F7F4EC]/40">
                      <td className="py-3 font-bold text-[#192B16]">{emp.name}</td>
                      <td className="py-3 capitalize text-stone-700 font-medium">
                        {emp.todayStatus.replace('_', ' ')}
                      </td>
                      <td className="py-3 font-mono font-bold text-stone-900 text-sm">
                        {formatDuration(emp.todayWorkingSecs, 'short')}
                      </td>
                      <td className="py-3">
                        {emp.dailyTargetMet ? (
                          <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded flex items-center w-max">
                            <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-600" /> Target Met
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded flex items-center w-max">
                            <AlertTriangle className="w-3 h-3 mr-1 text-amber-600" />
                            {formatDuration(10800 - emp.todayWorkingSecs, 'short')} Remaining
                          </span>
                        )}
                      </td>
                      <td className="py-3">
                        {emp.hasTodayLog ? (
                          <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                            Submitted
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-rose-800 bg-rose-100 px-2 py-0.5 rounded">
                            Missing
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Below-Target Report View */}
        {reportType === 'below_target' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-sm text-[#192B16]">
                Below Daily Target (Deficit Audit)
              </h3>
              <span className="text-xs text-amber-700 font-semibold">
                Employees with less than 3.0h productive hours today
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#E8E2D3] text-stone-500 uppercase text-[10px] tracking-wider">
                    <th className="pb-3 font-semibold">Employee</th>
                    <th className="pb-3 font-semibold">Current Hours Logged</th>
                    <th className="pb-3 font-semibold">Deficit to 3h Policy</th>
                    <th className="pb-3 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8E2D3]/60">
                  {employeeSummaries
                    .filter((e) => !e.dailyTargetMet)
                    .map((emp) => (
                      <tr key={emp.uid} className="hover:bg-[#F7F4EC]/40">
                        <td className="py-3 font-bold text-[#192B16]">{emp.name}</td>
                        <td className="py-3 font-mono font-bold text-stone-800">
                          {formatDuration(emp.todayWorkingSecs, 'short')}
                        </td>
                        <td className="py-3 font-mono font-bold text-amber-800">
                          -{formatDuration(10800 - emp.todayWorkingSecs, 'short')}
                        </td>
                        <td className="py-3 capitalize text-stone-500">
                          {emp.todayStatus.replace('_', ' ')}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Missing Submissions Report View */}
        {reportType === 'missing_logs' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-sm text-[#192B16]">
                Missing Daily Work Log Submissions
              </h3>
              <span className="text-xs text-rose-700 font-semibold">
                Employees active today who have not submitted their end-of-day work log
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#E8E2D3] text-stone-500 uppercase text-[10px] tracking-wider">
                    <th className="pb-3 font-semibold">Employee Name</th>
                    <th className="pb-3 font-semibold">Email</th>
                    <th className="pb-3 font-semibold">Attendance State</th>
                    <th className="pb-3 font-semibold">Logged Hours</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8E2D3]/60">
                  {employeeSummaries
                    .filter((e) => !e.hasTodayLog && e.todayStatus !== 'absent')
                    .map((emp) => (
                      <tr key={emp.uid} className="hover:bg-[#F7F4EC]/40">
                        <td className="py-3 font-bold text-[#192B16]">{emp.name}</td>
                        <td className="py-3 font-mono text-stone-500">{emp.email}</td>
                        <td className="py-3 capitalize text-amber-700 font-semibold">
                          {emp.todayStatus.replace('_', ' ')}
                        </td>
                        <td className="py-3 font-mono font-bold text-stone-800">
                          {formatDuration(emp.todayWorkingSecs, 'short')}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
