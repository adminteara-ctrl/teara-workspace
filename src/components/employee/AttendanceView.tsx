import React, { useState } from 'react';
import {
  Clock,
  Play,
  Square,
  Coffee,
  Building2,
  Laptop,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Calendar,
  Send,
  History,
  FileEdit,
  ArrowUpRight,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { AttendanceRecord, WorkMode, CorrectionRequest } from '../../types';
import { formatDuration, formatDate, formatTime, getTodayDateString } from '../../lib/utils';
import { attendanceService } from '../../services/attendanceService';

interface AttendanceViewProps {
  todayAttendance: AttendanceRecord | null;
  attendanceHistory: AttendanceRecord[];
  correctionRequests: CorrectionRequest[];
  onCheckIn: (mode: WorkMode) => void;
  onStartBreak: () => void;
  onEndBreak: () => void;
  onCheckOut: () => void;
  onRefreshData: () => void;
}

export const AttendanceView: React.FC<AttendanceViewProps> = ({
  todayAttendance,
  attendanceHistory,
  correctionRequests,
  onCheckIn,
  onStartBreak,
  onEndBreak,
  onCheckOut,
  onRefreshData,
}) => {
  const { currentUser } = useAuth();
  const [selectedWorkMode, setSelectedWorkMode] = useState<WorkMode>(
    todayAttendance?.workMode || 'office'
  );
  const [showCorrectionModal, setShowCorrectionModal] = useState(false);
  const [correctionDate, setCorrectionDate] = useState(getTodayDateString());
  const [correctionChanges, setCorrectionChanges] = useState('');
  const [correctionReason, setCorrectionReason] = useState('');
  const [submittingCorrection, setSubmittingCorrection] = useState(false);
  const [activeTab, setActiveTab] = useState<'console' | 'history' | 'corrections'>('console');
  const [breakReason, setBreakReason] = useState('');
  const [showBreakModal, setShowBreakModal] = useState(false);

  const isCheckedIn = todayAttendance?.status === 'checked_in';
  const isOnBreak = todayAttendance?.status === 'on_break';
  const isCheckedOut = !todayAttendance || todayAttendance.status === 'checked_out';

  const dailyTargetMet = (todayAttendance?.totalWorkingSeconds || 0) >= 10800;

  const handleCorrectionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !correctionChanges || !correctionReason) return;
    setSubmittingCorrection(true);
    try {
      await attendanceService.submitCorrectionRequest(
        currentUser.uid,
        currentUser.name,
        todayAttendance?.attendanceId || `att_${currentUser.uid}_${correctionDate}`,
        correctionDate,
        correctionChanges,
        correctionReason
      );
      setShowCorrectionModal(false);
      setCorrectionChanges('');
      setCorrectionReason('');
      onRefreshData();
    } catch (err) {
      console.error('Error submitting correction:', err);
    } finally {
      setSubmittingCorrection(false);
    }
  };

  const handleStartBreakConfirm = () => {
    setShowBreakModal(false);
    onStartBreak();
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header Title & Subtabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E8E2D3] pb-4">
        <div>
          <h1 className="text-xl font-bold text-[#192B16] flex items-center">
            <Clock className="w-5 h-5 text-[#B29261] mr-2" />
            Attendance & Working Hours Management
          </h1>
          <p className="text-xs text-stone-600 mt-1">
            Check-in/out console, hybrid work-mode selector, break tracking, and correction requests.
          </p>
        </div>

        <div className="flex items-center space-x-2 bg-[#F7F4EC] p-1 rounded-xl border border-[#E8E2D3]">
          <button
            onClick={() => setActiveTab('console')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'console'
                ? 'bg-[#192B16] text-[#FEFCF7] shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            Clock Console
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'history'
                ? 'bg-[#192B16] text-[#FEFCF7] shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            Attendance Logs ({attendanceHistory.length})
          </button>
          <button
            onClick={() => setActiveTab('corrections')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'corrections'
                ? 'bg-[#192B16] text-[#FEFCF7] shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            Corrections ({correctionRequests.length})
          </button>
        </div>
      </div>

      {activeTab === 'console' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Clock-in Controller */}
          <div className="lg:col-span-2 bg-[#FEFCF7] border border-[#E8E2D3] rounded-2xl p-6 shadow-xs">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-base font-bold text-[#192B16]">Today's Active Session</h3>
                <p className="text-xs text-stone-500">
                  {formatDate(getTodayDateString())} • Policy: 3 hours actual productive work required
                </p>
              </div>

              {/* Status Badge */}
              {isCheckedIn ? (
                <span className="flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span>Checked In (Recording)</span>
                </span>
              ) : isOnBreak ? (
                <span className="flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
                  <Coffee className="w-3.5 h-3.5 text-amber-600" />
                  <span>On Break (Paused)</span>
                </span>
              ) : (
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-stone-100 text-stone-700 border border-stone-300">
                  Checked Out
                </span>
              )}
            </div>

            {/* Time Metrics Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <div className="bg-[#F7F4EC] p-4 rounded-xl border border-[#E8E2D3]">
                <div className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider">
                  Productive Work Time
                </div>
                <div className="text-2xl font-black font-mono text-[#192B16] mt-1">
                  {formatDuration(todayAttendance?.totalWorkingSeconds || 0, 'hms')}
                </div>
                <div className="text-[10px] text-stone-500 mt-1">
                  Target: 3h minimum
                </div>
              </div>

              <div className="bg-[#F7F4EC] p-4 rounded-xl border border-[#E8E2D3]">
                <div className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider">
                  Break Duration
                </div>
                <div className="text-2xl font-black font-mono text-amber-800 mt-1">
                  {formatDuration(todayAttendance?.totalBreakSeconds || 0, 'hms')}
                </div>
                <div className="text-[10px] text-stone-500 mt-1">
                  Breaks do not count to target
                </div>
              </div>

              <div className="bg-[#F7F4EC] p-4 rounded-xl border border-[#E8E2D3]">
                <div className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider">
                  Target Compliance
                </div>
                <div className="text-base font-bold mt-1.5">
                  {dailyTargetMet ? (
                    <span className="text-emerald-700 flex items-center">
                      <CheckCircle2 className="w-4 h-4 mr-1 text-emerald-600" /> Target Met
                    </span>
                  ) : (
                    <span className="text-amber-700 flex items-center">
                      <AlertCircle className="w-4 h-4 mr-1 text-amber-600" />
                      {formatDuration(10800 - (todayAttendance?.totalWorkingSeconds || 0), 'short')} left
                    </span>
                  )}
                </div>
                <div className="text-[10px] text-stone-500 mt-1">
                  Daily requirement: 3.0h
                </div>
              </div>
            </div>

            {/* Work Mode Selector (for check-in) */}
            {isCheckedOut && (
              <div className="mb-6">
                <label className="block text-xs font-bold text-[#192B16] mb-2 uppercase tracking-wider">
                  Select Work Mode For This Session:
                </label>
                <div className="grid grid-cols-2 gap-3 max-w-md">
                  <button
                    type="button"
                    onClick={() => setSelectedWorkMode('office')}
                    className={`flex items-center space-x-3 p-3 rounded-xl border text-left transition-all ${
                      selectedWorkMode === 'office'
                        ? 'border-[#B29261] bg-[#F7EFE1] shadow-xs'
                        : 'border-[#E8E2D3] bg-[#FEFCF7] hover:border-stone-400'
                    }`}
                  >
                    <Building2
                      className={`w-5 h-5 ${
                        selectedWorkMode === 'office' ? 'text-[#B29261]' : 'text-stone-400'
                      }`}
                    />
                    <div>
                      <div className="text-xs font-bold text-[#192B16]">Work From Office</div>
                      <div className="text-[10px] text-stone-500">Teara R&D Lab / Facility</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedWorkMode('home')}
                    className={`flex items-center space-x-3 p-3 rounded-xl border text-left transition-all ${
                      selectedWorkMode === 'home'
                        ? 'border-[#B29261] bg-[#F7EFE1] shadow-xs'
                        : 'border-[#E8E2D3] bg-[#FEFCF7] hover:border-stone-400'
                    }`}
                  >
                    <Laptop
                      className={`w-5 h-5 ${
                        selectedWorkMode === 'home' ? 'text-[#B29261]' : 'text-stone-400'
                      }`}
                    />
                    <div>
                      <div className="text-xs font-bold text-[#192B16]">Work From Home</div>
                      <div className="text-[10px] text-stone-500">Remote Workstation</div>
                    </div>
                  </button>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-[#E8E2D3]">
              {isCheckedOut ? (
                <button
                  onClick={() => onCheckIn(selectedWorkMode)}
                  className="flex items-center space-x-2 bg-[#192B16] hover:bg-[#243E20] text-[#FEFCF7] px-6 py-3 rounded-xl text-sm font-bold shadow-sm transition-all"
                >
                  <Play className="w-4 h-4 text-[#B29261]" />
                  <span>Check In ({selectedWorkMode === 'office' ? 'Office' : 'Home'})</span>
                </button>
              ) : isCheckedIn ? (
                <>
                  <button
                    onClick={() => setShowBreakModal(true)}
                    className="flex items-center space-x-2 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 px-5 py-2.5 rounded-xl text-xs font-bold transition-all"
                  >
                    <Coffee className="w-4 h-4 text-amber-600" />
                    <span>Start Break</span>
                  </button>
                  <button
                    onClick={onCheckOut}
                    className="flex items-center space-x-2 bg-stone-100 hover:bg-stone-200 text-stone-800 border border-stone-300 px-5 py-2.5 rounded-xl text-xs font-bold transition-all"
                  >
                    <Square className="w-4 h-4 text-red-600" />
                    <span>Check Out</span>
                  </button>
                </>
              ) : (
                /* isOnBreak */
                <>
                  <button
                    onClick={onEndBreak}
                    className="flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-xl text-sm font-bold shadow-sm animate-pulse transition-all"
                  >
                    <Play className="w-4 h-4" />
                    <span>End Break & Resume Work</span>
                  </button>
                  <button
                    onClick={() => {
                      if (window.confirm('You have an active break. Checking out now will finalize your break and calculate total net hours. Proceed?')) {
                        onCheckOut();
                      }
                    }}
                    className="flex items-center space-x-2 bg-stone-100 hover:bg-stone-200 text-stone-800 border border-stone-300 px-5 py-2.5 rounded-xl text-xs font-bold transition-all"
                  >
                    <Square className="w-4 h-4 text-red-600" />
                    <span>End Break & Check Out</span>
                  </button>
                </>
              )}

              <button
                type="button"
                onClick={() => setShowCorrectionModal(true)}
                className="ml-auto text-xs text-[#B29261] hover:text-[#917448] font-semibold flex items-center space-x-1"
              >
                <FileEdit className="w-3.5 h-3.5" />
                <span>Request Attendance Correction</span>
              </button>
            </div>
          </div>

          {/* Policy & Guidance Rules Card */}
          <div className="bg-[#FEFCF7] border border-[#E8E2D3] rounded-2xl p-6 shadow-xs flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-bold text-[#192B16] flex items-center mb-3">
                <HelpCircle className="w-4 h-4 text-[#B29261] mr-1.5" />
                Working-Hour Rules & Policy
              </h3>
              <ul className="space-y-3 text-xs text-stone-600">
                <li className="flex items-start">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#B29261] mt-1.5 mr-2 shrink-0"></span>
                  <span>
                    <strong>Daily Target:</strong> 3.0 hours of actual productive working time are required per working day.
                  </span>
                </li>
                <li className="flex items-start">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#B29261] mt-1.5 mr-2 shrink-0"></span>
                  <span>
                    <strong>Break Deductions:</strong> Break durations are tracked separately and deducted from working time.
                  </span>
                </li>
                <li className="flex items-start">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#B29261] mt-1.5 mr-2 shrink-0"></span>
                  <span>
                    <strong>Weekly Target:</strong> 18.0 hours across Monday to Saturday. Sundays are weekly off.
                  </span>
                </li>
                <li className="flex items-start">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#B29261] mt-1.5 mr-2 shrink-0"></span>
                  <span>
                    <strong>Work Logs:</strong> Daily log submission with Jira references is mandatory prior to final checkout.
                  </span>
                </li>
              </ul>
            </div>

            <div className="mt-6 p-3 bg-[#F7F4EC] rounded-xl border border-[#E8E2D3] text-[11px] text-stone-600">
              <span className="font-semibold text-stone-800">Need timestamp corrections?</span> Historical edits require administrative review through the Correction Request workflow.
            </div>
          </div>
        </div>
      )}

      {/* History Subtab */}
      {activeTab === 'history' && (
        <div className="bg-[#FEFCF7] border border-[#E8E2D3] rounded-2xl p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-sm text-[#192B16]">Historical Attendance Sheet</h3>
            <span className="text-xs text-stone-500">{attendanceHistory.length} recorded days</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#E8E2D3] text-stone-500 uppercase text-[10px] tracking-wider">
                  <th className="pb-3 font-semibold">Date</th>
                  <th className="pb-3 font-semibold">Mode</th>
                  <th className="pb-3 font-semibold">First Login</th>
                  <th className="pb-3 font-semibold">Last Logout</th>
                  <th className="pb-3 font-semibold">Breaks</th>
                  <th className="pb-3 font-semibold">Net Work Time</th>
                  <th className="pb-3 font-semibold">3h Target</th>
                  <th className="pb-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8E2D3]/60">
                {attendanceHistory.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-stone-400 text-xs">
                      No attendance sessions logged yet. Switch to the Clock Console tab to check in.
                    </td>
                  </tr>
                ) : attendanceHistory.map((rec) => {
                    const met = rec.totalWorkingSeconds >= 10800;
                    return (
                      <tr key={rec.attendanceId} className="hover:bg-[#F7F4EC]/40">
                      <td className="py-3 font-medium text-stone-800">{formatDate(rec.workDate)}</td>
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
                            Met Target
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded">
                            Below Target
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
      )}

      {/* Correction Requests Subtab */}
      {activeTab === 'corrections' && (
        <div className="bg-[#FEFCF7] border border-[#E8E2D3] rounded-2xl p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-sm text-[#192B16]">Attendance Correction Requests</h3>
              <p className="text-xs text-stone-500">
                Audit trail of submitted adjustments awaiting administrator approval.
              </p>
            </div>
            <button
              onClick={() => setShowCorrectionModal(true)}
              className="bg-[#192B16] text-[#FEFCF7] hover:bg-[#243E20] text-xs font-semibold px-3.5 py-2 rounded-lg transition-colors flex items-center space-x-1.5"
            >
              <FileEdit className="w-3.5 h-3.5 text-[#B29261]" />
              <span>New Correction Request</span>
            </button>
          </div>

          {correctionRequests.length === 0 ? (
            <div className="text-center py-8 text-stone-400 text-xs">
              No correction requests filed. If your check-in or out time had an irregularity, click "New Correction Request".
            </div>
          ) : (
            <div className="space-y-3">
              {correctionRequests.map((req) => (
                <div
                  key={req.requestId}
                  className="p-4 rounded-xl border border-[#E8E2D3] bg-[#F7F4EC]/40 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#192B16]">
                      Date: {formatDate(req.workDate)}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                        req.approvalStatus === 'approved'
                          ? 'bg-emerald-100 text-emerald-800'
                          : req.approvalStatus === 'rejected'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {req.approvalStatus}
                    </span>
                  </div>
                  <p className="text-xs text-stone-800">
                    <span className="font-semibold">Requested adjustment:</span> {req.requestedChanges}
                  </p>
                  <p className="text-xs text-stone-600">
                    <span className="font-semibold">Reason:</span> {req.reason}
                  </p>
                  {req.reviewComment && (
                    <div className="text-xs bg-white p-2.5 rounded border border-[#E8E2D3] text-stone-700">
                      <span className="font-semibold text-stone-800">Reviewed by {req.reviewedBy}:</span>{' '}
                      {req.reviewComment}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Start Break Dialog */}
      {showBreakModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-[#FEFCF7] rounded-xl border border-[#E8E2D3] p-6 max-w-sm w-full shadow-xl">
            <h3 className="text-base font-bold text-[#192B16] flex items-center">
              <Coffee className="w-5 h-5 text-amber-600 mr-2" />
              Take a Break
            </h3>
            <p className="text-xs text-stone-600 mt-1">
              Your active session will be paused. Break duration will not count toward the 3-hour minimum daily target.
            </p>

            <div className="mt-4">
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Reason / Note (Optional)
              </label>
              <input
                type="text"
                value={breakReason}
                onChange={(e) => setBreakReason(e.target.value)}
                placeholder="e.g. Lunch, Team Sync, Coffee"
                className="w-full text-xs px-3 py-2 rounded-lg border border-stone-300 bg-white focus:outline-none focus:ring-1 focus:ring-[#B29261]"
              />
            </div>

            <div className="mt-6 flex space-x-2 justify-end">
              <button
                type="button"
                onClick={() => setShowBreakModal(false)}
                className="px-3.5 py-2 text-xs font-medium text-stone-600 hover:bg-stone-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleStartBreakConfirm}
                className="px-4 py-2 text-xs font-bold bg-amber-600 text-white hover:bg-amber-700 rounded-lg transition-colors shadow-sm"
              >
                Start Break
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Correction Request Modal */}
      {showCorrectionModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-[#FEFCF7] rounded-2xl border border-[#E8E2D3] p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-base font-bold text-[#192B16]">
              Request Attendance Correction
            </h3>
            <p className="text-xs text-stone-600 mt-1">
              Employees cannot directly edit historical timestamps. Submit your requested adjustment with a clear reason for administrative review.
            </p>

            <form onSubmit={handleCorrectionSubmit} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-stone-700 mb-1">
                  Target Work Date
                </label>
                <input
                  type="date"
                  value={correctionDate}
                  onChange={(e) => setCorrectionDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-stone-300 bg-white focus:outline-none focus:ring-1 focus:ring-[#B29261]"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">
                  Requested Timestamp Changes
                </label>
                <input
                  type="text"
                  value={correctionChanges}
                  onChange={(e) => setCorrectionChanges(e.target.value)}
                  placeholder="e.g. Check in at 09:15 instead of 10:30, or Check out at 18:00"
                  className="w-full px-3 py-2 rounded-lg border border-stone-300 bg-white focus:outline-none focus:ring-1 focus:ring-[#B29261]"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">
                  Reason for Correction
                </label>
                <textarea
                  value={correctionReason}
                  onChange={(e) => setCorrectionReason(e.target.value)}
                  rows={3}
                  placeholder="Explain why this adjustment is needed (e.g. client emergency, network failure at laboratory, hardware sensor test offline)."
                  className="w-full px-3 py-2 rounded-lg border border-stone-300 bg-white focus:outline-none focus:ring-1 focus:ring-[#B29261]"
                  required
                />
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowCorrectionModal(false)}
                  className="px-3.5 py-2 font-medium text-stone-600 hover:bg-stone-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingCorrection}
                  className="px-4 py-2 font-bold bg-[#192B16] text-[#FEFCF7] hover:bg-[#243E20] rounded-lg transition-colors shadow-sm flex items-center space-x-1.5"
                >
                  <Send className="w-3.5 h-3.5 text-[#B29261]" />
                  <span>{submittingCorrection ? 'Submitting...' : 'Submit Request'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
