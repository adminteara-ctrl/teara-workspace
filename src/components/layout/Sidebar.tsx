import React from 'react';
import {
  LayoutDashboard,
  Clock,
  FileText,
  History,
  User,
  Users,
  ShieldCheck,
  CalendarCheck,
  BarChart3,
  Sliders,
  FileCheck2,
  LogOut,
  Sparkles,
  Laptop,
  Building2,
  Coffee,
} from 'lucide-react';
import { useAuth, PREDEFINED_USERS } from '../../context/AuthContext';
import { AttendanceRecord } from '../../types';

interface SidebarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  todayAttendance: AttendanceRecord | null;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  todayAttendance,
}) => {
  const { currentUser, isAdmin, signOut, switchUser, allUsers } = useAuth();

  const employeeNavItems = [
    { id: 'dashboard', label: 'My Dashboard', icon: LayoutDashboard },
    { id: 'attendance', label: 'Attendance & Clock', icon: Clock },
    { id: 'worklogs', label: 'Daily Work Logs', icon: FileText },
    { id: 'history', label: 'My History & Records', icon: History },
    { id: 'profile', label: 'My Profile', icon: User },
  ];

  const adminNavItems = [
    { id: 'admin-dashboard', label: 'Command Overview', icon: LayoutDashboard },
    { id: 'admin-employees', label: 'Employee Directory', icon: Users },
    { id: 'admin-attendance', label: 'Attendance Monitoring', icon: CalendarCheck },
    { id: 'admin-worklogs', label: 'Work Log Review', icon: FileCheck2 },
    { id: 'admin-reports', label: 'Productivity Reports', icon: BarChart3 },
    { id: 'admin-schedule', label: 'Schedule & Policy', icon: Sliders },
    { id: 'admin-audit', label: 'System Audit Trail', icon: ShieldCheck },
  ];

  const navItems = isAdmin ? adminNavItems : employeeNavItems;

  return (
    <aside className="w-64 bg-[#192B16] text-[#FEFCF7] flex flex-col h-screen border-r border-[#243E20] shrink-0 select-none">
      {/* Brand Header */}
      <div className="p-5 border-b border-[#243E20] flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#B29261] to-[#917448] flex items-center justify-center shadow-md border border-[#CDB487]/30">
            <span className="text-[#192B16] font-bold text-xl tracking-wider">T</span>
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <span className="font-semibold text-lg tracking-tight text-[#FEFCF7]">TEARA</span>
              <span className="text-[10px] bg-[#B29261]/25 text-[#CDB487] px-1.5 py-0.5 rounded font-mono font-bold tracking-wider">
                WORKHUB
              </span>
            </div>
            <p className="text-[11px] text-[#A3B89E] tracking-tight">Workforce & Productivity</p>
          </div>
        </div>
      </div>

      {/* Live Status Pill for active user */}
      {todayAttendance && (
        <div className="mx-4 mt-4 p-2.5 rounded-lg bg-[#122010] border border-[#243E20]">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[#A3B89E]">Today's Status</span>
            <span className="flex items-center space-x-1">
              {todayAttendance.workMode === 'office' ? (
                <span className="flex items-center text-[10px] text-[#CDB487] bg-[#B29261]/15 px-1.5 py-0.5 rounded">
                  <Building2 className="w-3 h-3 mr-0.5" /> Office
                </span>
              ) : (
                <span className="flex items-center text-[10px] text-[#CDB487] bg-[#B29261]/15 px-1.5 py-0.5 rounded">
                  <Laptop className="w-3 h-3 mr-0.5" /> Home
                </span>
              )}
            </span>
          </div>
          <div className="mt-1.5 flex items-center justify-between">
            <div className="flex items-center space-x-1.5">
              {todayAttendance.status === 'checked_in' ? (
                <>
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                  </span>
                  <span className="text-xs font-medium text-emerald-300">Checked In (Active)</span>
                </>
              ) : todayAttendance.status === 'on_break' ? (
                <>
                  <Coffee className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                  <span className="text-xs font-medium text-amber-300">On Break</span>
                </>
              ) : (
                <>
                  <span className="h-2 w-2 rounded-full bg-stone-400"></span>
                  <span className="text-xs font-medium text-stone-300">Checked Out</span>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Navigation Section */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        <div className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-wider text-[#7E967A]">
          {isAdmin ? 'ADMINISTRATIVE CONSOLE' : 'EMPLOYEE WORKSPACE'}
        </div>

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? 'bg-[#B29261] text-[#192B16] font-semibold shadow-sm'
                  : 'text-[#DCE8D8] hover:bg-[#243E20] hover:text-[#FEFCF7]'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-[#192B16]' : 'text-[#B29261]'}`} />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}

      </div>

      {/* Footer Profile & Sign Out */}
      <div className="p-3 border-t border-[#243E20] bg-[#122010]">
        <div className="flex items-center space-x-2.5 min-w-0 mb-2.5">
          <div className="w-8 h-8 rounded-full bg-[#B29261] text-[#192B16] font-bold text-xs flex items-center justify-center shrink-0">
            {currentUser?.name?.charAt(0) || 'U'}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-[#FEFCF7] truncate">{currentUser?.name}</p>
            <p className="text-[10px] text-[#A3B89E] truncate capitalize">
              Role: <strong className="text-[#CDB487]">{currentUser?.role}</strong>
            </p>
          </div>
        </div>

        <button
          onClick={signOut}
          className="w-full flex items-center justify-center space-x-2 py-2 px-3 bg-[#192B16] hover:bg-[#243E20] text-[#FEFCF7] rounded-lg text-xs font-bold transition-all border border-[#B29261]/40 shadow-xs cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5 text-[#B29261]" />
          <span>Log Out ({currentUser?.name})</span>
        </button>
      </div>
    </aside>
  );
};
