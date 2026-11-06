import React, { useState } from 'react';
import {
  Users,
  UserPlus,
  Search,
  Filter,
  CheckCircle,
  XCircle,
  Edit2,
  KeyRound,
  Shield,
  Building2,
  Check,
  Send,
} from 'lucide-react';
import { UserProfile, AttendanceRecord } from '../../types';
import { adminService } from '../../services/adminService';
import { formatDuration } from '../../lib/utils';

interface EmployeeManagementProps {
  users: UserProfile[];
  allAttendance: AttendanceRecord[];
  onRefreshData: () => void;
}

export const EmployeeManagement: React.FC<EmployeeManagementProps> = ({
  users,
  allAttendance,
  onRefreshData,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [actionSuccessMsg, setActionSuccessMsg] = useState('');

  // Form State for Add / Edit
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    department: 'General',
    role: 'employee' as 'admin' | 'employee',
    jobTitle: '',
    workModePreference: 'hybrid' as 'office' | 'home' | 'hybrid',
  });

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.jobTitle && u.jobTitle.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = statusFilter === 'all' || u.accountStatus === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleToggleStatus = async (user: UserProfile) => {
    try {
      await adminService.toggleAccountStatus(user.uid);
      setActionSuccessMsg(
        `Employee ${user.name} is now ${user.accountStatus === 'active' ? 'deactivated' : 'activated'}.`
      );
      onRefreshData();
      setTimeout(() => setActionSuccessMsg(''), 3500);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSendPasswordReset = async (user: UserProfile) => {
    await adminService.queueNotification(
      'Password Reset Initiated',
      `A secure password reset authorization was generated for ${user.email}.`,
      'info',
      user.email
    );
    setActionSuccessMsg(`Password reset dispatch sent to ${user.email}.`);
    setTimeout(() => setActionSuccessMsg(''), 3500);
  };

  const handleOpenAdd = () => {
    setFormData({
      name: '',
      email: '',
      department: 'R&D',
      role: 'employee',
      jobTitle: '',
      workModePreference: 'hybrid',
    });
    setEditingUser(null);
    setShowAddModal(true);
  };

  const handleOpenEdit = (user: UserProfile) => {
    setEditingUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      department: user.department,
      role: user.role,
      jobTitle: user.jobTitle || '',
      workModePreference: user.workModePreference || 'hybrid',
    });
    setShowAddModal(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingUser) {
        await adminService.updateUser(editingUser.uid, {
          name: formData.name,
          department: formData.department,
          role: formData.role,
          jobTitle: formData.jobTitle,
          workModePreference: formData.workModePreference,
        });
        setActionSuccessMsg(`Profile updated for ${formData.name}.`);
      } else {
        const uid = `emp_${Date.now()}`;
        await adminService.createEmployee({
          uid,
          username: formData.email.split('@')[0].toLowerCase(),
          password: 'teara123',
          name: formData.name,
          email: formData.email,
          department: formData.department,
          role: formData.role,
          jobTitle: formData.jobTitle,
          workModePreference: formData.workModePreference,
          accountStatus: 'active',
        });
        setActionSuccessMsg(`Created new employee account for ${formData.name}. Welcome email queued.`);
      }
      setShowAddModal(false);
      onRefreshData();
      setTimeout(() => setActionSuccessMsg(''), 3500);
    } catch (err) {
      console.error(err);
    }
  };

  // Calculate employee weekly total
  const getEmployeeWeeklyTotal = (empId: string) => {
    return allAttendance
      .filter((a) => a.employeeId === empId)
      .reduce((sum, curr) => sum + (curr.totalWorkingSeconds || 0), 0);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E8E2D3] pb-4">
        <div>
          <h1 className="text-xl font-bold text-[#192B16] flex items-center">
            <Users className="w-5 h-5 text-[#B29261] mr-2" />
            Internal Employee Directory & Accounts
          </h1>
          <p className="text-xs text-stone-600 mt-1">
            Provision employee accounts, assign roles, toggle active status, and track weekly contribution.
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="flex items-center space-x-2 bg-[#192B16] hover:bg-[#243E20] text-[#FEFCF7] px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm"
        >
          <UserPlus className="w-4 h-4 text-[#B29261]" />
          <span>Provision Employee Account</span>
        </button>
      </div>

      {actionSuccessMsg && (
        <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-3 text-xs text-emerald-800 flex items-center space-x-2">
          <Check className="w-4 h-4 text-emerald-600" />
          <span>{actionSuccessMsg}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-[#FEFCF7] border border-[#E8E2D3] rounded-2xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center space-x-2 flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-stone-400" />
          <input
            type="text"
            placeholder="Search by name, email, or designation..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-transparent focus:outline-none text-stone-800"
          />
        </div>

        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1.5">
            <span className="text-stone-500 font-semibold">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-[#F7F4EC] border border-[#E8E2D3] rounded-lg px-2.5 py-1 text-stone-700 focus:outline-none"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
      </div>

      {/* Employee Table */}
      <div className="bg-[#FEFCF7] border border-[#E8E2D3] rounded-2xl p-6 shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#E8E2D3] text-stone-500 uppercase text-[10px] tracking-wider">
                <th className="pb-3 font-semibold">Employee Name & Email</th>
                <th className="pb-3 font-semibold">Designation</th>
                <th className="pb-3 font-semibold">Role</th>
                <th className="pb-3 font-semibold">Account Status</th>
                <th className="pb-3 font-semibold">Weekly Total</th>
                <th className="pb-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8E2D3]/60">
              {filteredUsers.map((user) => {
                const weeklySecs = getEmployeeWeeklyTotal(user.uid);
                const weeklyMet = weeklySecs >= 64800; // 18h
                return (
                  <tr key={user.uid} className="hover:bg-[#F7F4EC]/40">
                    <td className="py-3">
                      <div className="flex items-center space-x-2.5">
                        <div className="w-8 h-8 rounded-full bg-[#192B16] text-[#B29261] font-bold text-xs flex items-center justify-center shrink-0">
                          {user.name.charAt(0)}
                        </div>
                        <div>
                          <span className="font-bold text-[#192B16] block">{user.name}</span>
                          <span className="text-stone-500 text-[11px] font-mono">{user.email}</span>
                          {user.username && (
                            <span className="text-[10px] text-stone-400 block font-mono">
                              user: <strong className="text-stone-700">{user.username}</strong>
                              {user.password ? ` • pass: ${user.password}` : ''}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 text-stone-600">{user.jobTitle || 'Internal Staff'}</td>
                    <td className="py-3">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                          user.role === 'admin'
                            ? 'bg-[#B29261]/25 text-[#192B16]'
                            : 'bg-stone-100 text-stone-800'
                        }`}
                      >
                        {user.role}
                      </span>
                    </td>
                    <td className="py-3">
                      <button
                        onClick={() => handleToggleStatus(user)}
                        title="Click to toggle status"
                        className="group flex items-center space-x-1"
                      >
                        {user.accountStatus === 'active' ? (
                          <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 group-hover:bg-emerald-200 px-2 py-0.5 rounded flex items-center transition-colors">
                            <CheckCircle className="w-3 h-3 mr-1 text-emerald-600" /> Active
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-rose-800 bg-rose-100 group-hover:bg-rose-200 px-2 py-0.5 rounded flex items-center transition-colors">
                            <XCircle className="w-3 h-3 mr-1 text-rose-600" /> Inactive
                          </span>
                        )}
                      </button>
                    </td>
                    <td className="py-3 font-mono font-bold">
                      <span className={weeklyMet ? 'text-emerald-700' : 'text-stone-800'}>
                        {formatDuration(weeklySecs, 'short')}
                      </span>
                      <span className="text-[10px] text-stone-400 block font-normal">
                        Target: 18h
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => handleOpenEdit(user)}
                          className="p-1.5 text-stone-600 hover:text-[#192B16] hover:bg-stone-100 rounded-md transition-colors"
                          title="Edit Profile"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleSendPasswordReset(user)}
                          className="p-1.5 text-stone-600 hover:text-amber-700 hover:bg-amber-50 rounded-md transition-colors"
                          title="Trigger Password Reset Notification"
                        >
                          <KeyRound className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Employee Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-[#FEFCF7] rounded-2xl border border-[#E8E2D3] p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-base font-bold text-[#192B16]">
              {editingUser ? 'Edit Employee Information' : 'Provision Internal Employee Account'}
            </h3>
            <p className="text-xs text-stone-600 mt-1">
              Public self-registration is disabled. Administrators assign credentials and role access.
            </p>

            <form onSubmit={handleFormSubmit} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-stone-700 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dr. Cassandra Finch"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-stone-300 bg-white focus:outline-none focus:ring-1 focus:ring-[#B29261]"
                />
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">Company Email</label>
                <input
                  type="email"
                  required
                  disabled={!!editingUser}
                  placeholder="cassandra.finch@teara.internal"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-stone-300 bg-white focus:outline-none focus:ring-1 focus:ring-[#B29261] disabled:bg-stone-100"
                />
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">Role / Permissions</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                  className="w-full px-3 py-2 rounded-lg border border-stone-300 bg-white focus:outline-none focus:ring-1 focus:ring-[#B29261]"
                >
                  <option value="employee">Employee</option>
                  <option value="admin">Administrator</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">Job Title</label>
                <input
                  type="text"
                  placeholder="e.g. Lead Bio-Signals Engineer"
                  value={formData.jobTitle}
                  onChange={(e) => setFormData({ ...formData, jobTitle: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-stone-300 bg-white focus:outline-none focus:ring-1 focus:ring-[#B29261]"
                />
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3.5 py-2 font-medium text-stone-600 hover:bg-stone-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 font-bold bg-[#192B16] text-[#FEFCF7] hover:bg-[#243E20] rounded-lg transition-colors shadow-sm"
                >
                  {editingUser ? 'Save Changes' : 'Provision Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
