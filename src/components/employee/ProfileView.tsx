import React, { useState } from 'react';
import {
  User,
  Shield,
  Briefcase,
  Mail,
  Check,
  Building2,
  Laptop,
  Layers,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const ProfileView: React.FC = () => {
  const { currentUser, updateCurrentUserProfile } = useAuth();
  const [preference, setPreference] = useState<'office' | 'home' | 'hybrid'>(
    currentUser?.workModePreference || 'hybrid'
  );
  const [jobTitle, setJobTitle] = useState(currentUser?.jobTitle || '');
  const [saved, setSaved] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateCurrentUserProfile({
      workModePreference: preference,
      jobTitle,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="border-b border-[#E8E2D3] pb-4">
        <h1 className="text-xl font-bold text-[#192B16] flex items-center">
          <User className="w-5 h-5 text-[#B29261] mr-2" />
          My Profile & Work Preferences
        </h1>
        <p className="text-xs text-stone-600 mt-1">
          Manage your internal personnel details, hybrid working model preferences, and view organizational status.
        </p>
      </div>

      {saved && (
        <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-3 text-xs text-emerald-800 flex items-center space-x-2">
          <Check className="w-4 h-4 text-emerald-600" />
          <span>Profile preferences saved successfully.</span>
        </div>
      )}

      <div className="bg-[#FEFCF7] border border-[#E8E2D3] rounded-2xl p-6 shadow-xs">
        <form onSubmit={handleSave} className="space-y-5 text-xs">
          <div className="flex items-center space-x-4 pb-5 border-b border-[#E8E2D3]">
            <div className="w-16 h-16 rounded-full bg-[#192B16] text-[#B29261] font-bold text-xl flex items-center justify-center border-2 border-[#B29261]">
              {currentUser?.name?.charAt(0) || 'U'}
            </div>
            <div>
              <h2 className="text-base font-bold text-[#192B16]">{currentUser?.name}</h2>
              <p className="text-stone-500">{currentUser?.email}</p>
              <div className="flex items-center space-x-2 mt-1">
                <span className="bg-[#B29261]/20 text-[#192B16] font-semibold text-[10px] px-2 py-0.5 rounded uppercase">
                  {currentUser?.role}
                </span>
                <span className="bg-emerald-100 text-emerald-800 font-semibold text-[10px] px-2 py-0.5 rounded uppercase">
                  {currentUser?.accountStatus}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-stone-700 mb-1">Full Legal Name</label>
              <input
                type="text"
                value={currentUser?.name || ''}
                disabled
                className="w-full px-3 py-2 rounded-lg border border-stone-200 bg-stone-50 text-stone-600 font-medium cursor-not-allowed"
              />
              <span className="text-[10px] text-stone-400 mt-0.5 block">Managed by Administrator</span>
            </div>

            <div>
              <label className="block font-semibold text-stone-700 mb-1">Company Email</label>
              <input
                type="email"
                value={currentUser?.email || ''}
                disabled
                className="w-full px-3 py-2 rounded-lg border border-stone-200 bg-stone-50 text-stone-600 font-medium cursor-not-allowed"
              />
              <span className="text-[10px] text-stone-400 mt-0.5 block">Single Sign-On (SSO) Managed</span>
            </div>

            <div>
              <label className="block font-semibold text-stone-700 mb-1">Job Title / Designation</label>
              <input
                type="text"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-stone-300 bg-white focus:outline-none focus:ring-1 focus:ring-[#B29261]"
              />
            </div>
          </div>

          {/* Work Mode Preference */}
          <div className="pt-4 border-t border-[#E8E2D3]">
            <label className="block font-bold text-[#192B16] mb-2 uppercase tracking-wider text-[11px]">
              Preferred Work Model
            </label>
            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setPreference('office')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  preference === 'office'
                    ? 'border-[#B29261] bg-[#F7EFE1] text-[#192B16]'
                    : 'border-stone-200 hover:border-stone-300 text-stone-600'
                }`}
              >
                <Building2 className="w-4 h-4 mb-1 text-[#B29261]" />
                <div className="font-bold">Office</div>
                <div className="text-[10px] text-stone-500">In-person Lab</div>
              </button>

              <button
                type="button"
                onClick={() => setPreference('home')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  preference === 'home'
                    ? 'border-[#B29261] bg-[#F7EFE1] text-[#192B16]'
                    : 'border-stone-200 hover:border-stone-300 text-stone-600'
                }`}
              >
                <Laptop className="w-4 h-4 mb-1 text-[#B29261]" />
                <div className="font-bold">Remote</div>
                <div className="text-[10px] text-stone-500">Work from Home</div>
              </button>

              <button
                type="button"
                onClick={() => setPreference('hybrid')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  preference === 'hybrid'
                    ? 'border-[#B29261] bg-[#F7EFE1] text-[#192B16]'
                    : 'border-stone-200 hover:border-stone-300 text-stone-600'
                }`}
              >
                <Layers className="w-4 h-4 mb-1 text-[#B29261]" />
                <div className="font-bold">Hybrid</div>
                <div className="text-[10px] text-stone-500">Flexible Blend</div>
              </button>
            </div>
          </div>

          <div className="pt-4 flex justify-end">
            <button
              type="submit"
              className="px-5 py-2.5 text-xs font-bold bg-[#192B16] text-[#FEFCF7] hover:bg-[#243E20] rounded-xl transition-all shadow-sm"
            >
              Save Profile Preferences
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
