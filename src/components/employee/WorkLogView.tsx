import React, { useState } from 'react';
import {
  FileText,
  Plus,
  Link2,
  Paperclip,
  Check,
  ExternalLink,
  Trash2,
  Clock,
  Save,
  Send,
  AlertCircle,
  FileCheck,
  History,
  Building2,
  Laptop,
  X,
  FileSpreadsheet,
  FileCode,
  FileText as FileIcon,
  Image as ImageIcon,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  WorkLog,
  WorkLogResource,
  ResourceType,
  AttendanceRecord,
} from '../../types';
import { getTodayDateString, formatDate, formatTime } from '../../lib/utils';
import { workLogService } from '../../services/workLogService';

interface WorkLogViewProps {
  workLogs: WorkLog[];
  todayAttendance: AttendanceRecord | null;
  onRefreshData: () => void;
}

export const WorkLogView: React.FC<WorkLogViewProps> = ({
  workLogs,
  todayAttendance,
  onRefreshData,
}) => {
  const { currentUser } = useAuth();
  const [selectedLog, setSelectedLog] = useState<WorkLog | null>(null);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'editor' | 'list'>('editor');
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string>('');

  // Form State
  const [date, setDate] = useState<string>(getTodayDateString());
  const [jiraTaskId, setJiraTaskId] = useState<string>('');
  const [jiraTaskUrl, setJiraTaskUrl] = useState<string>('');
  const [workUndertaken, setWorkUndertaken] = useState<string>('');
  const [workCompleted, setWorkCompleted] = useState<string>('');
  const [pendingWork, setPendingWork] = useState<string>('');
  const [blockers, setBlockers] = useState<string>('');
  const [remarks, setRemarks] = useState<string>('');
  const [resources, setResources] = useState<WorkLogResource[]>([]);

  // Link Dialog State
  const [showLinkModal, setShowLinkModal] = useState<boolean>(false);
  const [newLinkTitle, setNewLinkTitle] = useState<string>('');
  const [newLinkUrl, setNewLinkUrl] = useState<string>('');
  const [newLinkType, setNewLinkType] = useState<ResourceType>('jira');

  // File Upload State
  const [fileError, setFileError] = useState<string>('');

  const resetForm = () => {
    setSelectedLog(null);
    setIsEditing(false);
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
  };

  const handleSelectLogForReview = (log: WorkLog) => {
    setSelectedLog(log);
    setDate(log.date);
    setJiraTaskId(log.jiraTaskId || '');
    setJiraTaskUrl(log.jiraTaskUrl || '');
    setWorkUndertaken(log.workUndertaken);
    setWorkCompleted(log.workCompleted);
    setPendingWork(log.pendingWork);
    setBlockers(log.blockers);
    setRemarks(log.remarks || '');
    setResources(log.resources || []);
    setIsEditing(false);
    setActiveTab('editor');
  };

  const handleEditExisting = () => {
    setIsEditing(true);
  };

  const handleAddLinkResource = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLinkTitle || !newLinkUrl) return;

    const res: WorkLogResource = {
      id: `res_${Date.now()}`,
      resourceId: `res_${Date.now()}`,
      workLogId: selectedLog?.workLogId || 'new',
      employeeId: currentUser?.uid || '',
      title: newLinkTitle,
      url: newLinkUrl,
      resourceType: newLinkType,
      createdAt: new Date().toISOString(),
    };

    setResources([...resources, res]);
    setNewLinkTitle('');
    setNewLinkUrl('');
    setShowLinkModal(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    setFileError('');

    // Allowed types: PDF, DOCX, XLSX, CSV, PNG, JPG, JPEG
    const allowedExtensions = ['pdf', 'docx', 'xlsx', 'csv', 'png', 'jpg', 'jpeg'];
    const ext = file.name.split('.').pop()?.toLowerCase();

    if (!ext || !allowedExtensions.includes(ext)) {
      setFileError('Invalid file type. Allowed: PDF, DOCX, XLSX, CSV, PNG, JPG, JPEG.');
      return;
    }

    // Max 10MB
    if (file.size > 10 * 1024 * 1024) {
      setFileError('File size exceeds the 10MB limit.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64Data = reader.result as string;
      const res: WorkLogResource = {
        id: `res_file_${Date.now()}`,
        resourceId: `res_file_${Date.now()}`,
        workLogId: selectedLog?.workLogId || 'new',
        employeeId: currentUser?.uid || '',
        title: file.name,
        fileName: file.name,
        fileSize: file.size,
        fileDataUrl: base64Data,
        resourceType: 'file',
        createdAt: new Date().toISOString(),
      };
      setResources((prev) => [...prev, res]);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveResource = (id: string) => {
    setResources(resources.filter((r) => r.id !== id));
  };

  const handleSave = async (submissionStatus: 'draft' | 'submitted') => {
    if (!currentUser) return;
    if (!workUndertaken.trim() || !workCompleted.trim()) {
      alert('Please fill out the "Work Undertaken" and "Work Accomplished" fields.');
      return;
    }

    const workLogId = selectedLog?.workLogId || `wl_${currentUser.uid}_${Date.now()}`;
    const isRevision = !!selectedLog && selectedLog.submissionStatus !== 'draft';

    const payload: WorkLog = {
      id: workLogId,
      workLogId,
      employeeId: currentUser.uid,
      employeeName: currentUser.name,
      employeeEmail: currentUser.email,
      department: currentUser.department,
      attendanceId: todayAttendance?.attendanceId,
      sessionId: todayAttendance?.activeSessionId,
      date,
      loginTime: todayAttendance?.firstCheckIn,
      logoutTime: todayAttendance?.lastCheckOut,
      jiraTaskId: jiraTaskId.trim() || undefined,
      jiraTaskUrl: jiraTaskUrl.trim() || undefined,
      workUndertaken,
      workCompleted,
      pendingWork,
      blockers,
      remarks,
      submissionStatus,
      resources,
      createdAt: selectedLog?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      await workLogService.createOrUpdateWorkLog(payload, isRevision);
      setSaveSuccessMsg(
        submissionStatus === 'submitted'
          ? 'Daily work log successfully submitted for administrative review!'
          : 'Work log draft saved successfully.'
      );
      setIsEditing(false);
      setSelectedLog(payload);
      onRefreshData();
      setTimeout(() => setSaveSuccessMsg(''), 4500);
    } catch (err) {
      console.error('Error saving work log:', err);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Top Header & Subtabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E8E2D3] pb-4">
        <div>
          <h1 className="text-xl font-bold text-[#192B16] flex items-center">
            <FileText className="w-5 h-5 text-[#B29261] mr-2" />
            Daily Work Log System
          </h1>
          <p className="text-xs text-stone-600 mt-1">
            Record task progress, deliverables, Jira ticket associations, and supporting files.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <div className="flex items-center bg-[#F7F4EC] p-1 rounded-xl border border-[#E8E2D3]">
            <button
              onClick={() => setActiveTab('editor')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'editor'
                  ? 'bg-[#192B16] text-[#FEFCF7] shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              {selectedLog ? 'Work Log Details' : 'New Log Entry'}
            </button>
            <button
              onClick={() => setActiveTab('list')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'list'
                  ? 'bg-[#192B16] text-[#FEFCF7] shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Submitted Logs ({workLogs.length})
            </button>
          </div>

          <button
            onClick={resetForm}
            className="flex items-center space-x-1.5 bg-[#B29261] hover:bg-[#CDB487] text-[#192B16] px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create New Log</span>
          </button>
        </div>
      </div>

      {/* Success Notification Banner */}
      {saveSuccessMsg && (
        <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-3.5 flex items-center space-x-3 text-emerald-800 text-xs shadow-xs animate-in fade-in duration-200">
          <Check className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="font-medium">{saveSuccessMsg}</span>
        </div>
      )}

      {/* Main Form Editor Tab */}
      {activeTab === 'editor' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-[#FEFCF7] border border-[#E8E2D3] rounded-2xl p-6 shadow-xs space-y-5">
            {/* Context Info Banner */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-[#F7F4EC] rounded-xl border border-[#E8E2D3] text-xs">
              <div>
                <span className="text-stone-500">Employee:</span>{' '}
                <span className="font-bold text-[#192B16]">{currentUser?.name}</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-stone-500">Date:</span>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  disabled={!isEditing && !!selectedLog}
                  className="bg-white border border-stone-300 rounded px-2 py-0.5 text-xs font-semibold text-stone-800 focus:outline-none focus:ring-1 focus:ring-[#B29261]"
                />
              </div>
            </div>

            {/* Jira Task Section */}
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
                  disabled={!isEditing && !!selectedLog}
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
                    disabled={!isEditing && !!selectedLog}
                    className="flex-1 text-xs px-3 py-2 rounded-lg border border-stone-300 bg-white focus:outline-none focus:ring-1 focus:ring-[#B29261] disabled:bg-stone-50"
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

            {/* Work Undertaken */}
            <div>
              <label className="block text-xs font-bold text-[#192B16] mb-1">
                Work Undertaken <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={3}
                placeholder="Detailed summary of experimental, architectural, or development tasks initiated today..."
                value={workUndertaken}
                onChange={(e) => setWorkUndertaken(e.target.value)}
                disabled={!isEditing && !!selectedLog}
                className="w-full text-xs px-3 py-2 rounded-lg border border-stone-300 bg-white focus:outline-none focus:ring-1 focus:ring-[#B29261] disabled:bg-stone-50"
              />
            </div>

            {/* Work Accomplished */}
            <div>
              <label className="block text-xs font-bold text-[#192B16] mb-1">
                Work Accomplished / Deliverables <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={3}
                placeholder="Specific milestones hit, test outcomes, PR merges, hardware verification completed..."
                value={workCompleted}
                onChange={(e) => setWorkCompleted(e.target.value)}
                disabled={!isEditing && !!selectedLog}
                className="w-full text-xs px-3 py-2 rounded-lg border border-stone-300 bg-white focus:outline-none focus:ring-1 focus:ring-[#B29261] disabled:bg-stone-50"
              />
            </div>

            {/* Pending Work & Blockers in 2 Cols */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#192B16] mb-1">
                  Pending Work (Next Steps)
                </label>
                <textarea
                  rows={2}
                  placeholder="Remaining items queued for tomorrow's session..."
                  value={pendingWork}
                  onChange={(e) => setPendingWork(e.target.value)}
                  disabled={!isEditing && !!selectedLog}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-stone-300 bg-white focus:outline-none focus:ring-1 focus:ring-[#B29261] disabled:bg-stone-50"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#192B16] mb-1">
                  Challenges or Blockers
                </label>
                <textarea
                  rows={2}
                  placeholder="Hardware delays, lab dependencies, cluster access or code review blockers..."
                  value={blockers}
                  onChange={(e) => setBlockers(e.target.value)}
                  disabled={!isEditing && !!selectedLog}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-stone-300 bg-white focus:outline-none focus:ring-1 focus:ring-[#B29261] disabled:bg-stone-50"
                />
              </div>
            </div>

            {/* Additional Remarks */}
            <div>
              <label className="block text-xs font-bold text-[#192B16] mb-1">
                Additional Remarks
              </label>
              <input
                type="text"
                placeholder="Optional notes for team or administrator..."
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                disabled={!isEditing && !!selectedLog}
                className="w-full text-xs px-3 py-2 rounded-lg border border-stone-300 bg-white focus:outline-none focus:ring-1 focus:ring-[#B29261] disabled:bg-stone-50"
              />
            </div>

            {/* Admin Review Feedback (if present) */}
            {selectedLog?.reviewRemarks && (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs">
                <div className="font-bold text-emerald-900 mb-1 flex items-center">
                  <FileCheck className="w-4 h-4 mr-1 text-emerald-700" />
                  Reviewed by {selectedLog.reviewedBy || 'Admin'}:
                </div>
                <p className="text-emerald-800">{selectedLog.reviewRemarks}</p>
                <span className="text-[10px] text-emerald-600 block mt-1">
                  Reviewed at {formatTime(selectedLog.reviewedAt)} on {formatDate(selectedLog.reviewedAt)}
                </span>
              </div>
            )}

            {/* Revision History (if any) */}
            {selectedLog?.revisions && selectedLog.revisions.length > 0 && (
              <div className="border border-[#E8E2D3] p-3 rounded-xl bg-[#F7F4EC]/60 text-xs">
                <div className="font-bold text-[#192B16] mb-2 flex items-center">
                  <History className="w-3.5 h-3.5 text-[#B29261] mr-1.5" />
                  Revision Audit History ({selectedLog.revisions.length} updates recorded)
                </div>
                <div className="space-y-2 max-h-36 overflow-y-auto">
                  {selectedLog.revisions.map((rev, idx) => (
                    <div key={idx} className="p-2 bg-white rounded border border-[#E8E2D3] text-[11px]">
                      <span className="font-semibold text-stone-700">
                        {formatTime(rev.timestamp)} - edited by {rev.editedBy}
                      </span>
                      <p className="text-stone-600 line-clamp-1 mt-0.5">
                        <span className="font-semibold">Previous Work:</span> {rev.workUndertaken}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions Bar */}
            <div className="pt-4 border-t border-[#E8E2D3] flex flex-wrap items-center justify-between gap-3">
              <div className="text-xs text-stone-500">
                {selectedLog && (
                  <span>
                    Status:{' '}
                    <strong className="capitalize text-stone-800">
                      {selectedLog.submissionStatus}
                    </strong>
                  </span>
                )}
              </div>

              <div className="flex items-center space-x-2">
                {selectedLog && !isEditing ? (
                  <button
                    type="button"
                    onClick={handleEditExisting}
                    className="px-4 py-2 text-xs font-bold bg-[#192B16] text-[#FEFCF7] hover:bg-[#243E20] rounded-xl transition-all shadow-sm"
                  >
                    Edit / Revise Submission
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => handleSave('draft')}
                      className="px-4 py-2 text-xs font-semibold bg-stone-100 hover:bg-stone-200 text-stone-800 border border-stone-300 rounded-xl transition-all flex items-center space-x-1.5"
                    >
                      <Save className="w-3.5 h-3.5 text-stone-600" />
                      <span>Save Draft</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSave('submitted')}
                      className="px-5 py-2 text-xs font-bold bg-[#192B16] hover:bg-[#243E20] text-[#FEFCF7] rounded-xl transition-all shadow-sm flex items-center space-x-1.5"
                    >
                      <Send className="w-3.5 h-3.5 text-[#B29261]" />
                      <span>Submit Work Log</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Supporting Links & File Attachments */}
          <div className="space-y-6">
            {/* Supporting Links Card */}
            <div className="bg-[#FEFCF7] border border-[#E8E2D3] rounded-2xl p-5 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#192B16] flex items-center">
                  <Link2 className="w-4 h-4 text-[#B29261] mr-1.5" />
                  Supporting Links ({resources.filter((r) => r.url).length})
                </h3>
                {(!selectedLog || isEditing) && (
                  <button
                    onClick={() => setShowLinkModal(true)}
                    className="text-xs text-[#B29261] hover:text-[#917448] font-bold flex items-center"
                  >
                    <Plus className="w-3.5 h-3.5 mr-0.5" /> Add Link
                  </button>
                )}
              </div>
              <p className="text-[11px] text-stone-500 mb-3">
                Add references to Jira, Figma, GitHub PRs, Google Docs, or scientific papers.
              </p>

              <div className="space-y-2">
                {resources
                  .filter((r) => r.url)
                  .map((res) => (
                    <div
                      key={res.id}
                      className="p-2.5 rounded-xl border border-[#E8E2D3] bg-[#F7F4EC] flex items-center justify-between text-xs"
                    >
                      <div className="min-w-0 pr-2">
                        <span className="font-semibold text-stone-800 block truncate">
                          {res.title}
                        </span>
                        <span className="text-[10px] text-stone-500 block truncate capitalize">
                          {res.resourceType} • {res.url}
                        </span>
                      </div>
                      <div className="flex items-center space-x-1.5 shrink-0">
                        <a
                          href={res.url}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1 text-[#B29261] hover:text-[#917448]"
                          title="Open Link"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                        {(!selectedLog || isEditing) && (
                          <button
                            onClick={() => handleRemoveResource(res.id)}
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

            {/* Document & File Attachments Card */}
            <div className="bg-[#FEFCF7] border border-[#E8E2D3] rounded-2xl p-5 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#192B16] flex items-center">
                  <Paperclip className="w-4 h-4 text-[#B29261] mr-1.5" />
                  File Attachments ({resources.filter((r) => r.fileName).length})
                </h3>
              </div>
              <p className="text-[11px] text-stone-500 mb-3">
                Attach test datasets, schematics, logs, or exports (PDF, DOCX, XLSX, CSV, PNG, JPG). Max 10MB.
              </p>

              {fileError && (
                <div className="mb-3 text-[11px] text-red-600 bg-red-50 p-2 rounded border border-red-200">
                  {fileError}
                </div>
              )}

              {(!selectedLog || isEditing) && (
                <label className="cursor-pointer block border-2 border-dashed border-[#B29261]/40 hover:border-[#B29261] rounded-xl p-4 text-center bg-[#F7F4EC]/50 hover:bg-[#F7F4EC] transition-all mb-3">
                  <Paperclip className="w-5 h-5 text-[#B29261] mx-auto mb-1" />
                  <span className="text-xs font-bold text-[#192B16] block">Upload Document or Image</span>
                  <span className="text-[10px] text-stone-500">Click to browse your device</span>
                  <input
                    type="file"
                    className="hidden"
                    accept=".pdf,.docx,.xlsx,.csv,.png,.jpg,.jpeg"
                    onChange={handleFileUpload}
                  />
                </label>
              )}

              <div className="space-y-2">
                {resources
                  .filter((r) => r.fileName)
                  .map((res) => (
                    <div
                      key={res.id}
                      className="p-2.5 rounded-xl border border-[#E8E2D3] bg-[#F7F4EC] flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center space-x-2 min-w-0 pr-2">
                        <FileIcon className="w-4 h-4 text-[#B29261] shrink-0" />
                        <div className="truncate">
                          <span className="font-semibold text-stone-800 block truncate">
                            {res.fileName}
                          </span>
                          <span className="text-[10px] text-stone-500">
                            {res.fileSize ? `${Math.round(res.fileSize / 1024)} KB` : 'Attached'}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-1.5 shrink-0">
                        {res.fileDataUrl && (
                          <a
                            href={res.fileDataUrl}
                            download={res.fileName}
                            className="p-1 text-[#B29261] hover:text-[#917448]"
                            title="Download / View"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                        {(!selectedLog || isEditing) && (
                          <button
                            onClick={() => handleRemoveResource(res.id)}
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

      {/* Submitted Logs List Tab */}
      {activeTab === 'list' && (
        <div className="bg-[#FEFCF7] border border-[#E8E2D3] rounded-2xl p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-sm text-[#192B16]">Your Submitted Work Logs</h3>
            <span className="text-xs text-stone-500">{workLogs.length} entries</span>
          </div>

          <div className="space-y-3">
            {workLogs.map((log) => (
              <div
                key={log.workLogId}
                className="p-4 rounded-xl border border-[#E8E2D3] bg-[#F7F4EC]/40 hover:bg-[#F7F4EC] transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer"
                onClick={() => handleSelectLogForReview(log)}
              >
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-xs text-[#192B16]">{formatDate(log.date)}</span>
                    {log.jiraTaskId && (
                      <span className="text-[10px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded font-mono font-bold">
                        {log.jiraTaskId}
                      </span>
                    )}
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                        log.submissionStatus === 'reviewed'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {log.submissionStatus}
                    </span>
                  </div>
                  <p className="text-xs text-stone-700 font-medium line-clamp-1">
                    {log.workCompleted || log.workUndertaken}
                  </p>
                  <div className="flex items-center space-x-3 text-[11px] text-stone-500">
                    <span>{log.resources?.length || 0} attachments</span>
                    {log.revisions && log.revisions.length > 0 && (
                      <span>• {log.revisions.length} revisions</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-2 shrink-0">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectLogForReview(log);
                    }}
                    className="px-3.5 py-1.5 text-xs font-semibold bg-[#192B16] text-[#FEFCF7] hover:bg-[#243E20] rounded-lg transition-colors"
                  >
                    View Details
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add Link Modal */}
      {showLinkModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-[#FEFCF7] rounded-xl border border-[#E8E2D3] p-6 max-w-md w-full shadow-xl">
            <h3 className="text-base font-bold text-[#192B16]">Add Supporting Link</h3>
            <p className="text-xs text-stone-600 mt-1">
              Link external repositories, design boards, Google Docs, or Jira issues.
            </p>

            <form onSubmit={handleAddLinkResource} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-stone-700 mb-1">Resource Category</label>
                <select
                  value={newLinkType}
                  onChange={(e) => setNewLinkType(e.target.value as ResourceType)}
                  className="w-full px-3 py-2 rounded-lg border border-stone-300 bg-white focus:outline-none focus:ring-1 focus:ring-[#B29261]"
                >
                  <option value="jira">Jira Issue</option>
                  <option value="figma">Figma Design File</option>
                  <option value="github">GitHub PR / Repo</option>
                  <option value="gdocs">Google Docs</option>
                  <option value="gsheets">Google Sheets</option>
                  <option value="gslides">Google Slides</option>
                  <option value="gdrive">Google Drive Folder</option>
                  <option value="research">Scientific Research Paper / arXiv</option>
                  <option value="other">Other Web Resource</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">Link Title / Label</label>
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
                <label className="block font-semibold text-stone-700 mb-1">Target URL</label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={newLinkUrl}
                  onChange={(e) => setNewLinkUrl(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-stone-300 bg-white focus:outline-none focus:ring-1 focus:ring-[#B29261]"
                  required
                />
              </div>

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
