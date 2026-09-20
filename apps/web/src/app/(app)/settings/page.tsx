'use client';

import { User, Shield, Bell, Key, Sun, Moon, Monitor, Check } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { useUser } from '@clerk/nextjs';

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const { user } = useUser();

  const themeOptions = [
    {
      id: 'light' as const,
      label: 'Light Mode',
      desc: 'Clean, high-contrast bright theme',
      icon: Sun,
    },
    {
      id: 'dark' as const,
      label: 'Dark Mode',
      desc: 'Easy on the eyes in low-light environments',
      icon: Moon,
    },
    {
      id: 'system' as const,
      label: 'System Sync',
      desc: 'Matches your OS appearance automatically',
      icon: Monitor,
    },
  ];

  const displayName = user?.fullName || (user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : 'User');
  const userEmail = user?.primaryEmailAddress?.emailAddress || 'user@synca.io';
  const userInitials = (user?.firstName?.[0] || 'U') + (user?.lastName?.[0] || '');

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-3xl font-extrabold text-zinc-900 dark:text-zinc-100 tracking-tight">Settings</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">Manage your appearance, profile, workspace preferences, and security.</p>
      </div>

      {/* Appearance & Theme Section */}
      <div className="bg-white dark:bg-[#10141e]/65 dark:backdrop-blur-xl rounded-3xl p-6 sm:p-8 border border-zinc-200/80 dark:border-white/[0.08] shadow-sm space-y-5 transition-colors">
        <div>
          <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">Appearance & Theme</h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Choose your preferred color theme or sync automatically with your system settings.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          {themeOptions.map((opt) => {
            const Icon = opt.icon;
            const isSelected = theme === opt.id;
            return (
              <button
                key={opt.id}
                onClick={() => setTheme(opt.id)}
                className={`relative flex flex-col items-start p-4 rounded-2xl border text-left transition-all ${
                  isSelected
                    ? 'border-zinc-900 dark:border-[#d8f870] bg-zinc-50 dark:bg-white/[0.08] dark:backdrop-blur-md shadow-sm'
                    : 'border-zinc-200/80 dark:border-white/[0.08] hover:border-zinc-300 dark:hover:border-white/[0.15] bg-white dark:bg-white/[0.03] dark:backdrop-blur-md'
                }`}
              >
                {isSelected && (
                  <span className="absolute top-3 right-3 w-5 h-5 rounded-full bg-zinc-900 dark:bg-[#d8f870] text-white dark:text-zinc-950 flex items-center justify-center">
                    <Check className="w-3 h-3 stroke-[3]" />
                  </span>
                )}
                <div
                  className={`p-2.5 rounded-xl mb-3 ${
                    isSelected
                      ? 'bg-zinc-900 text-white dark:bg-[#d8f870] dark:text-zinc-950'
                      : 'bg-zinc-100 dark:bg-white/[0.06] text-zinc-600 dark:text-zinc-400'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">{opt.label}</h3>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 leading-snug">{opt.desc}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Profile & Account Details */}
      <div className="bg-white dark:bg-[#10141e]/65 dark:backdrop-blur-xl rounded-3xl p-6 sm:p-8 border border-zinc-200/80 dark:border-white/[0.08] shadow-sm space-y-6 transition-colors">
        <div className="flex items-center gap-4 border-b border-zinc-100 dark:border-white/[0.08] pb-5">
          {user?.imageUrl ? (
            <img
              src={user.imageUrl}
              alt={displayName}
              className="w-16 h-16 rounded-full object-cover border-2 border-zinc-200 dark:border-white/[0.15]"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-amber-200 dark:bg-amber-400 border-2 border-amber-300 dark:border-amber-500 flex items-center justify-center font-bold text-xl text-zinc-900">
              {userInitials}
            </div>
          )}
          <div>
            <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">{displayName}</h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">{userEmail}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-white/[0.03] dark:backdrop-blur-md border border-zinc-200/60 dark:border-white/[0.06] flex items-center gap-3">
            <User className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <div>
              <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">Profile Information</h4>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">Update avatar, display name, and title</p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-white/[0.03] dark:backdrop-blur-md border border-zinc-200/60 dark:border-white/[0.06] flex items-center gap-3">
            <Shield className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <div>
              <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">Roles & Permissions</h4>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">Manage custom workspace permissions</p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-white/[0.03] dark:backdrop-blur-md border border-zinc-200/60 dark:border-white/[0.06] flex items-center gap-3">
            <Bell className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            <div>
              <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">Notifications</h4>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">Configure email and in-app alerts</p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-white/[0.03] dark:backdrop-blur-md border border-zinc-200/60 dark:border-white/[0.06] flex items-center gap-3">
            <Key className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            <div>
              <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">Security & Clerk Auth</h4>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">Manage password and 2FA settings</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
