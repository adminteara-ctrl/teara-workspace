import React, { useState } from 'react';
import {
  History,
  Download,
  Calendar,
  Building2,
  Laptop,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { AttendanceRecord } from '../../types';
import { formatDuration, formatDate, formatTime, exportToCSV } from '../../lib/utils';

interface EmployeeHistoryViewProps {
  attendanceHistory: AttendanceRecord[];
}

export const EmployeeHistoryView: React.FC<EmployeeHistoryViewProps> = ({
  attendanceHistory,
}) => {
  const { currentUser } = useAuth();
  const [filterMode, setFilterMode] = useState<'all' | 'office' | 'home'>('all');

  const filtered = attendanceHistory.filter((item) => {
    if (filterMode === 'all') return true;
    return item.workMode === filterMode;
  });

  const totalSeconds = filtered.reduce((acc, c) => acc + (c.totalWorkingSeconds || 0), 0);
  const totalBreaks = filtered.reduce((acc, c) => acc + (c.totalBreakSeconds || 0), 0);
  const targetMetCount = filtered.filter((c) => c.totalWorkingSeconds >= 10800).length;

  const handleExport = () => {
    const rows = filtered.map((rec) => ({
      Date: rec.workDate,
      WorkMode: rec.workMode,
      FirstLogin: formatTime(rec.firstCheckIn),
      LastLogout: formatTime(rec.lastCheckOut),
      ProductiveSeconds: rec.totalWorkingSeconds,
      ProductiveHoursFormatted: formatDuration(rec.totalWorkingSeconds, 'short'),
      BreakSeconds: rec.totalBreakSeconds,
      BreakHoursFormatted: formatDuration(rec.totalBreakSeconds, 'short'),
      TargetStatus: rec.totalWorkingSeconds >= 10800 ? 'Target Achieved' : 'Below 3h Target',
    }));
    exportToCSV(`Teara_Attendance_${currentUser?.name.replace(/\s+/g, '_')}`, rows);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E8E2D3] pb-4">
        <div>
          <h1 className="text-xl font-bold text-[#192B16] flex items-center">
            <History className="w-5 h-5 text-[#B29261] mr-2" />
            My Attendance History & Records
          </h1>
          <p className="text-xs text-stone-600 mt-1">
            Date-wise contribution records, work mode breakdown, and target compliance audit.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <select
            value={filterMode}
            onChange={(e) => setFilterMode(e.target.value as any)}
            className="px-3 py-1.5 text-xs bg-[#F7F4EC] border border-[#E8E2D3] rounded-lg text-stone-700 focus:outline-none focus:ring-1 focus:ring-[#B29261]"
          >
            <option value="all">All Work Modes</option>
            <option value="office">Work From Office</option>
            <option value="home">Work From Home</option>
          </select>

          <button
            onClick={handleExport}
            className="flex items-center space-x-1.5 bg-[#192B16] hover:bg-[#243E20] text-[#FEFCF7] px-3.5 py-1.5 rounded-lg text-xs font-semibold shadow-xs transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-[#B29261]" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[#FEFCF7] border border-[#E8E2D3] rounded-xl p-4 shadow-xs">
          <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider block">
            Total Logged Work
          </span>
          <span className="text-2xl font-black font-mono text-[#192B16] mt-1 block">
            {formatDuration(totalSeconds, 'short')}
          </span>
          <span className="text-[11px] text-stone-500 mt-0.5 block">
            Across {filtered.length} recorded working sessions
          </span>
        </div>

        <div className="bg-[#FEFCF7] border border-[#E8E2D3] rounded-xl p-4 shadow-xs">
          <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider block">
            Target Compliance Rate
          </span>
          <span className="text-2xl font-black font-mono text-emerald-800 mt-1 block">
            {filtered.length > 0 ? Math.round((targetMetCount / filtered.length) * 100) : 0}%
          </span>
          <span className="text-[11px] text-stone-500 mt-0.5 block">
            {targetMetCount} of {filtered.length} days met 3.0h target
          </span>
        </div>

        <div className="bg-[#FEFCF7] border border-[#E8E2D3] rounded-xl p-4 shadow-xs">
          <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider block">
            Total Break Time
          </span>
          <span className="text-2xl font-black font-mono text-amber-800 mt-1 block">
            {formatDuration(totalBreaks, 'short')}
          </span>
          <span className="text-[11px] text-stone-500 mt-0.5 block">
            Properly deducted from productive hours
          </span>
        </div>
      </div>

      {/* Main Records Table */}
      <div className="bg-[#FEFCF7] border border-[#E8E2D3] rounded-2xl p-6 shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#E8E2D3] text-stone-500 uppercase text-[10px] tracking-wider">
                <th className="pb-3 font-semibold">Date</th>
                <th className="pb-3 font-semibold">Mode</th>
                <th className="pb-3 font-semibold">First Login</th>
                <th className="pb-3 font-semibold">Last Logout</th>
                <th className="pb-3 font-semibold">Break Duration</th>
                <th className="pb-3 font-semibold">Net Productive Hours</th>
                <th className="pb-3 font-semibold">Daily 3h Policy</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8E2D3]/60">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-stone-400 text-xs">
                    No attendance records found. Once you check in and record hours, your complete date-wise logs will appear here.
                  </td>
                </tr>
              ) : (
                filtered.map((rec) => {
                  const met = rec.totalWorkingSeconds >= 10800;
                  return (
                    <tr key={rec.attendanceId} className="hover:bg-[#F7F4EC]/40">
                    <td className="py-3 font-semibold text-stone-800">{formatDate(rec.workDate)}</td>
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
                    <td className="py-3 font-bold font-mono text-stone-900">
                      {formatDuration(rec.totalWorkingSeconds, 'short')}
                    </td>
                    <td className="py-3">
                      {met ? (
                        <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                          Target Achieved
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded">
                          Below Target
                        </span>
                      )}
                    </td>
                  </tr>
                );
              }))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
