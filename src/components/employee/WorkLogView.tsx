
import React, { useState } from 'react';
import {
  FileText,
  Plus,
  Link2,
  Paperclip,
  Check,
  ExternalLink,
  Trash2,
  Save,
  Send,
  AlertCircle,
  FileCheck,
  History,
  X,
  RotateCcw,
  Clock,
} from 'lucide-react';

import { useAuth } from '../../context/AuthContext';

import {
  WorkLog,
  WorkLogResource,
  ResourceType,
  AttendanceRecord,
} from '../../types';

import {
  getTodayDateString,
  formatDate,
  formatTime,
} from '../../lib/utils';

import { workLogService } from '../../services/workLogService';

interface WorkLogViewProps {
  workLogs: WorkLog[];
  todayAttendance: AttendanceRecord | null;
  onRefreshData: () => void | Promise<void>;
}

export const WorkLogView: React.FC<WorkLogViewProps> = ({
  workLogs,
  todayAttendance,
  onRefreshData,
}) => {
  const { currentUser } = useAuth();

  // ------------------------------------------------
  // GENERAL STATE
  // ------------------------------------------------

  const [selectedLog, setSelectedLog] = useState<WorkLog | null>(null);
  const [isEditing, setIsEditing] = useState(true);
  const [activeTab, setActiveTab] = useState<'editor' | 'list'>('editor');

  const [saving, setSaving] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // ------------------------------------------------
  // FORM STATE
  // ------------------------------------------------

  const [date, setDate] = useState(getTodayDateString());
  const [jiraTaskId, setJiraTaskId] = useState('');
  const [jiraTaskUrl, setJiraTaskUrl] = useState('');

  const [workUndertaken, setWorkUndertaken] = useState('');
  const [workCompleted, setWorkCompleted] = useState('');
  const [pendingWork, setPendingWork] = useState('');
  const [blockers, setBlockers] = useState('');
  const [remarks, setRemarks] = useState('');

  const [resources, setResources] = useState<WorkLogResource[]>([]);

  // ------------------------------------------------
  // LINK DIALOG
  // ------------------------------------------------

  const [showLinkModal, setShowLinkModal] = useState(false);
  const [newLinkTitle, setNewLinkTitle] = useState('');
  const [newLinkUrl, setNewLinkUrl] = useState('');
  const [newLinkType, setNewLinkType] =
    useState<ResourceType>('jira');

  // ------------------------------------------------
  // FILE UPLOAD
  // ------------------------------------------------

  const [fileError, setFileError] = useState('');

  // ------------------------------------------------
  // STATUS HELPERS
  // ------------------------------------------------

  const isRevisionRequested =
    selectedLog?.submissionStatus === 'revision_requested';

  const isDraft =
    selectedLog?.submissionStatus === 'draft';

  const isReadOnly =
    !!selectedLog &&
    !isDraft &&
    !isRevisionRequested &&
    !isEditing;

  const canEdit = !selectedLog || isEditing;

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'reviewed':
        return 'bg-emerald-100 text-emerald-800';

      case 'revision_requested':
        return 'bg-rose-100 text-rose-800';

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

      case 'draft':
        return 'Draft';

      default:
        return status.replace(/_/g, ' ');
    }
  };

  // ------------------------------------------------
  // RESET FORM
  // ------------------------------------------------

  const resetForm = () => {
    if (saving) return;

    setSelectedLog(null);
    setIsEditing(true);

    setDate(getTodayDateString());
    setJiraTaskId('');
    setJiraTaskUrl('');

    setWorkUndertaken('');
    setWorkCompleted('');
    setPendingWork('');
    setBlockers('');
    setRemarks('');

    setResources([]);

    setSaveSuccessMsg('');
    setErrorMsg('');
    setFileError('');

    setActiveTab('editor');
  };

  // ------------------------------------------------
  // SELECT EXISTING WORK LOG
  // ------------------------------------------------

  const handleSelectLog = (log: WorkLog) => {
    setSelectedLog(log);

    setDate(log.date || getTodayDateString());
    setJiraTaskId(log.jiraTaskId || '');
    setJiraTaskUrl(log.jiraTaskUrl || '');

    setWorkUndertaken(log.workUndertaken || '');
    setWorkCompleted(log.workCompleted || '');
    setPendingWork(log.pendingWork || '');
    setBlockers(log.blockers || '');
    setRemarks(log.remarks || '');

    setResources(log.resources || []);

    // Drafts and admin-requested revisions are editable.
    // Submitted and reviewed records remain read-only.
    setIsEditing(
      log.submissionStatus === 'draft' ||
      log.submissionStatus === 'revision_requested'
    );

    setSaveSuccessMsg('');
    setErrorMsg('');
    setFileError('');

    setActiveTab('editor');
  };

  // ------------------------------------------------
  // ENABLE EDITING
  // ------------------------------------------------

  const handleEditExisting = () => {
    if (!selectedLog) return;

    if (
      selectedLog.submissionStatus !== 'draft' &&
      selectedLog.submissionStatus !== 'revision_requested'
    ) {
      setErrorMsg(
        'This submission cannot be edited. An administrator must request a revision first.'
      );
      return;
    }

    setIsEditing(true);
    setErrorMsg('');
  };

  // ------------------------------------------------
  // ADD SUPPORTING LINK
  // ------------------------------------------------

  const handleAddLinkResource = (e: React.FormEvent) => {
    e.preventDefault();

    if (!newLinkTitle.trim() || !newLinkUrl.trim()) {
      setFileError('Please enter a title and URL.');
      return;
    }

    try {
      const parsedUrl = new URL(newLinkUrl);

      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        throw new Error('Invalid protocol');
      }
    } catch {
      setFileError('Please enter a valid HTTP or HTTPS URL.');
      return;
    }

    const resourceId = `res_${Date.now()}`;

    const resource: WorkLogResource = {
      id: resourceId,
      resourceId,
      workLogId: selectedLog?.workLogId || 'new',
      employeeId: currentUser?.uid || '',
      title: newLinkTitle.trim(),
      url: newLinkUrl.trim(),
      resourceType: newLinkType,
      createdAt: new Date().toISOString(),
    };

    setResources((previous) => [...previous, resource]);

    setNewLinkTitle('');
    setNewLinkUrl('');
    setShowLinkModal(false);
    setFileError('');
  };

  // ------------------------------------------------
  // FILE UPLOAD
  // ------------------------------------------------

  /**
   * Temporary compatibility implementation.
   *
   * Files are stored as base64 data URLs in Firestore.
   * A conservative 500 KB per-file limit is used here.
   * Firebase Storage migration is recommended before
   * supporting larger files or multiple large attachments.
   */
  const handleFileUpload = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = e.target.files;

    if (!files || files.length === 0) return;

    const file = files[0];

    setFileError('');

    const allowedExtensions = [
      'pdf',
      'docx',
      'xlsx',
      'csv',
      'png',
      'jpg',
      'jpeg',
    ];

    const extension = file.name.split('.').pop()?.toLowerCase();

    if (!extension || !allowedExtensions.includes(extension)) {
      setFileError(
        'Invalid file type. Allowed: PDF, DOCX, XLSX, CSV, PNG, JPG, JPEG.'
      );

      e.target.value = '';
      return;
    }

    const maxFileSize = 500 * 1024;

    if (file.size > maxFileSize) {
      setFileError(
        'File exceeds the temporary 500 KB limit. Larger files require Firebase Storage.'
      );

      e.target.value = '';
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result !== 'string') {
        setFileError('Unable to read the selected file.');
        return;
      }

      const resourceId = `res_file_${Date.now()}`;

      const resource: WorkLogResource = {
        id: resourceId,
        resourceId,
        workLogId: selectedLog?.workLogId || 'new',
        employeeId: currentUser?.uid || '',
        title: file.name,
        fileName: file.name,
        fileSize: file.size,
        fileDataUrl: reader.result,
        resourceType: 'file',
        createdAt: new Date().toISOString(),
      };

      setResources((previous) => [...previous, resource]);
    };

    reader.onerror = () => {
      setFileError('Unable to read the selected file.');
    };

    reader.readAsDataURL(file);

    // Allows selecting the same file again if necessary.
    e.target.value = '';
  };

  // ------------------------------------------------
  // REMOVE RESOURCE
  // ------------------------------------------------

  const handleRemoveResource = (resourceId: string) => {
    setResources((previous) =>
      previous.filter(
        (resource) =>
          resource.id !== resourceId &&
          resource.resourceId !== resourceId
      )
    );
  };

  // ------------------------------------------------
  // SAVE / SUBMIT WORK LOG
  // ------------------------------------------------

  const handleSave = async (
    submissionStatus: 'draft' | 'submitted'
  ) => {
    if (!currentUser || saving) return;

    setErrorMsg('');
    setSaveSuccessMsg('');

    if (!workUndertaken.trim() || !workCompleted.trim()) {
      setErrorMsg(
        'Please fill out both Work Undertaken and Work Accomplished.'
      );
      return;
    }

    if (!date) {
      setErrorMsg('Please select a work date.');
      return;
    }

    // ----------------------------------------------
    // VALIDATE EXISTING RECORD STATUS
    // ----------------------------------------------

    const isRevision =
      selectedLog?.submissionStatus === 'revision_requested';

    if (
      selectedLog &&
      selectedLog.submissionStatus !== 'draft' &&
      !isRevision
    ) {
      setErrorMsg(
        'This work log is locked. Only an administrator-requested revision can be resubmitted.'
      );
      return;
    }

    if (isRevision && submissionStatus !== 'submitted') {
      setErrorMsg(
        'A requested revision must be submitted for administrative review. It cannot be saved as a draft.'
      );
      return;
    }

    // ----------------------------------------------
    // BUILD PAYLOAD
    // ----------------------------------------------

    const nowIso = new Date().toISOString();

    const workLogId =
      selectedLog?.workLogId ||
      `wl_${currentUser.uid}_${Date.now()}`;

    const updatedResources = resources.map((resource) => ({
      ...resource,
      workLogId,
      employeeId: currentUser.uid,
    }));

    const payload: WorkLog = {
      id: workLogId,
      workLogId,

      employeeId: currentUser.uid,
      employeeName: currentUser.name,
      employeeEmail: currentUser.email,
      department: currentUser.department,

      // Preserve the original attendance references when
      // editing an older log without an active attendance.
      attendanceId:
        todayAttendance?.attendanceId ||
        selectedLog?.attendanceId,

      sessionId:
        todayAttendance?.activeSessionId ||
        selectedLog?.sessionId,

      date,

      loginTime:
        todayAttendance?.firstCheckIn ||
        selectedLog?.loginTime,

      logoutTime:
        todayAttendance?.lastCheckOut ||
        selectedLog?.logoutTime,

      jiraTaskId: jiraTaskId.trim() || undefined,
      jiraTaskUrl: jiraTaskUrl.trim() || undefined,

      workUndertaken: workUndertaken.trim(),
      workCompleted: workCompleted.trim(),
      pendingWork: pendingWork.trim(),
      blockers: blockers.trim(),
      remarks: remarks.trim(),

      submissionStatus,

      resources: updatedResources,

      // Preserve original creation timestamp.
      createdAt: selectedLog?.createdAt || nowIso,
      updatedAt: nowIso,

      // Preserve existing history.
      revisions: selectedLog?.revisions || [],
      reviewHistory: selectedLog?.reviewHistory || [],

      revisionNumber: selectedLog?.revisionNumber || 0,
    };

    // ----------------------------------------------
    // SAVE TO FIRESTORE
    // ----------------------------------------------

    setSaving(true);

    try {
      await workLogService.createOrUpdateWorkLog(
        payload,
        isRevision
      );

      const message = isRevision
        ? 'Your revised work log has been successfully resubmitted for administrative review.'
        : submissionStatus === 'submitted'
          ? 'Daily work log successfully submitted for administrative review!'
          : 'Work log draft saved successfully.';

      setSaveSuccessMsg(message);

      // Update local selection to reflect the saved record.
      const updatedLog: WorkLog = {
        ...payload,
        submittedAt:
          submissionStatus === 'submitted'
            ? nowIso
            : selectedLog?.submittedAt,
      };

      setSelectedLog(updatedLog);

      // Submitted records become read-only.
      setIsEditing(false);

      // Wait for parent data refresh.
      await onRefreshData();

    } catch (error) {
      console.error('Work log save failed:', error);

      setErrorMsg(
        error instanceof Error
          ? error.message
          : 'Unable to save the work log. Please try again.'
      );

    } finally {
      setSaving(false);
    }
  };

  // ------------------------------------------------
  // RENDER
  // ------------------------------------------------

  return (
    <div className="space-y-6 max-w-6xl mx-auto">

      {/* HEADER */}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E8E2D3] pb-4">

        <div>
          <h1 className="text-xl font-bold text-[#192B16] flex items-center">
            <FileText className="w-5 h-5 text-[#B29261] mr-2" />
            Daily Work Log System
          </h1>

          <p className="text-xs text-stone-600 mt-1">
            Record task progress, deliverables, Jira references and supporting files.
          </p>
        </div>

        <div className="flex items-center space-x-2">

          <div className="flex items-center bg-[#F7F4EC] p-1 rounded-xl border border-[#E8E2D3]">

            <button
              onClick={() => setActiveTab('editor')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${activeTab === 'editor'
                  ? 'bg-[#192B16] text-[#FEFCF7] shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
                }`}
            >
              {selectedLog ? 'Work Log Details' : 'New Log Entry'}
            </button>

            <button
              onClick={() => setActiveTab('list')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${activeTab === 'list'
                  ? 'bg-[#192B16] text-[#FEFCF7] shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
                }`}
            >
              Submitted Logs ({workLogs.length})
            </button>
          </div>

          <button
            onClick={resetForm}
            disabled={saving}
            className="flex items-center space-x-1.5 bg-[#B29261] hover:bg-[#CDB487] text-[#192B16] px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-sm disabled:opacity-50"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create New Log</span>
          </button>
        </div>
      </div>

      {/* SUCCESS MESSAGE */}

      {saveSuccessMsg && (
        <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-3.5 flex items-center space-x-3 text-emerald-800 text-xs">
          <Check className="w-4 h-4 shrink-0" />
          <span className="font-medium">{saveSuccessMsg}</span>
        </div>
      )}

      {/* ERROR MESSAGE */}

      {errorMsg && (
        <div className="bg-rose-50 border border-rose-300 rounded-xl p-3.5 flex items-start space-x-2 text-rose-800 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* EDITOR */}

      {activeTab === 'editor' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* MAIN FORM */}

          <div className="lg:col-span-2 bg-[#FEFCF7] border border-[#E8E2D3] rounded-2xl p-6 shadow-xs space-y-5">

            {/* REVISION REQUEST BANNER */}

            {isRevisionRequested && (
              <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl">

                <div className="flex items-center gap-2 font-bold text-rose-900 text-sm mb-2">
                  <RotateCcw className="w-4 h-4" />
                  Administrative Revision Requested
                </div>

                <p className="text-xs text-rose-800 leading-relaxed whitespace-pre-wrap">
                  {selectedLog?.revisionRequestRemarks ||
                    selectedLog?.reviewRemarks ||
                    'Your administrator has requested changes to this work log.'}
                </p>

                <div className="text-[10px] text-rose-600 mt-2">
                  Requested by {selectedLog?.revisionRequestedBy || selectedLog?.reviewedBy || 'Admin'}

                  {selectedLog?.revisionRequestedAt && (
                    <>
                      {' · '}
                      {formatDate(selectedLog.revisionRequestedAt)}
                    </>
                  )}
                </div>

                <div className="mt-3 text-[11px] font-semibold text-rose-900">
                  Please make the requested corrections and resubmit this work log.
                </div>
              </div>
            )}

            {/* CONTEXT INFO */}

            <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-[#F7F4EC] rounded-xl border border-[#E8E2D3] text-xs">

              <div>
                <span className="text-stone-500">Employee:</span>{' '}
                <span className="font-bold text-[#192B16]">
                  {currentUser?.name}
                </span>
              </div>

              <div className="flex items-center space-x-2">
                <span className="text-stone-500">Date:</span>

                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  disabled={!canEdit || saving}
                  className="bg-white border border-stone-300 rounded px-2 py-0.5 text-xs font-semibold text-stone-800 focus:outline-none focus:ring-1 focus:ring-[#B29261] disabled:bg-stone-100"
                />
              </div>
            </div>

            {/* JIRA */}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

              <div>
                <label className="block text-xs font-bold text-[#192B16] mb-1">
                  Jira Task ID (Optional)
                </label>

                <input
                  type="text"
                  placeholder="e.g. TR-1042"
                  value={jiraTaskId}
                  onChange={(e) => setJiraTaskId(e.target.value)}
                  disabled={!canEdit || saving}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-stone-300 bg-white focus:outline-none focus:ring-1 focus:ring-[#B29261] disabled:bg-stone-50"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#192B16] mb-1">
                  Jira Ticket URL
                </label>

                <div className="flex space-x-1.5">

                  <input
                    type="url"
                    placeholder="https://teara.atlassian.net/browse/..."
                    value={jiraTaskUrl}
                    onChange={(e) => setJiraTaskUrl(e.target.value)}
                    disabled={!canEdit || saving}
                    className="flex-1 min-w-0 text-xs px-3 py-2 rounded-lg border border-stone-300 bg-white focus:outline-none focus:ring-1 focus:ring-[#B29261] disabled:bg-stone-50"
                  />

                  {jiraTaskUrl && (
                    <a
                      href={jiraTaskUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="p-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg flex items-center justify-center border border-stone-300"
                      title="Open Jira Ticket"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-[#B29261]" />
                    </a>
                  )}
                </div>
              </div>
            </div>

            {/* WORK UNDERTAKEN */}

            <div>
              <label className="block text-xs font-bold text-[#192B16] mb-1">
                Work Undertaken <span className="text-red-500">*</span>
              </label>

              <textarea
                rows={3}
                placeholder="Detailed summary of tasks initiated today..."
                value={workUndertaken}
                onChange={(e) => setWorkUndertaken(e.target.value)}
                disabled={!canEdit || saving}
                className="w-full text-xs px-3 py-2 rounded-lg border border-stone-300 bg-white focus:outline-none focus:ring-1 focus:ring-[#B29261] disabled:bg-stone-50"
              />
            </div>

            {/* WORK COMPLETED */}

            <div>
              <label className="block text-xs font-bold text-[#192B16] mb-1">
                Work Accomplished / Deliverables <span className="text-red-500">*</span>
              </label>

              <textarea
                rows={3}
                placeholder="Specific milestones, deliverables and completed tasks..."
                value={workCompleted}
                onChange={(e) => setWorkCompleted(e.target.value)}
                disabled={!canEdit || saving}
                className="w-full text-xs px-3 py-2 rounded-lg border border-stone-300 bg-white focus:outline-none focus:ring-1 focus:ring-[#B29261] disabled:bg-stone-50"
              />
            </div>

            {/* PENDING WORK AND BLOCKERS */}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

              <div>
                <label className="block text-xs font-bold text-[#192B16] mb-1">
                  Pending Work (Next Steps)
                </label>

                <textarea
                  rows={2}
                  placeholder="Remaining items queued for the next session..."
                  value={pendingWork}
                  onChange={(e) => setPendingWork(e.target.value)}
                  disabled={!canEdit || saving}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-stone-300 bg-white focus:outline-none focus:ring-1 focus:ring-[#B29261] disabled:bg-stone-50"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#192B16] mb-1">
                  Challenges or Blockers
                </label>

                <textarea
                  rows={2}
                  placeholder="Dependencies, delays or blockers..."
                  value={blockers}
                  onChange={(e) => setBlockers(e.target.value)}
                  disabled={!canEdit || saving}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-stone-300 bg-white focus:outline-none focus:ring-1 focus:ring-[#B29261] disabled:bg-stone-50"
                />
              </div>
            </div>

            {/* ADDITIONAL REMARKS */}

            <div>
              <label className="block text-xs font-bold text-[#192B16] mb-1">
                Additional Remarks
              </label>

              <input
                type="text"
                placeholder="Optional notes for the team or administrator..."
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                disabled={!canEdit || saving}
                className="w-full text-xs px-3 py-2 rounded-lg border border-stone-300 bg-white focus:outline-none focus:ring-1 focus:ring-[#B29261] disabled:bg-stone-50"
              />
            </div>

            {/* LATEST ADMIN REVIEW */}

            {selectedLog?.reviewRemarks && (
              <div className={`p-4 border rounded-xl text-xs ${isRevisionRequested
                  ? 'bg-rose-50 border-rose-200'
                  : 'bg-emerald-50 border-emerald-200'
                }`}>

                <div className={`font-bold mb-1 flex items-center ${isRevisionRequested
                    ? 'text-rose-900'
                    : 'text-emerald-900'
                  }`}>
                  <FileCheck className="w-4 h-4 mr-1" />
                  Administrative Feedback
                </div>

                <p className={`whitespace-pre-wrap ${isRevisionRequested
                    ? 'text-rose-800'
                    : 'text-emerald-800'
                  }`}>
                  {selectedLog.reviewRemarks}
                </p>

                <span className="text-[10px] text-stone-500 block mt-2">
                  {selectedLog.reviewedBy || 'Admin'}

                  {selectedLog.reviewedAt && (
                    <>
                      {' · '}
                      {formatTime(selectedLog.reviewedAt)} on{' '}
                      {formatDate(selectedLog.reviewedAt)}
                    </>
                  )}
                </span>
              </div>
            )}

            {/* REVIEW HISTORY */}

            {selectedLog?.reviewHistory &&
              selectedLog.reviewHistory.length > 0 && (
                <div className="border border-[#E8E2D3] p-3 rounded-xl bg-[#F7F4EC]/60 text-xs">

                  <div className="font-bold text-[#192B16] mb-2 flex items-center">
                    <Clock className="w-3.5 h-3.5 text-[#B29261] mr-1.5" />
                    Administrative Review History
                  </div>

                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {[...selectedLog.reviewHistory]
                      .sort((a, b) =>
                        (b.reviewedAt || '').localeCompare(a.reviewedAt || '')
                      )
                      .map((review) => (
                        <div
                          key={review.reviewId}
                          className="p-2 bg-white rounded border border-[#E8E2D3] text-[11px]"
                        >
                          <div className="flex justify-between gap-2">
                            <span className="font-semibold text-stone-700">
                              {review.reviewerName}
                            </span>

                            <span className={
                              review.reviewStatus === 'approved'
                                ? 'text-emerald-700 font-bold'
                                : 'text-rose-700 font-bold'
                            }>
                              {review.reviewStatus === 'approved'
                                ? 'Approved'
                                : 'Revision Requested'}
                            </span>
                          </div>

                          <p className="text-stone-600 mt-1 whitespace-pre-wrap">
                            {review.remarks}
                          </p>

                          <span className="text-[10px] text-stone-400 block mt-1">
                            {formatDate(review.reviewedAt)}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              )}

            {/* REVISION HISTORY */}

            {selectedLog?.revisions &&
              selectedLog.revisions.length > 0 && (
                <div className="border border-[#E8E2D3] p-3 rounded-xl bg-[#F7F4EC]/60 text-xs">

                  <div className="font-bold text-[#192B16] mb-2 flex items-center">
                    <History className="w-3.5 h-3.5 text-[#B29261] mr-1.5" />
                    Previous Submission Versions ({selectedLog.revisions.length})
                  </div>

                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {[...selectedLog.revisions]
                      .sort((a, b) =>
                        (b.timestamp || '').localeCompare(a.timestamp || '')
                      )
                      .map((revision, index) => (
                        <div
                          key={revision.revisionId || index}
                          className="p-2 bg-white rounded border border-[#E8E2D3] text-[11px]"
                        >
                          <span className="font-semibold text-stone-700">
                            Version {revision.revisionNumber ?? index + 1}
                            {' · '}
                            {formatDate(revision.timestamp)}
                          </span>

                          <p className="text-stone-600 mt-1 whitespace-pre-wrap">
                            {revision.workUndertaken}
                          </p>
                        </div>
                      ))}
                  </div>
                </div>
              )}

            {/* ACTIONS */}

            <div className="pt-4 border-t border-[#E8E2D3] flex flex-wrap items-center justify-between gap-3">

              <div className="text-xs text-stone-500">
                {selectedLog && (
                  <>
                    Status:{' '}
                    <strong className="capitalize text-stone-800">
                      {getStatusLabel(selectedLog.submissionStatus)}
                    </strong>
                  </>
                )}
              </div>

              <div className="flex items-center flex-wrap gap-2">

                {selectedLog && !isEditing ? (
                  <button
                    type="button"
                    onClick={handleEditExisting}
                    disabled={saving}
                    className="px-4 py-2 text-xs font-bold bg-[#192B16] text-[#FEFCF7] hover:bg-[#243E20] rounded-xl transition-all shadow-sm disabled:opacity-50"
                  >
                    Edit / Revise Submission
                  </button>
                ) : (
                  <>
                    {/* Draft save is unavailable during a formal revision. */}

                    {!isRevisionRequested && (
                      <button
                        type="button"
                        onClick={() => handleSave('draft')}
                        disabled={saving}
                        className="px-4 py-2 text-xs font-semibold bg-stone-100 hover:bg-stone-200 text-stone-800 border border-stone-300 rounded-xl transition-all flex items-center space-x-1.5 disabled:opacity-50"
                      >
                        <Save className="w-3.5 h-3.5" />
                        <span>
                          {saving ? 'Saving...' : 'Save Draft'}
                        </span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => handleSave('submitted')}
                      disabled={saving}
                      className="px-5 py-2 text-xs font-bold bg-[#192B16] hover:bg-[#243E20] text-[#FEFCF7] rounded-xl transition-all shadow-sm flex items-center space-x-1.5 disabled:opacity-50"
                    >
                      <Send className="w-3.5 h-3.5 text-[#B29261]" />

                      <span>
                        {saving
                          ? 'Submitting...'
                          : isRevisionRequested
                            ? 'Resubmit Revised Log'
                            : 'Submit Work Log'}
                      </span>
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN */}

          <div className="space-y-6">

            {/* SUPPORTING LINKS */}

            <div className="bg-[#FEFCF7] border border-[#E8E2D3] rounded-2xl p-5 shadow-xs">

              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#192B16] flex items-center">
                  <Link2 className="w-4 h-4 text-[#B29261] mr-1.5" />
                  Supporting Links ({resources.filter((r) => r.url).length})
                </h3>

                {canEdit && (
                  <button
                    onClick={() => {
                      setShowLinkModal(true);
                      setFileError('');
                    }}
                    disabled={saving}
                    className="text-xs text-[#B29261] hover:text-[#917448] font-bold flex items-center"
                  >
                    <Plus className="w-3.5 h-3.5 mr-0.5" />
                    Add Link
                  </button>
                )}
              </div>

              <p className="text-[11px] text-stone-500 mb-3">
                Add references to Jira, Figma, GitHub, Google Docs or research papers.
              </p>

              <div className="space-y-2">
                {resources.filter((r) => r.url).map((resource) => (
                  <div
                    key={resource.resourceId || resource.id}
                    className="p-2.5 rounded-xl border border-[#E8E2D3] bg-[#F7F4EC] flex items-center justify-between text-xs"
                  >
                    <div className="min-w-0 pr-2">
                      <span className="font-semibold text-stone-800 block truncate">
                        {resource.title}
                      </span>

                      <span className="text-[10px] text-stone-500 block truncate capitalize">
                        {resource.resourceType} · {resource.url}
                      </span>
                    </div>

                    <div className="flex items-center space-x-1.5 shrink-0">
                      <a
                        href={resource.url}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1 text-[#B29261] hover:text-[#917448]"
                        title="Open Link"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>

                      {canEdit && (
                        <button
                          onClick={() => handleRemoveResource(resource.id)}
                          disabled={saving}
                          className="p-1 text-stone-400 hover:text-red-600"
                          title="Remove"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}

                {resources.filter((r) => r.url).length === 0 && (
                  <div className="text-center py-4 text-stone-400 text-xs border border-dashed border-[#E8E2D3] rounded-xl">
                    No links attached
                  </div>
                )}
              </div>
            </div>

            {/* FILE ATTACHMENTS */}

            <div className="bg-[#FEFCF7] border border-[#E8E2D3] rounded-2xl p-5 shadow-xs">

              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#192B16] flex items-center">
                  <Paperclip className="w-4 h-4 text-[#B29261] mr-1.5" />
                  File Attachments ({resources.filter((r) => r.fileName).length})
                </h3>
              </div>

              <p className="text-[11px] text-stone-500 mb-3">
                PDF, DOCX, XLSX, CSV, PNG and JPG. Temporary limit: 500 KB per file.
              </p>

              {fileError && (
                <div className="mb-3 text-[11px] text-red-600 bg-red-50 p-2 rounded border border-red-200">
                  {fileError}
                </div>
              )}

              {canEdit && (
                <label className="cursor-pointer block border-2 border-dashed border-[#B29261]/40 hover:border-[#B29261] rounded-xl p-4 text-center bg-[#F7F4EC]/50 hover:bg-[#F7F4EC] transition-all mb-3">
                  <Paperclip className="w-5 h-5 text-[#B29261] mx-auto mb-1" />

                  <span className="text-xs font-bold text-[#192B16] block">
                    Upload Document or Image
                  </span>

                  <span className="text-[10px] text-stone-500">
                    Click to browse your device
                  </span>

                  <input
                    type="file"
                    className="hidden"
                    accept=".pdf,.docx,.xlsx,.csv,.png,.jpg,.jpeg"
                    onChange={handleFileUpload}
                    disabled={saving}
                  />
                </label>
              )}

              <div className="space-y-2">
                {resources.filter((r) => r.fileName).map((resource) => (
                  <div
                    key={resource.resourceId || resource.id}
                    className="p-2.5 rounded-xl border border-[#E8E2D3] bg-[#F7F4EC] flex items-center justify-between text-xs"
                  >
                    <div className="min-w-0 pr-2">
                      <span className="font-semibold text-stone-800 block truncate">
                        {resource.fileName}
                      </span>

                      <span className="text-[10px] text-stone-500">
                        {resource.fileSize
                          ? `${Math.round(resource.fileSize / 1024)} KB`
                          : 'Attached'}
                      </span>
                    </div>

                    <div className="flex items-center space-x-1.5 shrink-0">

                      {(resource.url || resource.fileDataUrl) && (
                        <a
                          href={resource.url || resource.fileDataUrl}
                          target="_blank"
                          rel="noreferrer"
                          download={resource.fileName}
                          className="p-1 text-[#B29261] hover:text-[#917448]"
                          title="Download / View"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}

                      {canEdit && (
                        <button
                          onClick={() => handleRemoveResource(resource.id)}
                          disabled={saving}
                          className="p-1 text-stone-400 hover:text-red-600"
                          title="Remove"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}

                {resources.filter((r) => r.fileName).length === 0 && (
                  <div className="text-center py-4 text-stone-400 text-xs border border-dashed border-[#E8E2D3] rounded-xl">
                    No files attached
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* WORK LOG LIST */}

      {activeTab === 'list' && (
        <div className="bg-[#FEFCF7] border border-[#E8E2D3] rounded-2xl p-6 shadow-xs">

          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-sm text-[#192B16]">
              Your Work Logs
            </h3>

            <span className="text-xs text-stone-500">
              {workLogs.length} entries
            </span>
          </div>

          <div className="space-y-3">

            {workLogs.length === 0 ? (
              <div className="text-center py-8 text-xs text-stone-400">
                You haven't created any work logs yet.
              </div>
            ) : (
              [...workLogs]
                .sort((a, b) =>
                  (b.date || '').localeCompare(a.date || '')
                )
                .map((log) => (
                  <div
                    key={log.workLogId}
                    className="p-4 rounded-xl border border-[#E8E2D3] bg-[#F7F4EC]/40 hover:bg-[#F7F4EC] transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer"
                    onClick={() => handleSelectLog(log)}
                  >

                    <div className="space-y-1 min-w-0">

                      <div className="flex items-center flex-wrap gap-2">
                        <span className="font-bold text-xs text-[#192B16]">
                          {formatDate(log.date)}
                        </span>

                        {log.jiraTaskId && (
                          <span className="text-[10px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded font-mono font-bold">
                            {log.jiraTaskId}
                          </span>
                        )}

                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${getStatusStyle(log.submissionStatus)}`}>
                          {getStatusLabel(log.submissionStatus)}
                        </span>
                      </div>

                      <p className="text-xs text-stone-700 font-medium line-clamp-1">
                        {log.workCompleted || log.workUndertaken}
                      </p>

                      <div className="flex items-center flex-wrap gap-3 text-[11px] text-stone-500">
                        <span>
                          {log.resources?.length || 0} attachments
                        </span>

                        {(log.revisions?.length || 0) > 0 && (
                          <span>
                            {log.revisions?.length} previous versions
                          </span>
                        )}

                        {(log.reviewHistory?.length || 0) > 0 && (
                          <span>
                            {log.reviewHistory?.length} reviews
                          </span>
                        )}
                      </div>

                      {log.submissionStatus === 'revision_requested' && (
                        <p className="text-[11px] text-rose-700 font-medium mt-1">
                          Administrator has requested corrections.
                        </p>
                      )}
                    </div>

                    <div className="flex items-center space-x-2 shrink-0">

                      {log.submissionStatus === 'revision_requested' && (
                        <span className="text-[10px] text-rose-700 font-bold flex items-center gap-1">
                          <RotateCcw className="w-3 h-3" />
                          Action Required
                        </span>
                      )}

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectLog(log);
                        }}
                        className="px-3.5 py-1.5 text-xs font-semibold bg-[#192B16] text-[#FEFCF7] hover:bg-[#243E20] rounded-lg transition-colors"
                      >
                        View Details
                      </button>
                    </div>
                  </div>
                ))
            )}
          </div>
        </div>
      )}

      {/* ADD LINK MODAL */}

      {showLinkModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">

          <div className="bg-[#FEFCF7] rounded-xl border border-[#E8E2D3] p-6 max-w-md w-full shadow-xl">

            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-[#192B16]">
                Add Supporting Link
              </h3>

              <button
                type="button"
                onClick={() => setShowLinkModal(false)}
                className="text-stone-400 hover:text-stone-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-stone-600 mt-1">
              Link external repositories, design boards, Google Docs or Jira issues.
            </p>

            <form
              onSubmit={handleAddLinkResource}
              className="mt-4 space-y-3.5 text-xs"
            >

              <div>
                <label className="block font-semibold text-stone-700 mb-1">
                  Resource Category
                </label>

                <select
                  value={newLinkType}
                  onChange={(e) =>
                    setNewLinkType(e.target.value as ResourceType)
                  }
                  className="w-full px-3 py-2 rounded-lg border border-stone-300 bg-white focus:outline-none focus:ring-1 focus:ring-[#B29261]"
                >
                  <option value="jira">Jira Issue</option>
                  <option value="figma">Figma Design File</option>
                  <option value="github">GitHub PR / Repo</option>
                  <option value="gdocs">Google Docs</option>
                  <option value="gsheets">Google Sheets</option>
                  <option value="gslides">Google Slides</option>
                  <option value="gdrive">Google Drive Folder</option>
                  <option value="research">Research Paper / arXiv</option>
                  <option value="other">Other Web Resource</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">
                  Link Title / Label
                </label>

                <input
                  type="text"
                  placeholder="e.g. Model Loss Curve Spreadsheet"
                  value={newLinkTitle}
                  onChange={(e) => setNewLinkTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-stone-300 bg-white focus:outline-none focus:ring-1 focus:ring-[#B29261]"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">
                  Target URL
                </label>

                <input
                  type="url"
                  placeholder="https://..."
                  value={newLinkUrl}
                  onChange={(e) => setNewLinkUrl(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-stone-300 bg-white focus:outline-none focus:ring-1 focus:ring-[#B29261]"
                  required
                />
              </div>

              {fileError && (
                <p className="text-rose-700 text-[11px]">
                  {fileError}
                </p>
              )}

              <div className="pt-2 flex justify-end space-x-2">

                <button
                  type="button"
                  onClick={() => setShowLinkModal(false)}
                  className="px-3.5 py-2 font-medium text-stone-600 hover:bg-stone-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="px-4 py-2 font-bold bg-[#192B16] text-[#FEFCF7] hover:bg-[#243E20] rounded-lg transition-colors shadow-sm"
                >
                  Add Link
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
