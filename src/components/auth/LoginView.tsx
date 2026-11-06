import React, { useState } from 'react';
import {
  Lock,
  User,
  ArrowRight,
  AlertCircle,
  Building2,
  Eye,
  EyeOff,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const LoginView: React.FC = () => {
  const { loginWithCredentials } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!username.trim() || !password.trim()) {
      setError('Please enter your username and password.');
      return;
    }

    setLoading(true);
    const success = await loginWithCredentials(username, password);
    setLoading(false);

    if (!success) {
      setError('Invalid credentials. Please verify your username and password.');
    }
  };

  return (
    <div className="min-h-screen bg-[#FEFCF7] flex flex-col justify-center py-12 sm:px-6 lg:px-8 text-[#192B16]">
      {/* Brand Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="w-14 h-14 rounded-2xl bg-[#192B16] flex items-center justify-center mx-auto shadow-md border border-[#B29261]/30">
          <span className="text-[#B29261] font-bold text-2xl tracking-wider">T</span>
        </div>
        <h1 className="mt-4 text-2xl font-bold tracking-tight text-[#192B16]">
          TEARA <span className="text-[#B29261]">WORKHUB</span>
        </h1>
        <p className="mt-1 text-xs text-stone-600">
          Internal Productivity Tracker
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white py-8 px-6 shadow-sm border border-[#E8E2D3] rounded-2xl sm:px-10">
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="border-b border-[#E8E2D3] pb-3 mb-2">
              <h2 className="text-base font-bold text-[#192B16]">Sign In</h2>

            </div>

            {error && (
              <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs p-3 rounded-xl flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-[#192B16] mb-1.5">
                Username or Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-400">
                  <User className="h-4 w-4" />
                </div>
                <input
                  type="text"
                  required
                  placeholder="Enter your username or email"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="block w-full pl-9 pr-3 py-2.5 text-xs border border-stone-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#B29261] focus:border-[#B29261]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#192B16] mb-1.5">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-400">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-9 pr-10 py-2.5 text-xs border border-stone-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#B29261] focus:border-[#B29261]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-stone-400 hover:text-stone-700 transition-colors focus:outline-none"
                  tabIndex={-1}
                  aria-label={showPassword ? 'Hide password' : 'View password'}
                  title={showPassword ? 'Hide password' : 'View password'}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center items-center space-x-2 py-2.5 px-4 border border-transparent rounded-xl shadow-xs text-xs font-bold text-[#FEFCF7] bg-[#192B16] hover:bg-[#243E20] focus:outline-none transition-all cursor-pointer mt-2"
            >
              <span>{loading ? 'Authenticating...' : 'Sign In'}</span>
              <ArrowRight className="w-4 h-4 text-[#B29261]" />
            </button>
          </form>

        </div>

        <div className="mt-6 text-center text-[11px] text-stone-400">
          Authorized Access Only
        </div>
      </div>
    </div>
  );
};
