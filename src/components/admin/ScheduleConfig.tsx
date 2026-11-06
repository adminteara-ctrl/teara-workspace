import React, { useState, useEffect } from 'react';
import {
  Sliders,
  Save,
  Check,
  Calendar,
  Clock,
  Laptop,
  Building2,
  Layers,
} from 'lucide-react';
import { WorkScheduleConfig } from '../../types';
import { adminService } from '../../services/adminService';

export const ScheduleConfig: React.FC = () => {
  const [schedule, setSchedule] = useState<WorkScheduleConfig | null>(null);
  const [dailyHours, setDailyHours] = useState<number>(3.0);
  const [weeklyHours, setWeeklyHours] = useState<number>(18.0);
  const [workModel, setWorkModel] = useState<'hybrid' | 'office' | 'remote'>('hybrid');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    async function loadConfig() {
      const config = await adminService.getScheduleConfig();
      setSchedule(config);
      setDailyHours(config.dailyMinimumSeconds / 3600);
      setWeeklyHours(config.weeklyMinimumSeconds / 3600);
      setWorkModel(config.workModel);
    }
    loadConfig();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schedule) return;

    const updated: WorkScheduleConfig = {
      ...schedule,
      dailyMinimumSeconds: Math.round(dailyHours * 3600),
      weeklyMinimumSeconds: Math.round(weeklyHours * 3600),
      workModel,
      effectiveFrom: new Date().toISOString().split('T')[0],
    };

    await adminService.updateScheduleConfig(updated);
    setSchedule(updated);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const dayNames = ['Sun (Weekly Off)', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="border-b border-[#E8E2D3] pb-4">
        <h1 className="text-xl font-bold text-[#192B16] flex items-center">
          <Sliders className="w-5 h-5 text-[#B29261] mr-2" />
          Work Schedule & Attendance Policy Configuration
        </h1>
        <p className="text-xs text-stone-600 mt-1">
          Define core working day rules, daily minimum working hour targets, and weekly contribution policies for Teara.
        </p>
      </div>

      {saved && (
        <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-3 text-xs text-emerald-800 flex items-center space-x-2">
          <Check className="w-4 h-4 text-emerald-600" />
          <span>Work policy and schedule thresholds updated successfully.</span>
        </div>
      )}

      <div className="bg-[#FEFCF7] border border-[#E8E2D3] rounded-2xl p-6 shadow-xs">
        <form onSubmit={handleSave} className="space-y-6 text-xs">
          {/* Working Days Matrix */}
          <div>
            <label className="block font-bold text-[#192B16] mb-2 uppercase tracking-wider text-[11px]">
              Active Working Days & Weekly Off
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
              {dayNames.map((name, idx) => {
                const isWorkingDay = idx !== 0; // Monday-Saturday
                return (
                  <div
                    key={name}
                    className={`p-3 rounded-xl border text-center ${
                      isWorkingDay
                        ? 'border-[#B29261] bg-[#F7EFE1] text-[#192B16] font-bold'
                        : 'border-stone-200 bg-stone-50 text-stone-400 font-medium'
                    }`}
                  >
                    <span className="block text-xs">{name}</span>
                    <span className="text-[10px] mt-1 block">
                      {isWorkingDay ? 'Working Day' : 'Designated Off'}
                    </span>
                  </div>
                );
              })}
            </div>
            <span className="text-[10px] text-stone-500 mt-1.5 block">
              Per Teara schedule policy: Sunday is the official weekly off and does not count against weekly targets.
            </span>
          </div>

          {/* Threshold Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-4 border-t border-[#E8E2D3]">
            <div>
              <label className="block font-bold text-[#192B16] mb-1">
                Minimum Daily Working Hours Target
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="number"
                  step="0.5"
                  min="1"
                  max="12"
                  value={dailyHours}
                  onChange={(e) => setDailyHours(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg border border-stone-300 bg-white font-mono font-bold text-sm text-[#192B16] focus:outline-none focus:ring-1 focus:ring-[#B29261]"
                />
                <span className="text-xs text-stone-600 font-semibold shrink-0">Hours/Day</span>
              </div>
              <span className="text-[10px] text-stone-500 mt-1 block">
                Standard Teara default: 3.0 hours (10,800 seconds).
              </span>
            </div>

            <div>
              <label className="block font-bold text-[#192B16] mb-1">
                Minimum Weekly Contribution Target
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="number"
                  step="1"
                  min="6"
                  max="60"
                  value={weeklyHours}
                  onChange={(e) => setWeeklyHours(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg border border-stone-300 bg-white font-mono font-bold text-sm text-[#192B16] focus:outline-none focus:ring-1 focus:ring-[#B29261]"
                />
                <span className="text-xs text-stone-600 font-semibold shrink-0">Hours/Week</span>
              </div>
              <span className="text-[10px] text-stone-500 mt-1 block">
                Standard Teara default: 18.0 hours across Mon-Sat.
              </span>
            </div>
          </div>

          {/* Work Model Configuration */}
          <div className="pt-4 border-t border-[#E8E2D3]">
            <label className="block font-bold text-[#192B16] mb-2 uppercase tracking-wider text-[11px]">
              Organizational Work Model
            </label>
            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setWorkModel('hybrid')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  workModel === 'hybrid'
                    ? 'border-[#B29261] bg-[#F7EFE1] text-[#192B16]'
                    : 'border-stone-200 text-stone-600'
                }`}
              >
                <Layers className="w-4 h-4 mb-1 text-[#B29261]" />
                <div className="font-bold">Hybrid (Default)</div>
                <div className="text-[10px] text-stone-500">Employee choice at check-in</div>
              </button>

              <button
                type="button"
                onClick={() => setWorkModel('office')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  workModel === 'office'
                    ? 'border-[#B29261] bg-[#F7EFE1] text-[#192B16]'
                    : 'border-stone-200 text-stone-600'
                }`}
              >
                <Building2 className="w-4 h-4 mb-1 text-[#B29261]" />
                <div className="font-bold">100% In-Office</div>
                <div className="text-[10px] text-stone-500">Mandatory Lab Presence</div>
              </button>

              <button
                type="button"
                onClick={() => setWorkModel('remote')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  workModel === 'remote'
                    ? 'border-[#B29261] bg-[#F7EFE1] text-[#192B16]'
                    : 'border-stone-200 text-stone-600'
                }`}
              >
                <Laptop className="w-4 h-4 mb-1 text-[#B29261]" />
                <div className="font-bold">Remote-First</div>
                <div className="text-[10px] text-stone-500">Distributed Research</div>
              </button>
            </div>
          </div>

          <div className="pt-4 flex justify-end">
            <button
              type="submit"
              className="flex items-center space-x-1.5 px-5 py-2.5 text-xs font-bold bg-[#192B16] text-[#FEFCF7] hover:bg-[#243E20] rounded-xl transition-all shadow-sm"
            >
              <Save className="w-3.5 h-3.5 text-[#B29261]" />
              <span>Save Policy Settings</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
