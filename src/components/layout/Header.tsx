import React, { useState, useEffect } from 'react';
import {
  Bell,
  Play,
  Coffee,
  Square,
  Clock,
  Laptop,
  Building2,
  Calendar,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { AttendanceRecord, WorkMode } from '../../types';
import { formatDuration } from '../../lib/utils';
import { adminService } from '../../services/adminService';

interface HeaderProps {
  todayAttendance: AttendanceRecord | null;
  onCheckIn: (mode: WorkMode) => void;
  onStartBreak: () => void;
  onEndBreak: () => void;
  onCheckOut: () => void;
  onToggleNotifications: () => void;
  unreadNotificationsCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  todayAttendance,
  onCheckIn,
  onStartBreak,
  onEndBreak,
  onCheckOut,
  onToggleNotifications,
  unreadNotificationsCount,
}) => {
  const { currentUser, isAdmin } = useAuth();
  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDateFormatted, setCurrentDateFormatted] = useState<string>('');
  const [liveWorkingSeconds, setLiveWorkingSeconds] = useState<number>(0);
  const [selectedMode, setSelectedMode] = useState<WorkMode>('office');
  const [showModeModal, setShowModeModal] = useState<boolean>(false);

  // Live clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      );
      setCurrentDateFormatted(
        now.toLocaleDateString('en-US', {
          weekday: 'long',
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Live session timer calculation
  useEffect(() => {
    const timer = setInterval(() => {
      if (!todayAttendance) {
        setLiveWorkingSeconds(0);
        return;
      }

      let currentSecs = todayAttendance.totalWorkingSeconds || 0;
      if (todayAttendance.status === 'checked_in' && todayAttendance.currentSessionStart) {
        const sessionSecs = Math.max(
          0,
          Math.floor(
            (Date.now() - new Date(todayAttendance.currentSessionStart).getTime()) / 1000
          )
        );
        currentSecs += sessionSecs;
      }
      setLiveWorkingSeconds(currentSecs);
    }, 1000);

    return () => clearInterval(timer);
  }, [todayAttendance]);

  const targetAchieved = liveWorkingSeconds >= 10800; // 3 hours

  return (
    <header className="h-16 bg-[#FEFCF7] border-b border-[#E8E2D3] px-3 sm:px-6 flex items-center justify-between sticky top-0 z-20">
      {/* Left: Date & Time */}
      <div className="flex items-center space-x-2 sm:space-x-4">
        <div className="flex items-center space-x-1.5 text-stone-600">
          <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#B29261]" />
          <span className="text-[11px] sm:text-xs font-medium text-stone-700 truncate max-w-[120px] sm:max-w-none">
            {currentDateFormatted}
          </span>
        </div>
        <div className="hidden md:flex items-center space-x-1.5 text-stone-500 bg-[#F7F4EC] px-2.5 py-1 rounded-md border border-[#E8E2D3]/60 text-xs font-mono">
          <Clock className="w-3.5 h-3.5 text-[#B29261]" />
          <span className="font-semibold text-stone-800">{currentTime}</span>
        </div>
      </div>

      {/* Center: Live Timer and Work Status */}
      <div className="flex items-center space-x-2 sm:space-x-3">
        {todayAttendance ? (
          <div className="flex items-center space-x-1.5 sm:space-x-2 bg-[#F7F4EC] border border-[#E8E2D3] px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg">
            <div className="hidden xs:inline text-[11px] sm:text-xs text-stone-500 font-medium">Session:</div>
            <div className="font-mono font-bold text-xs sm:text-sm text-[#192B16]">
              {formatDuration(liveWorkingSeconds, 'hms')}
            </div>
            {targetAchieved ? (
              <span className="flex items-center text-[9px] sm:text-[10px] font-semibold text-emerald-800 bg-emerald-100 border border-emerald-300 px-1 sm:px-1.5 py-0.5 rounded">
                <CheckCircle2 className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-0.5 text-emerald-600" /> Met
              </span>
            ) : (
              <span className="text-[9px] sm:text-[10px] text-amber-800 bg-amber-50 border border-amber-200 px-1 sm:px-1.5 py-0.5 rounded font-medium">
                {formatDuration(10800 - liveWorkingSeconds, 'short')} left
              </span>
            )}
          </div>
        ) : (
          <div className="hidden md:flex items-center text-xs text-stone-500 italic bg-[#F7F4EC] px-3 py-1 rounded border border-[#E8E2D3]/50">
            Not checked in today
          </div>
        )}

        {/* Quick Action Buttons (Check In / Break / Check Out) */}
        {!todayAttendance || todayAttendance.status === 'checked_out' ? (
          <button
            onClick={() => setShowModeModal(true)}
            className="flex items-center space-x-1 sm:space-x-1.5 bg-[#192B16] hover:bg-[#243E20] text-[#FEFCF7] px-2.5 sm:px-3.5 py-1.5 rounded-lg text-xs font-semibold shadow-sm transition-all"
          >
            <Play className="w-3.5 h-3.5 text-[#B29261]" />
            <span>Check In</span>
          </button>
        ) : todayAttendance.status === 'checked_in' ? (
          <div className="flex items-center space-x-1 sm:space-x-2">
            <button
              onClick={onStartBreak}
              className="flex items-center space-x-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 px-2 sm:px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all"
              title="Pause timer for break"
            >
              <Coffee className="w-3.5 h-3.5 text-amber-600" />
              <span className="hidden sm:inline">Take Break</span>
              <span className="sm:hidden">Break</span>
            </button>
            <button
              onClick={onCheckOut}
              className="flex items-center space-x-1 bg-stone-100 hover:bg-stone-200 text-stone-800 border border-stone-300 px-2 sm:px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all"
            >
              <Square className="w-3.5 h-3.5 text-red-600" />
              <span className="hidden sm:inline">Check Out</span>
              <span className="sm:hidden">Out</span>
            </button>
          </div>
        ) : (
          /* on_break */
          <div className="flex items-center space-x-1 sm:space-x-2">
            <button
              onClick={onEndBreak}
              className="flex items-center space-x-1 bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold shadow-sm animate-pulse transition-all"
            >
              <Play className="w-3.5 h-3.5" />
              <span>Resume</span>
            </button>
            <button
              onClick={onCheckOut}
              className="flex items-center space-x-1 bg-stone-100 hover:bg-stone-200 text-stone-800 border border-stone-300 px-2 sm:px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all"
            >
              <Square className="w-3.5 h-3.5 text-red-600" />
              <span className="hidden sm:inline">Check Out</span>
              <span className="sm:hidden">Out</span>
            </button>
          </div>
        )}
      </div>

      {/* Right: Notifications & Profile */}
      <div className="flex items-center space-x-2 sm:space-x-3">
        <button
          onClick={onToggleNotifications}
          className="relative p-1.5 sm:p-2 text-stone-600 hover:text-stone-900 hover:bg-[#F7F4EC] rounded-full transition-colors border border-[#E8E2D3]"
          title="Notifications"
        >
          <Bell className="w-4 h-4 text-[#192B16]" />
          {unreadNotificationsCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 bg-[#B29261] text-[#192B16] text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center border border-white">
              {unreadNotificationsCount}
            </span>
          )}
        </button>

        <div className="hidden sm:flex items-center space-x-2 pl-2 border-l border-[#E8E2D3]">
          <div className="text-right">
            <p className="text-xs font-semibold text-[#192B16] leading-none">{currentUser?.name}</p>
            <p className="text-[10px] text-[#B29261] font-medium uppercase mt-0.5">
              {currentUser?.role}
            </p>
          </div>
          <div className="w-8 h-8 rounded-full bg-[#192B16] text-[#B29261] font-bold text-xs flex items-center justify-center border border-[#B29261]">
            {currentUser?.name?.charAt(0) || 'U'}
          </div>
        </div>
      </div>

      {/* Work Mode Selection Modal */}
      {showModeModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-[#FEFCF7] rounded-xl border border-[#E8E2D3] p-6 max-w-sm w-full shadow-xl animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-base font-bold text-[#192B16]">Start Work Session</h3>
            <p className="text-xs text-stone-600 mt-1">
              Select your work model for today's session. Your choice will be logged with your attendance record.
            </p>

            <div className="grid grid-cols-2 gap-3 mt-4">
              <button
                type="button"
                onClick={() => setSelectedMode('office')}
                className={`p-3 rounded-lg border text-left transition-all ${
                  selectedMode === 'office'
                    ? 'border-[#B29261] bg-[#F7EFE1] text-[#192B16]'
                    : 'border-stone-200 hover:border-stone-300 text-stone-600'
                }`}
              >
                <Building2 className={`w-5 h-5 mb-1 ${selectedMode === 'office' ? 'text-[#B29261]' : 'text-stone-400'}`} />
                <div className="text-xs font-bold">Office</div>
                <div className="text-[10px] text-stone-500">Teara HQ Lab</div>
              </button>

              <button
                type="button"
                onClick={() => setSelectedMode('home')}
                className={`p-3 rounded-lg border text-left transition-all ${
                  selectedMode === 'home'
                    ? 'border-[#B29261] bg-[#F7EFE1] text-[#192B16]'
                    : 'border-stone-200 hover:border-stone-300 text-stone-600'
                }`}
              >
                <Laptop className={`w-5 h-5 mb-1 ${selectedMode === 'home' ? 'text-[#B29261]' : 'text-stone-400'}`} />
                <div className="text-xs font-bold">Home</div>
                <div className="text-[10px] text-stone-500">Remote Station</div>
              </button>
            </div>

            <div className="mt-6 flex space-x-2 justify-end">
              <button
                type="button"
                onClick={() => setShowModeModal(false)}
                className="px-3.5 py-2 text-xs font-medium text-stone-600 hover:bg-stone-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onCheckIn(selectedMode);
                  setShowModeModal(false);
                }}
                className="px-4 py-2 text-xs font-bold bg-[#192B16] text-[#FEFCF7] hover:bg-[#243E20] rounded-lg transition-colors shadow-sm"
              >
                Confirm & Check In
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
