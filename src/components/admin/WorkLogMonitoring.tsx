
import React, { useMemo, useState } from 'react';
import {
  FileCheck2,
  Search,
  ExternalLink,
  CheckCircle,
  Paperclip,
  Check,
  AlertCircle,
  Clock,
  RotateCcw,
  X,
  MessageSquare,
} from 'lucide-react';

import { WorkLog } from '../../types';
import { formatDate } from '../../lib/utils';
import { workLogService } from '../../services/workLogService';

interface WorkLogMonitoringProps {
  allWorkLogs: WorkLog[];
  onRefreshData: () => void | Promise<void>;
}

type AdminAction = 'approve' | 'request_revision' | 'reject';

export const WorkLogMonitoring: React.FC<WorkLogMonitoringProps> = ({
  allWorkLogs,
  onRefreshData,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const [selectedLog, setSelectedLog] = useState<WorkLog | null>(null);
  const [adminRemark, setAdminRemark] = useState('');

  const [reviewing, setReviewing] = useState(false);
  const [activeAction, setActiveAction] = useState<AdminAction | null>(null);

  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // ------------------------------------------------
  // FILTER WORK LOGS
  // ------------------------------------------------

  const filteredLogs = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    return allWorkLogs.filter((log) => {
      const matchesSearch =
        (log.employeeName || '').toLowerCase().includes(term) ||
        (log.workUndertaken || '').toLowerCase().includes(term) ||
        (log.jiraTaskId || '').toLowerCase().includes(term) ||
        (log.department || '').toLowerCase().includes(term);

      const matchesStatus =
        statusFilter === 'all' ||
        log.submissionStatus === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [allWorkLogs, searchTerm, statusFilter]);

  const pendingCount = allWorkLogs.filter(
    (log) =>
      log.submissionStatus === 'submitted' ||
      log.submissionStatus === 'under_review'
  ).length;

  const revisionCount = allWorkLogs.filter(
    (log) => log.submissionStatus === 'revision_requested'
  ).length;

  // ------------------------------------------------
  // OPEN REVIEW MODAL
  // ------------------------------------------------

  const handleOpenReview = (log: WorkLog) => {
    setSelectedLog(log);
    setAdminRemark('');
    setErrorMsg('');
    setSuccessMsg('');
  };

  const handleCloseReview = () => {
    if (reviewing) return;

    setSelectedLog(null);
    setAdminRemark('');
    setErrorMsg('');
  };

  // ------------------------------------------------
  // SAVE ADMIN DECISION
  // ------------------------------------------------

  const handleAdminAction = async (action: AdminAction) => {
    if (!selectedLog || reviewing) return;

    const isRevisionRequest = action === 'request_revision';
    const isRejection = action === 'reject';

    if ((isRevisionRequest || isRejection) && !adminRemark.trim()) {
      setErrorMsg(
        isRejection
          ? 'Please provide a reason before rejecting this work log.'
          : 'Please explain what needs to be corrected before requesting a revision.'
      );
      return;
    }

    if (
      selectedLog.submissionStatus !== 'submitted' &&
      selectedLog.submissionStatus !== 'under_review'
    ) {
      setErrorMsg(
        'This work log is no longer awaiting review. Refresh the dashboard.'
      );
      return;
    }

    setReviewing(true);
    setActiveAction(action);
    setErrorMsg('');
    setSuccessMsg('');

    const employeeName = selectedLog.employeeName;
    const workLogId = selectedLog.workLogId;

    try {
      if (isRevisionRequest) {
        await workLogService.requestWorkLogRevision(
          workLogId,
          'Dr. Alistair Sterling (Admin)',
          adminRemark.trim()
        );
      } else if (isRejection) {
        await workLogService.rejectWorkLog(
          workLogId,
          'Dr. Alistair Sterling (Admin)',
          adminRemark.trim()
        );
      } else {
        await workLogService.reviewWorkLog(
          workLogId,
          'Dr. Alistair Sterling (Admin)',
          adminRemark.trim() ||
          'Reviewed and approved by R&D Leadership.'
        );
      }

      setSelectedLog(null);
      setAdminRemark('');

      setSuccessMsg(
        isRevisionRequest
          ? `Revision requested successfully for ${employeeName}.`
          : isRejection
            ? `Work log for ${employeeName} has been rejected.`
            : `Work log for ${employeeName} has been reviewed.`
      );

      try {
        await onRefreshData();
      } catch (refreshError) {
        console.error('Work log refresh failed:', refreshError);
        setErrorMsg(
          'The decision was saved, but the dashboard could not refresh. Please refresh the page.'
        );
      }

    } catch (error) {
      console.error('Administrative work log action failed:', error);

      setErrorMsg(
        error instanceof Error
          ? error.message
          : 'Unable to save the administrative decision. Please try again.'
      );
    } finally {
      setReviewing(false);
      setActiveAction(null);
    }
  };

  // ------------------------------------------------
  // STATUS PRESENTATION
  // ------------------------------------------------

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'reviewed':
        return 'bg-emerald-100 text-emerald-800';

      case 'revision_requested':
        return 'bg-rose-100 text-rose-800';

      case 'rejected':
        return 'bg-red-100 text-red-800';

      case 'under_review':
        return 'bg-blue-100 text-blue-800';

      case 'submitted':
        return 'bg-amber-100 text-amber-800';

      default:
        return 'bg-stone-100 text-stone-700';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'revision_requested':
        return 'Revision Requested';

      case 'under_review':
        return 'Under Review';

      case 'submitted':
        return 'Awaiting Review';

      case 'reviewed':
        return 'Reviewed';

      case 'rejected':
        return 'Rejected';

      case 'draft':
        return 'Draft';

      default:
        return status.replace(/_/g, ' ');
    }
  };

  const canReview = (log: WorkLog) =>
    log.submissionStatus === 'submitted' ||
    log.submissionStatus === 'under_review';

  // ------------------------------------------------
  // RENDER
  // ------------------------------------------------

  return (
    <div className="space-y-6 max-w-7xl mx-auto">

      {/* HEADER */}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E8E2D3] pb-4">
        <div>
          <h1 className="text-xl font-bold text-[#192B16] flex items-center">
            <FileCheck2 className="w-5 h-5 text-[#B29261] mr-2" />
            Daily Work Log Review & Monitoring
          </h1>

          <p className="text-xs text-stone-600 mt-1">
            Monitor employee submissions, verify deliverables and manage
            administrative reviews.
          </p>
        </div>
      </div>

      {/* FEEDBACK */}

      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-3 text-xs text-emerald-800 flex items-center space-x-2">
          <Check className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && !selectedLog && (
        <div className="bg-rose-50 border border-rose-300 rounded-xl p-3 text-xs text-rose-800 flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* SUMMARY */}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-[#FEFCF7] border border-[#E8E2D3] rounded-xl p-4">
          <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
            Total Work Logs
          </span>
          <p className="text-2xl font-bold text-[#192B16] mt-1">
            {allWorkLogs.length}
          </p>
        </div>

        <div className="bg-[#FEFCF7] border border-[#E8E2D3] rounded-xl p-4">
          <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
            Awaiting Review
          </span>
          <p className="text-2xl font-bold text-amber-700 mt-1">
            {pendingCount}
          </p>
        </div>

        <div className="bg-[#FEFCF7] border border-[#E8E2D3] rounded-xl p-4">
          <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
            Revision Requested
          </span>
          <p className="text-2xl font-bold text-rose-700 mt-1">
            {revisionCount}
          </p>
        </div>
      </div>

      {/* FILTER BAR */}

      <div className="bg-[#FEFCF7] border border-[#E8E2D3] rounded-2xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center space-x-2 flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-stone-400" />

          <input
            type="text"
            placeholder="Search employee, Jira ID, department or task..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-transparent focus:outline-none text-stone-800"
          />
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-stone-500 font-semibold">Status:</span>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-[#F7F4EC] border border-[#E8E2D3] rounded-lg px-2.5 py-1.5 text-stone-700 focus:outline-none"
          >
            <option value="all">All Submissions</option>
            <option value="draft">Drafts</option>
            <option value="submitted">Awaiting Review</option>
            <option value="under_review">Under Review</option>
            <option value="revision_requested">Revision Requested</option>
            <option value="reviewed">Reviewed</option>\n            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      {/* WORK LOG FEED */}

      <div className="space-y-4">

        {filteredLogs.length === 0 ? (
          <div className="bg-[#FEFCF7] border border-[#E8E2D3] rounded-2xl p-8 text-center text-stone-400 text-xs">
            No work logs match your current search or status filter.
          </div>
        ) : (
          filteredLogs.map((log) => (
            <div
              key={log.workLogId}
              className="bg-[#FEFCF7] border border-[#E8E2D3] rounded-2xl p-6 shadow-xs hover:border-stone-300 transition-all"
            >

              {/* EMPLOYEE HEADER */}

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E8E2D3] pb-3 mb-4">

                <div className="flex items-center space-x-3">
                  <div className="w-9 h-9 rounded-full bg-[#192B16] text-[#B29261] font-bold text-xs flex items-center justify-center shrink-0">
                    {(log.employeeName || '?').charAt(0)}
                  </div>

                  <div>
                    <span className="font-bold text-sm text-[#192B16]">
                      {log.employeeName}
                    </span>

                    <span className="text-[11px] text-stone-400 block">
                      {log.department} · {formatDate(log.date)}
                    </span>

                    <span className="text-[10px] text-stone-400 block font-mono">
                      Revision {log.revisionNumber || 0}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">

                  {log.jiraTaskId && (
                    <a
                      href={log.jiraTaskUrl || '#'}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center text-xs bg-blue-50 text-blue-800 border border-blue-200 px-2.5 py-1 rounded-lg font-mono font-semibold hover:bg-blue-100"
                    >
                      {log.jiraTaskId}
                      <ExternalLink className="w-3 h-3 ml-1" />
                    </a>
                  )}

                  <span
                    className={`text-[10px] font-bold px-2.5 py-1 rounded-lg uppercase ${getStatusStyle(log.submissionStatus)}`}
                  >
                    {getStatusLabel(log.submissionStatus)}
                  </span>

                  {canReview(log) && (
                    <button
                      onClick={() => handleOpenReview(log)}
                      className="px-3 py-1.5 bg-[#192B16] hover:bg-[#243E20] text-[#FEFCF7] text-xs font-semibold rounded-lg transition-colors"
                    >
                      Review Submission
                    </button>
                  )}
                </div>
              </div>

              {/* REVISION REQUEST NOTICE */}

              {log.submissionStatus === 'revision_requested' && (
                <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs">
                  <div className="flex items-center gap-2 font-bold text-rose-900 mb-1">
                    <RotateCcw className="w-4 h-4" />
                    Revision Requested
                  </div>

                  <p className="text-rose-800">
                    {log.revisionRequestRemarks ||
                      log.reviewRemarks ||
                      'The administrator has requested corrections.'}
                  </p>

                  <p className="text-[10px] text-rose-600 mt-1">
                    Requested by {log.revisionRequestedBy || log.reviewedBy || 'Admin'}
                    {log.revisionRequestedAt
                      ? ` · ${formatDate(log.revisionRequestedAt)}`
                      : ''}
                  </p>
                </div>
              )}

              {log.submissionStatus === 'rejected' && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs">
                  <div className="flex items-center gap-2 font-bold text-red-900 mb-1">
                    <X className="w-4 h-4" />
                    Work Log Rejected
                  </div>
                  <p className="text-red-800 whitespace-pre-wrap">
                    {log.reviewRemarks || 'This work log was rejected by an administrator.'}
                  </p>
                  <p className="text-[10px] text-red-600 mt-1">
                    Rejected by {log.reviewedBy || 'Admin'}
                    {log.reviewedAt ? ` · ${formatDate(log.reviewedAt)}` : ''}
                  </p>
                  <p className="text-[10px] text-red-700 mt-1">
                    Rejected work logs cannot be edited or resubmitted.
                  </p>
                </div>
              )}

              {/* WORK DETAILS */}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">

                <div className="p-3 bg-[#F7F4EC]/60 rounded-xl border border-[#E8E2D3]">
                  <span className="font-bold text-stone-700 block mb-1 uppercase tracking-wider text-[10px]">
                    Work Undertaken
                  </span>

                  <p className="text-stone-800 leading-relaxed whitespace-pre-wrap">
                    {log.workUndertaken || '—'}
                  </p>
                </div>

                <div className="p-3 bg-[#F7F4EC]/60 rounded-xl border border-[#E8E2D3]">
                  <span className="font-bold text-emerald-800 block mb-1 uppercase tracking-wider text-[10px]">
                    Work Accomplished / Deliverables
                  </span>

                  <p className="text-stone-800 leading-relaxed whitespace-pre-wrap">
                    {log.workCompleted || '—'}
                  </p>
                </div>
              </div>

              {(log.pendingWork || log.blockers) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3 text-xs">

                  {log.pendingWork && (
                    <div>
                      <span className="font-semibold text-stone-600 block text-[11px]">
                        Next Steps:
                      </span>

                      <p className="text-stone-700 mt-0.5 whitespace-pre-wrap">
                        {log.pendingWork}
                      </p>
                    </div>
                  )}

                  {log.blockers && (
                    <div>
                      <span className="font-semibold text-rose-700 block text-[11px]">
                        Challenges / Blockers:
                      </span>

                      <p className="text-stone-700 mt-0.5 whitespace-pre-wrap">
                        {log.blockers}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* ATTACHED RESOURCES */}

              {log.resources && log.resources.length > 0 && (
                <div className="mt-4 pt-3 border-t border-[#E8E2D3] flex flex-wrap items-center gap-2">

                  <span className="text-[11px] font-semibold text-stone-500 mr-2 flex items-center">
                    <Paperclip className="w-3.5 h-3.5 text-[#B29261] mr-1" />
                    Attachments ({log.resources.length}):
                  </span>

                  {log.resources.map((resource) => (
                    <a
                      key={resource.resourceId || resource.id}
                      href={resource.url || resource.fileDataUrl || '#'}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-800 text-[11px] font-medium border border-stone-200 transition-colors"
                    >
                      <span className="capitalize text-stone-500">
                        {resource.resourceType}:
                      </span>

                      <span className="font-semibold">
                        {resource.title || resource.fileName || 'Attachment'}
                      </span>

                      <ExternalLink className="w-3 h-3 text-[#B29261]" />
                    </a>
                  ))}
                </div>
              )}

              {/* LATEST ADMIN REVIEW */}

              {log.reviewRemarks && (
                <div className={`mt-4 p-3 rounded-xl text-xs ${
                  log.submissionStatus === 'rejected'
                    ? 'bg-red-50 border border-red-200'
                    : log.submissionStatus === 'revision_requested'
                      ? 'bg-rose-50 border border-rose-200'
                      : 'bg-emerald-50 border border-emerald-200'
                }`}>
                  <span className={`font-bold block mb-1 flex items-center ${
                    log.submissionStatus === 'rejected'
                      ? 'text-red-900'
                      : log.submissionStatus === 'revision_requested'
                        ? 'text-rose-900'
                        : 'text-emerald-900'
                  }`}>
                    <CheckCircle className="w-3.5 h-3.5 mr-1" />
                    Administrative Feedback
                  </span>

                  <p className={`whitespace-pre-wrap ${
                    log.submissionStatus === 'rejected'
                      ? 'text-red-800'
                      : log.submissionStatus === 'revision_requested'
                        ? 'text-rose-800'
                        : 'text-emerald-800'
                  }`}>
                    {log.reviewRemarks}
                  </p>

                  <p className="text-[10px] text-emerald-600 mt-1">
                    {log.reviewedBy || log.revisionRequestedBy || 'Admin'}
                  </p>
                </div>
              )}

              {/* REVIEW HISTORY */}

              {log.reviewHistory && log.reviewHistory.length > 0 && (
                <div className="mt-4 pt-3 border-t border-[#E8E2D3]">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500 flex items-center gap-1 mb-2">
                    <Clock className="w-3.5 h-3.5" />
                    Review History ({log.reviewHistory.length})
                  </span>

                  <div className="space-y-2">
                    {[...log.reviewHistory]
                      .sort((a, b) =>
                        (b.reviewedAt || '').localeCompare(a.reviewedAt || '')
                      )
                      .map((review) => (
                        <div
                          key={review.reviewId}
                          className="text-xs bg-stone-50 border border-stone-200 rounded-lg p-2.5"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="font-semibold text-stone-700">
                              {review.reviewerName}
                            </span>

                            <span className={`text-[10px] font-bold uppercase ${review.reviewStatus === 'approved'
                                ? 'text-emerald-700'
                                : 'text-rose-700'
                              }`}>
                              {review.reviewStatus === 'approved'
                                ? 'Approved'
                                : review.reviewStatus === 'rejected'
                                  ? 'Rejected'
                                  : 'Revision Requested'}
                            </span>
                          </div>

                          <p className="text-stone-600 mt-1 whitespace-pre-wrap">
                            {review.remarks}
                          </p>

                          <span className="text-[10px] text-stone-400 mt-1 block">
                            {review.reviewedAt
                              ? formatDate(review.reviewedAt)
                              : ''}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* REVISION HISTORY */}

              {log.revisions && log.revisions.length > 0 && (
                <div className="mt-4 text-[11px] text-stone-500 flex items-center gap-1">
                  <RotateCcw className="w-3.5 h-3.5" />
                  {log.revisions.length} previous version(s) preserved.
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* ADMIN REVIEW MODAL */}

      {selectedLog && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">

          <div className="bg-[#FEFCF7] rounded-2xl border border-[#E8E2D3] p-6 max-w-lg w-full shadow-2xl max-h-[90vh] overflow-y-auto">

            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-[#192B16]">
                  Review Daily Work Log
                </h3>

                <p className="text-xs text-stone-600 mt-1">
                  {selectedLog.employeeName} · {formatDate(selectedLog.date)}
                </p>
              </div>

              <button
                type="button"
                onClick={handleCloseReview}
                disabled={reviewing}
                className="text-stone-400 hover:text-stone-700 disabled:opacity-40"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* CURRENT SUBMISSION */}

            <div className="mt-4 p-3 bg-[#F7F4EC] border border-[#E8E2D3] rounded-xl text-xs">
              <span className="font-bold text-stone-700 block mb-1">
                Work Undertaken
              </span>

              <p className="text-stone-700 whitespace-pre-wrap">
                {selectedLog.workUndertaken}
              </p>
            </div>

            {/* REMARKS */}

            <div className="mt-4">
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Administrative Remarks
              </label>

              <textarea
                rows={4}
                value={adminRemark}
                onChange={(e) => {
                  setAdminRemark(e.target.value);
                  setErrorMsg('');
                }}
                placeholder="Add feedback, observations or specify exactly what needs correction..."
                disabled={reviewing}
                className="w-full text-xs px-3 py-2 rounded-lg border border-stone-300 bg-white focus:outline-none focus:ring-1 focus:ring-[#B29261] disabled:opacity-60"
              />

              <p className="text-[10px] text-stone-400 mt-1">
                Remarks are recorded in the permanent administrative review history.
              </p>
            </div>

            {/* MODAL ERROR */}

            {errorMsg && (
              <div className="mt-3 p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* ACTIONS */}

            <div className="mt-6 flex flex-col-reverse sm:flex-row gap-2 justify-end">

              <button
                type="button"
                onClick={handleCloseReview}
                disabled={reviewing}
                className="px-3.5 py-2 text-xs font-medium text-stone-600 hover:bg-stone-100 rounded-lg transition-colors disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() => handleAdminAction('request_revision')}
                disabled={reviewing || !adminRemark.trim()}
                className="px-4 py-2 text-xs font-bold bg-rose-700 text-white hover:bg-rose-800 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                {reviewing && activeAction === 'request_revision'
                  ? 'Requesting...'
                  : 'Request Revision'}
              </button>

              <button
                type="button"
                onClick={() => handleAdminAction('reject')}
                disabled={reviewing || !adminRemark.trim()}
                className="px-4 py-2 text-xs font-bold bg-red-700 text-white hover:bg-red-800 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <X className="w-3.5 h-3.5" />
                {reviewing && activeAction === 'reject'
                  ? 'Rejecting...'
                  : 'Reject Work Log'}
              </button>

              <button
                type="button"
                onClick={() => handleAdminAction('approve')}
                disabled={reviewing}
                className="px-4 py-2 text-xs font-bold bg-[#192B16] text-[#FEFCF7] hover:bg-[#243E20] rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <CheckCircle className="w-3.5 h-3.5" />
                {reviewing && activeAction === 'approve'
                  ? 'Approving...'
                  : 'Approve & Review'}
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};
