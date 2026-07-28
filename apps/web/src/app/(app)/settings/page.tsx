'use client';

import { User, Shield, Bell, Key } from 'lucide-react';

export default function SettingsPage() {
  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-3xl font-extrabold text-zinc-900 tracking-tight">Settings</h1>
        <p className="text-sm text-zinc-500 mt-1">Manage your profile, room settings, and notifications.</p>
      </div>

      <div className="bg-white rounded-3xl p-6 border border-zinc-200/80 shadow-sm space-y-6">
        <div className="flex items-center gap-4 border-b border-zinc-100 pb-4">
          <div className="w-16 h-16 rounded-full bg-amber-200 border-2 border-amber-300 flex items-center justify-center font-bold text-xl text-zinc-900">
            FA
          </div>
          <div>
            <h3 className="text-base font-bold text-zinc-900">Fazeel Ahmad</h3>
            <p className="text-xs text-zinc-400">UI UX Designer • fazeel.ahmad@synca.io</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-2xl bg-zinc-50 border border-zinc-200/60 flex items-center gap-3">
            <User className="w-5 h-5 text-emerald-600" />
            <div>
              <h4 className="text-xs font-bold text-zinc-900">Profile Information</h4>
              <p className="text-[11px] text-zinc-400">Update avatar, display name, and title</p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-zinc-50 border border-zinc-200/60 flex items-center gap-3">
            <Shield className="w-5 h-5 text-blue-600" />
            <div>
              <h4 className="text-xs font-bold text-zinc-900">Roles & Permissions</h4>
              <p className="text-[11px] text-zinc-400">Manage custom workspace permissions</p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-zinc-50 border border-zinc-200/60 flex items-center gap-3">
            <Bell className="w-5 h-5 text-amber-600" />
            <div>
              <h4 className="text-xs font-bold text-zinc-900">Notifications</h4>
              <p className="text-[11px] text-zinc-400">Configure email and in-app alerts</p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-zinc-50 border border-zinc-200/60 flex items-center gap-3">
            <Key className="w-5 h-5 text-purple-600" />
            <div>
              <h4 className="text-xs font-bold text-zinc-900">Security & Clerk Auth</h4>
              <p className="text-[11px] text-zinc-400">Manage password and 2FA settings</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
