'use client';

import { User, Shield, Bell, Key, Sun, Moon, Monitor, Check, ExternalLink } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { useUser, useClerk } from '@clerk/nextjs';

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const { user } = useUser();
  const { openUserProfile } = useClerk();

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
  const userEmail = user?.primaryEmailAddress?.emailAddress || '';
  const userInitials = (user?.firstName?.[0] || 'U') + (user?.lastName?.[0] || '');

  return (
    <div className="h-full overflow-y-auto pr-1 pb-4">
      <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-3xl font-extrabold text-[#191c1d] dark:text-zinc-100 tracking-tight">Settings</h1>
        <p className="text-sm text-[#3e4944] dark:text-zinc-400 mt-1">Manage your appearance, profile, workspace preferences, and security.</p>
      </div>

      {/* Appearance & Theme Section */}
      <div className="bg-white dark:bg-[#111316] rounded-[20px] p-6 sm:p-8 border border-[#e5e5e5] dark:border-white/[0.08] shadow-sm space-y-5 transition-colors">
        <div>
          <h2 className="text-base font-bold text-[#191c1d] dark:text-zinc-100">Appearance & Theme</h2>
          <p className="text-xs text-[#3e4944] dark:text-zinc-400 mt-0.5">
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
                    ? 'border-[#006c52] dark:border-[#66deb4] bg-[#e6f7f1]/50 dark:bg-[#66deb4]/10 shadow-sm'
                    : 'border-[#e5e7eb] dark:border-white/[0.08] hover:border-[#bdc9c2] dark:hover:border-white/[0.15] bg-[#f8f9fa] dark:bg-[#15171b]'
                }`}
              >
                {isSelected && (
                  <span className="absolute top-3 right-3 w-5 h-5 rounded-full bg-[#006c52] dark:bg-[#66deb4] text-white dark:text-[#111316] flex items-center justify-center">
                    <Check className="w-3 h-3 stroke-[3]" />
                  </span>
                )}
                <div
                  className={`p-2.5 rounded-xl mb-3 ${
                    isSelected
                      ? 'bg-[#006c52] text-white dark:bg-[#66deb4] dark:text-[#111316]'
                      : 'bg-white dark:bg-white/[0.06] text-[#3e4944] dark:text-zinc-400'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <h3 className="text-xs font-bold text-[#191c1d] dark:text-zinc-100">{opt.label}</h3>
                <p className="text-[11px] text-[#3e4944] dark:text-zinc-400 mt-1 leading-snug">{opt.desc}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Profile & Account Details */}
      <div className="bg-white dark:bg-[#111316] rounded-[20px] p-6 sm:p-8 border border-[#e5e5e5] dark:border-white/[0.08] shadow-sm space-y-6 transition-colors">
        <div className="flex items-center gap-4 border-b border-[#e5e7eb] dark:border-white/[0.08] pb-5">
          {user?.imageUrl ? (
            <img
              src={user.imageUrl}
              alt={displayName}
              className="w-16 h-16 rounded-full object-cover border-2 border-[#e5e7eb] dark:border-white/[0.15]"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-[#e6f7f1] dark:bg-[#66deb4]/15 border-2 border-[#a7e9d2] dark:border-[#66deb4]/30 flex items-center justify-center font-bold text-xl text-[#006c52] dark:text-[#66deb4]">
              {userInitials}
            </div>
          )}
          <div>
            <h3 className="text-base font-bold text-[#191c1d] dark:text-zinc-100">{displayName}</h3>
            <p className="text-xs text-[#3e4944] dark:text-zinc-400">{userEmail}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            type="button"
            onClick={() => openUserProfile()}
            className="p-4 rounded-2xl bg-[#f8f9fa] dark:bg-[#15171b] hover:bg-[#e6f7f1]/60 dark:hover:bg-white/[0.06] border border-[#e5e7eb] dark:border-white/[0.08] flex items-center justify-between gap-3 text-left transition-colors"
          >
            <div className="flex items-center gap-3">
              <User className="w-5 h-5 text-[#006c52] dark:text-[#66deb4] shrink-0" />
              <div>
                <h4 className="text-xs font-bold text-[#191c1d] dark:text-zinc-100">Profile Information</h4>
                <p className="text-[11px] text-[#3e4944] dark:text-zinc-400">Update avatar, display name, and email via Clerk</p>
              </div>
            </div>
            <ExternalLink className="w-3.5 h-3.5 text-[#3e4944] dark:text-zinc-400 shrink-0" />
          </button>

          <button
            type="button"
            onClick={() => openUserProfile()}
            className="p-4 rounded-2xl bg-[#f8f9fa] dark:bg-[#15171b] hover:bg-[#e6f7f1]/60 dark:hover:bg-white/[0.06] border border-[#e5e7eb] dark:border-white/[0.08] flex items-center justify-between gap-3 text-left transition-colors"
          >
            <div className="flex items-center gap-3">
              <Key className="w-5 h-5 text-[#006c52] dark:text-[#66deb4] shrink-0" />
              <div>
                <h4 className="text-xs font-bold text-[#191c1d] dark:text-zinc-100">Security & Clerk Auth</h4>
                <p className="text-[11px] text-[#3e4944] dark:text-zinc-400">Manage password, connected accounts, and 2FA</p>
              </div>
            </div>
            <ExternalLink className="w-3.5 h-3.5 text-[#3e4944] dark:text-zinc-400 shrink-0" />
          </button>

          <div className="p-4 rounded-2xl bg-[#f8f9fa]/70 dark:bg-[#15171b]/60 border border-[#e5e7eb] dark:border-white/[0.06] flex items-center justify-between gap-3 opacity-75">
            <div className="flex items-center gap-3">
              <Shield className="w-5 h-5 text-[#006c52] dark:text-[#66deb4] shrink-0" />
              <div>
                <h4 className="text-xs font-bold text-[#191c1d] dark:text-zinc-100">Project Roles</h4>
                <p className="text-[11px] text-[#3e4944] dark:text-zinc-400">Roles are managed per-project inside each project&apos;s team roster</p>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-[#f8f9fa]/70 dark:bg-[#15171b]/60 border border-[#e5e7eb] dark:border-white/[0.06] flex items-center justify-between gap-3 opacity-75">
            <div className="flex items-center gap-3">
              <Bell className="w-5 h-5 text-[#006c52] dark:text-[#66deb4] shrink-0" />
              <div>
                <h4 className="text-xs font-bold text-[#191c1d] dark:text-zinc-100">Notification Preferences</h4>
                <p className="text-[11px] text-[#3e4944] dark:text-zinc-400">Planned for Phase 5 (Notifications &amp; Mentions)</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}
