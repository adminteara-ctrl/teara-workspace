import React, { useState } from 'react';
import {
  FileCheck2,
  Search,
  Filter,
  ExternalLink,
  MessageSquare,
  CheckCircle,
  FileText,
  Paperclip,
  Link2,
  Check,
} from 'lucide-react';
import { WorkLog } from '../../types';
import { formatDate, formatTime } from '../../lib/utils';
import { workLogService } from '../../services/workLogService';

interface WorkLogMonitoringProps {
  allWorkLogs: WorkLog[];
  onRefreshData: () => void;
}

export const WorkLogMonitoring: React.FC<WorkLogMonitoringProps> = ({
  allWorkLogs,
  onRefreshData,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedLog, setSelectedLog] = useState<WorkLog | null>(null);
  const [adminRemark, setAdminRemark] = useState('');
  const [reviewing, setReviewing] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const filteredLogs = allWorkLogs.filter((log) => {
    const matchesSearch =
      log.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.workUndertaken.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.jiraTaskId && log.jiraTaskId.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = statusFilter === 'all' || log.submissionStatus === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleOpenReview = (log: WorkLog) => {
    setSelectedLog(log);
    setAdminRemark(log.reviewRemarks || '');
  };

  const handleSaveReview = async () => {
    if (!selectedLog) return;
    setReviewing(true);
    try {
      await workLogService.reviewWorkLog(
        selectedLog.workLogId,
        'Dr. Alistair Sterling (Admin)',
        adminRemark || 'Reviewed and approved by R&D Leadership.'
      );
      setSuccessMsg(`Work log for ${selectedLog.employeeName} marked as reviewed.`);
      setSelectedLog(null);
      onRefreshData();
      setTimeout(() => setSuccessMsg(''), 3500);
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
            <FileCheck2 className="w-5 h-5 text-[#B29261] mr-2" />
            Daily Work Log Review & Monitoring
          </h1>
          <p className="text-xs text-stone-600 mt-1">
            Audit employee task achievements, inspect Jira references and attachments, and append administrative feedback.
          </p>
        </div>
      </div>

      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-3 text-xs text-emerald-800 flex items-center space-x-2">
          <Check className="w-4 h-4 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Filter Bar */}
      <div className="bg-[#FEFCF7] border border-[#E8E2D3] rounded-2xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center space-x-2 flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-stone-400" />
          <input
            type="text"
            placeholder="Search by employee name, Jira ID (e.g. TR-1042), or task..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-transparent focus:outline-none text-stone-800"
          />
        </div>

        <div className="flex items-center space-x-1.5">
          <span className="text-stone-500 font-semibold">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-[#F7F4EC] border border-[#E8E2D3] rounded-lg px-2.5 py-1 text-stone-700 focus:outline-none"
          >
            <option value="all">All Submissions</option>
            <option value="submitted">Awaiting Review</option>
            <option value="reviewed">Reviewed</option>
            <option value="draft">Drafts</option>
          </select>
        </div>
      </div>

      {/* Logs Feed */}
      <div className="space-y-4">
        {filteredLogs.length === 0 ? (
          <div className="bg-[#FEFCF7] border border-[#E8E2D3] rounded-2xl p-8 text-center text-stone-400 text-xs">
            No work logs submitted yet. When employees submit their daily logs, they will appear here for administrative review and remarks.
          </div>
        ) : (
          filteredLogs.map((log) => (
            <div
              key={log.workLogId}
              className="bg-[#FEFCF7] border border-[#E8E2D3] rounded-2xl p-6 shadow-xs hover:border-stone-300 transition-all"
            >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E8E2D3] pb-3 mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-full bg-[#192B16] text-[#B29261] font-bold text-xs flex items-center justify-center shrink-0">
                  {log.employeeName.charAt(0)}
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-sm text-[#192B16]">{log.employeeName}</span>
                  </div>
                  <span className="text-[11px] text-stone-400 block font-mono">
                    Log Date: {formatDate(log.date)}
                  </span>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                {log.jiraTaskId && (
                  <a
                    href={log.jiraTaskUrl || '#'}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center text-xs bg-blue-50 text-blue-800 border border-blue-200 px-2.5 py-1 rounded-lg font-mono font-semibold hover:bg-blue-100"
                  >
                    <span>{log.jiraTaskId}</span>
                    <ExternalLink className="w-3 h-3 ml-1" />
                  </a>
                )}
                <span
                  className={`text-[10px] font-bold px-2.5 py-1 rounded-lg uppercase ${
                    log.submissionStatus === 'reviewed'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {log.submissionStatus}
                </span>
                <button
                  onClick={() => handleOpenReview(log)}
                  className="px-3 py-1 bg-[#192B16] hover:bg-[#243E20] text-[#FEFCF7] text-xs font-semibold rounded-lg transition-colors ml-2"
                >
                  {log.submissionStatus === 'reviewed' ? 'Edit Remark' : 'Review & Remark'}
                </button>
              </div>
            </div>

            {/* Content Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-3 bg-[#F7F4EC]/60 rounded-xl border border-[#E8E2D3]">
                <span className="font-bold text-stone-700 block mb-1 uppercase tracking-wider text-[10px]">
                  Work Undertaken
                </span>
                <p className="text-stone-800 leading-relaxed whitespace-pre-wrap">
                  {log.workUndertaken}
                </p>
              </div>

              <div className="p-3 bg-[#F7F4EC]/60 rounded-xl border border-[#E8E2D3]">
                <span className="font-bold text-emerald-800 block mb-1 uppercase tracking-wider text-[10px]">
                  Work Accomplished / Deliverables
                </span>
                <p className="text-stone-800 leading-relaxed whitespace-pre-wrap">
                  {log.workCompleted}
                </p>
              </div>
            </div>

            {(log.pendingWork || log.blockers) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3 text-xs">
                {log.pendingWork && (
                  <div>
                    <span className="font-semibold text-stone-600 block text-[11px]">Next Steps:</span>
                    <p className="text-stone-700 mt-0.5">{log.pendingWork}</p>
                  </div>
                )}
                {log.blockers && (
                  <div>
                    <span className="font-semibold text-rose-700 block text-[11px]">Challenges / Blockers:</span>
                    <p className="text-stone-700 mt-0.5">{log.blockers}</p>
                  </div>
                )}
              </div>
            )}

            {/* Attached Resources & Links */}
            {log.resources && log.resources.length > 0 && (
              <div className="mt-4 pt-3 border-t border-[#E8E2D3] flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-semibold text-stone-500 mr-2 flex items-center">
                  <Paperclip className="w-3.5 h-3.5 text-[#B29261] mr-1" />
                  Attachments ({log.resources.length}):
                </span>
                {log.resources.map((res) => (
                  <a
                    key={res.id}
                    href={res.url || res.fileDataUrl || '#'}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-800 text-[11px] font-medium border border-stone-200 transition-colors"
                  >
                    <span className="capitalize text-stone-500">{res.resourceType}:</span>
                    <span className="font-semibold">{res.title || res.fileName}</span>
                    <ExternalLink className="w-3 h-3 text-[#B29261]" />
                  </a>
                ))}
              </div>
            )}

            {/* Existing Admin Remarks */}
            {log.reviewRemarks && (
              <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs">
                <span className="font-bold text-emerald-900 block mb-0.5 flex items-center">
                  <CheckCircle className="w-3.5 h-3.5 mr-1 text-emerald-700" />
                  Reviewed by {log.reviewedBy || 'Admin'}:
                </span>
                <p className="text-emerald-800">{log.reviewRemarks}</p>
              </div>
            )}
          </div>
        ))
      )}
      </div>

      {/* Review Modal */}
      {selectedLog && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-[#FEFCF7] rounded-2xl border border-[#E8E2D3] p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-base font-bold text-[#192B16]">
              Review Daily Work Log
            </h3>
            <p className="text-xs text-stone-600 mt-1">
              Add your executive remarks for {selectedLog.employeeName} ({formatDate(selectedLog.date)}).
            </p>

            <div className="mt-4">
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Administrative Remarks
              </label>
              <textarea
                rows={3}
                value={adminRemark}
                onChange={(e) => setAdminRemark(e.target.value)}
                placeholder="e.g. Verified deliverables against Jira acceptance criteria. Excellent progress on the FPGA firmware."
                className="w-full text-xs px-3 py-2 rounded-lg border border-stone-300 bg-white focus:outline-none focus:ring-1 focus:ring-[#B29261]"
              />
            </div>

            <div className="mt-6 flex space-x-2 justify-end">
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="px-3.5 py-2 text-xs font-medium text-stone-600 hover:bg-stone-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={reviewing}
                onClick={handleSaveReview}
                className="px-4 py-2 text-xs font-bold bg-[#192B16] text-[#FEFCF7] hover:bg-[#243E20] rounded-lg transition-colors shadow-sm"
              >
                {reviewing ? 'Saving...' : 'Mark as Reviewed'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
