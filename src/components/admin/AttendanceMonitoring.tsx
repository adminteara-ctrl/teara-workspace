import React, { useState } from 'react';
import {
  CalendarCheck,
  Search,
  Filter,
  Download,
  Building2,
  Laptop,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Check,
  X,
  FileEdit,
} from 'lucide-react';
import { AttendanceRecord, CorrectionRequest } from '../../types';
import { formatDuration, formatDate, formatTime, exportToCSV } from '../../lib/utils';
import { attendanceService } from '../../services/attendanceService';

interface AttendanceMonitoringProps {
  allAttendance: AttendanceRecord[];
  correctionRequests: CorrectionRequest[];
  onRefreshData: () => void;
}

export const AttendanceMonitoring: React.FC<AttendanceMonitoringProps> = ({
  allAttendance,
  correctionRequests,
  onRefreshData,
}) => {
  const [activeTab, setActiveTab] = useState<'sheet' | 'corrections'>('sheet');
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [modeFilter, setModeFilter] = useState('all');
  const [targetFilter, setTargetFilter] = useState('all');
  const [selectedCorrection, setSelectedCorrection] = useState<CorrectionRequest | null>(null);
  const [reviewComment, setReviewComment] = useState('');
  const [adjustedHours, setAdjustedHours] = useState<number>(10800);
  const [reviewing, setReviewing] = useState(false);

  const filtered = allAttendance.filter((rec) => {
    const matchesEmployee =
      rec.employeeName.toLowerCase().includes(employeeSearch.toLowerCase()) ||
      rec.employeeEmail.toLowerCase().includes(employeeSearch.toLowerCase());
    const matchesMode = modeFilter === 'all' || rec.workMode === modeFilter;
    const met = rec.totalWorkingSeconds >= 10800;
    const matchesTarget =
      targetFilter === 'all' ||
      (targetFilter === 'met' && met) ||
      (targetFilter === 'below' && !met);

    return matchesEmployee && matchesMode && matchesTarget;
  });

  const handleExport = () => {
    const rows = filtered.map((rec) => ({
      EmployeeName: rec.employeeName,
      Email: rec.employeeEmail,
      Date: rec.workDate,
      WorkMode: rec.workMode,
      LoginTime: formatTime(rec.firstCheckIn),
      LogoutTime: formatTime(rec.lastCheckOut),
      BreakDuration: formatDuration(rec.totalBreakSeconds, 'short'),
      ActualWorkingSeconds: rec.totalWorkingSeconds,
      ActualWorkingHours: formatDuration(rec.totalWorkingSeconds, 'short'),
      DailyTargetStatus: rec.totalWorkingSeconds >= 10800 ? 'Met (>=3h)' : 'Below Target (<3h)',
      AttendanceStatus: rec.status,
    }));
    exportToCSV(`Teara_Attendance_Master_${Date.now()}`, rows);
  };

  const handleReviewCorrection = async (status: 'approved' | 'rejected') => {
    if (!selectedCorrection) return;
    setReviewing(true);
    try {
      await attendanceService.reviewCorrectionRequest(
        selectedCorrection.requestId,
        'Dr. Alistair Sterling (Admin)',
        status,
        reviewComment || (status === 'approved' ? 'Approved based on lab verification.' : 'Adjustment rejected.'),
        status === 'approved' ? adjustedHours : undefined
      );
      setSelectedCorrection(null);
      setReviewComment('');
      onRefreshData();
    } catch (err) {
      console.error(err);
    } finally {
      setReviewing(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E8E2D3] pb-4">
        <div>
          <h1 className="text-xl font-bold text-[#192B16] flex items-center">
            <CalendarCheck className="w-5 h-5 text-[#B29261] mr-2" />
            Attendance Monitoring & Audit Console
          </h1>
          <p className="text-xs text-stone-600 mt-1">
            Date-wise records, office vs remote distribution, 3-hour minimum policy tracking, and correction reviews.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <div className="flex items-center bg-[#F7F4EC] p-1 rounded-xl border border-[#E8E2D3]">
            <button
              onClick={() => setActiveTab('sheet')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'sheet'
                  ? 'bg-[#192B16] text-[#FEFCF7] shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Master Sheet ({filtered.length})
            </button>
            <button
              onClick={() => setActiveTab('corrections')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'corrections'
                  ? 'bg-[#192B16] text-[#FEFCF7] shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Correction Requests ({correctionRequests.length})
            </button>
          </div>

          <button
            onClick={handleExport}
            className="flex items-center space-x-1.5 bg-[#192B16] hover:bg-[#243E20] text-[#FEFCF7] px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-sm"
          >
            <Download className="w-3.5 h-3.5 text-[#B29261]" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {activeTab === 'sheet' && (
        <>
          {/* Filters Bar */}
          <div className="bg-[#FEFCF7] border border-[#E8E2D3] rounded-2xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center space-x-2 flex-1 min-w-[200px]">
              <Search className="w-4 h-4 text-stone-400" />
              <input
                type="text"
                placeholder="Search by employee name or email..."
                value={employeeSearch}
                onChange={(e) => setEmployeeSearch(e.target.value)}
                className="w-full bg-transparent focus:outline-none text-stone-800"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center space-x-1.5">
                <span className="text-stone-500 font-semibold">Mode:</span>
                <select
                  value={modeFilter}
                  onChange={(e) => setModeFilter(e.target.value)}
                  className="bg-[#F7F4EC] border border-[#E8E2D3] rounded-lg px-2.5 py-1 text-stone-700 focus:outline-none"
                >
                  <option value="all">All Modes</option>
                  <option value="office">Office</option>
                  <option value="home">Home</option>
                </select>
              </div>

              <div className="flex items-center space-x-1.5">
                <span className="text-stone-500 font-semibold">Target:</span>
                <select
                  value={targetFilter}
                  onChange={(e) => setTargetFilter(e.target.value)}
                  className="bg-[#F7F4EC] border border-[#E8E2D3] rounded-lg px-2.5 py-1 text-stone-700 focus:outline-none"
                >
                  <option value="all">All Compliance</option>
                  <option value="met">Met 3h Target</option>
                  <option value="below">Below 3h Target</option>
                </select>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="bg-[#FEFCF7] border border-[#E8E2D3] rounded-2xl p-6 shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#E8E2D3] text-stone-500 uppercase text-[10px] tracking-wider">
                    <th className="pb-3 font-semibold">Employee</th>
                    <th className="pb-3 font-semibold">Date</th>
                    <th className="pb-3 font-semibold">Mode</th>
                    <th className="pb-3 font-semibold">Login</th>
                    <th className="pb-3 font-semibold">Logout</th>
                    <th className="pb-3 font-semibold">Break Duration</th>
                    <th className="pb-3 font-semibold">Actual Working Time</th>
                    <th className="pb-3 font-semibold">Target Status</th>
                    <th className="pb-3 font-semibold">Current State</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8E2D3]/60">
                  {filtered.map((rec) => {
                    const met = rec.totalWorkingSeconds >= 10800;
                    return (
                      <tr key={rec.attendanceId} className="hover:bg-[#F7F4EC]/40">
                        <td className="py-3">
                          <span className="font-bold text-[#192B16] block">{rec.employeeName}</span>
                          <span className="text-stone-400 text-[10px]">{rec.employeeEmail}</span>
                        </td>
                        <td className="py-3 font-medium text-stone-700">{formatDate(rec.workDate)}</td>
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
                        <td className="py-3 font-bold font-mono text-stone-900 text-sm">
                          {formatDuration(rec.totalWorkingSeconds, 'short')}
                        </td>
                        <td className="py-3">
                          {met ? (
                            <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded flex items-center w-max">
                              <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-600" /> Met Target
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded flex items-center w-max">
                              <AlertTriangle className="w-3 h-3 mr-1 text-amber-600" /> Below Target
                            </span>
                          )}
                        </td>
                        <td className="py-3 capitalize text-stone-500 text-[11px]">
                          {rec.status.replace('_', ' ')}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Corrections Management Tab */}
      {activeTab === 'corrections' && (
        <div className="bg-[#FEFCF7] border border-[#E8E2D3] rounded-2xl p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-sm text-[#192B16]">Submitted Attendance Correction Requests</h3>
            <span className="text-xs text-stone-500">
              {correctionRequests.filter((c) => c.approvalStatus === 'pending').length} pending approval
            </span>
          </div>

          <div className="space-y-3">
            {correctionRequests.map((req) => (
              <div
                key={req.requestId}
                className="p-4 rounded-xl border border-[#E8E2D3] bg-[#F7F4EC]/40 flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-1 text-xs">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-[#192B16] text-sm">{req.employeeName}</span>
                    <span className="text-stone-400">•</span>
                    <span className="font-medium text-stone-700">Date: {formatDate(req.workDate)}</span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                        req.approvalStatus === 'approved'
                          ? 'bg-emerald-100 text-emerald-800'
                          : req.approvalStatus === 'rejected'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {req.approvalStatus}
                    </span>
                  </div>
                  <p className="text-stone-800">
                    <span className="font-semibold">Requested adjustment:</span> {req.requestedChanges}
                  </p>
                  <p className="text-stone-600">
                    <span className="font-semibold">Reason provided:</span> {req.reason}
                  </p>
                  {req.reviewComment && (
                    <div className="mt-1 text-[11px] text-stone-600 bg-white p-2 rounded border border-[#E8E2D3]">
                      <span className="font-semibold text-stone-800">Admin Feedback:</span> {req.reviewComment}
                    </div>
                  )}
                </div>

                {req.approvalStatus === 'pending' && (
                  <button
                    onClick={() => {
                      setSelectedCorrection(req);
                      setReviewComment('Approved based on verified laboratory attendance.');
                    }}
                    className="px-4 py-2 bg-[#192B16] text-[#FEFCF7] hover:bg-[#243E20] text-xs font-bold rounded-lg transition-colors shrink-0"
                  >
                    Review Request
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Review Dialog */}
      {selectedCorrection && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-[#FEFCF7] rounded-2xl border border-[#E8E2D3] p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-base font-bold text-[#192B16]">
              Review Attendance Correction
            </h3>
            <p className="text-xs text-stone-600 mt-1">
              Audit the employee's request and approve or reject the timestamp modification.
            </p>

            <div className="mt-4 p-3 bg-[#F7F4EC] rounded-xl border border-[#E8E2D3] text-xs space-y-1">
              <div>
                <span className="text-stone-500 font-semibold">Employee:</span> {selectedCorrection.employeeName}
              </div>
              <div>
                <span className="text-stone-500 font-semibold">Work Date:</span> {formatDate(selectedCorrection.workDate)}
              </div>
              <div>
                <span className="text-stone-500 font-semibold">Requested:</span> {selectedCorrection.requestedChanges}
              </div>
              <div>
                <span className="text-stone-500 font-semibold">Reason:</span> {selectedCorrection.reason}
              </div>
            </div>

            <div className="mt-4 space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-stone-700 mb-1">
                  Corrected Working Hours (Seconds if approved)
                </label>
                <input
                  type="number"
                  value={adjustedHours}
                  onChange={(e) => setAdjustedHours(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg border border-stone-300 bg-white focus:outline-none focus:ring-1 focus:ring-[#B29261]"
                />
                <span className="text-[10px] text-stone-500 mt-0.5 block">
                  10800s = 3.0 hours • 12600s = 3.5 hours
                </span>
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">
                  Administrative Review Comment / Audit Note
                </label>
                <textarea
                  rows={2}
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder="Reason for approval or rejection..."
                  className="w-full px-3 py-2 rounded-lg border border-stone-300 bg-white focus:outline-none focus:ring-1 focus:ring-[#B29261]"
                />
              </div>
            </div>

            <div className="mt-6 flex space-x-2 justify-end">
              <button
                type="button"
                onClick={() => setSelectedCorrection(null)}
                className="px-3 py-2 text-xs font-medium text-stone-600 hover:bg-stone-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={reviewing}
                onClick={() => handleReviewCorrection('rejected')}
                className="px-3.5 py-2 text-xs font-bold bg-rose-600 text-white hover:bg-rose-700 rounded-lg transition-colors"
              >
                Reject Request
              </button>
              <button
                type="button"
                disabled={reviewing}
                onClick={() => handleReviewCorrection('approved')}
                className="px-4 py-2 text-xs font-bold bg-[#192B16] text-[#FEFCF7] hover:bg-[#243E20] rounded-lg transition-colors shadow-sm"
              >
                Approve & Update Attendance
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
