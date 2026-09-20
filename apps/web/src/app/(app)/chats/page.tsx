'use client';

import { Search, Phone, Video, MoreVertical, Paperclip, Smile, Send, Download, FileText } from 'lucide-react';

export default function ChatsPage() {
  return (
    <div className="flex h-[calc(100vh-6rem)] bg-white dark:bg-[#10141e]/65 dark:backdrop-blur-xl rounded-3xl border border-zinc-200/80 dark:border-white/[0.08] shadow-sm overflow-hidden transition-colors">
      {/* Main Chat View */}
      <div className="flex-1 flex flex-col justify-between border-r border-zinc-200 dark:border-white/[0.08]">
        
        {/* Chat Header */}
        <div className="h-16 px-6 border-b border-zinc-200 dark:border-white/[0.08] flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <span>Jordan Dax</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-xs font-normal text-zinc-400 dark:text-zinc-500">Active now</span>
            </h2>
          </div>

          <div className="flex items-center gap-3 text-zinc-500 dark:text-zinc-400">
            <button className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors"><Search className="w-4 h-4" /></button>
            <button className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors"><Phone className="w-4 h-4" /></button>
            <button className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors"><Video className="w-4 h-4" /></button>
            <button className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors"><MoreVertical className="w-4 h-4" /></button>
          </div>
        </div>

        {/* Messages Stream */}
        <div className="flex-1 p-6 overflow-y-auto space-y-4">
          <div className="flex justify-center">
            <span className="px-3 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 text-[11px] font-medium">
              Today
            </span>
          </div>

          {/* Incoming Message */}
          <div className="flex gap-3 max-w-md">
            <div className="w-8 h-8 rounded-full bg-zinc-300 dark:bg-zinc-700 flex-shrink-0 flex items-center justify-center font-bold text-xs text-zinc-800 dark:text-zinc-200">
              JD
            </div>
            <div className="space-y-1">
              <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-medium">Jordan Dax 09:14 AM</span>
              <div className="bg-zinc-100 dark:bg-zinc-800/90 p-3.5 rounded-2xl text-xs text-zinc-800 dark:text-zinc-200 leading-relaxed">
                Hey, did you get a chance to review the Q3 dashboard metrics? We need to finalize the presentation by noon.
              </div>
            </div>
          </div>

          {/* Outgoing Message */}
          <div className="flex justify-end gap-3">
            <div className="space-y-1 text-right max-w-md">
              <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-medium">09:22 AM You</span>
              <div className="bg-[#2ecc8f] dark:bg-emerald-600 text-white p-3.5 rounded-2xl text-xs leading-relaxed font-medium">
                Just finishing up now. The user engagement numbers look really strong this quarter. I've compiled the final draft.
              </div>
              
              {/* File Attachment */}
              <div className="bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/60 p-3 rounded-2xl flex items-center justify-between gap-3 text-left">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">Q3_Dashboard_Copy_v2.docx</p>
                    <p className="text-[10px] text-zinc-400 dark:text-zinc-500">1.2 MB • Word Document</p>
                  </div>
                </div>
                <button className="p-1.5 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-full text-zinc-500 dark:text-zinc-400 transition-colors">
                  <Download className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Input Bar */}
        <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 flex items-center gap-3">
          <button className="p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 dark:text-zinc-400"><Paperclip className="w-5 h-5" /></button>
          <input
            type="text"
            placeholder="Message Jordan..."
            className="flex-1 bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-700 rounded-full px-4 py-2.5 text-xs text-zinc-800 dark:text-zinc-200 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-400/50"
          />
          <button className="p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 dark:text-zinc-400"><Smile className="w-5 h-5" /></button>
          <button className="p-2.5 rounded-full bg-[#2ecc8f] hover:bg-[#28b881] dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white transition-colors">
            <Send className="w-4 h-4" />
          </button>
        </div>

      </div>

      {/* Right Contact Profile Drawer */}
      <div className="w-80 p-6 space-y-6 hidden xl:block bg-zinc-50/50 dark:bg-zinc-900/40">
        <div className="text-center space-y-2">
          <div className="w-20 h-20 rounded-full bg-zinc-300 dark:bg-zinc-700 mx-auto flex items-center justify-center text-xl font-bold text-zinc-700 dark:text-zinc-200">
            JD
          </div>
          <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">Jordan Dax</h3>
          <p className="text-xs text-zinc-400 dark:text-zinc-500">System Administrator</p>
        </div>

        <div className="space-y-3 text-xs text-zinc-600 dark:text-zinc-400 border-t border-zinc-200 dark:border-zinc-800 pt-4">
          <h4 className="font-semibold uppercase tracking-wider text-[10px] text-zinc-400 dark:text-zinc-500">About</h4>
          <p>🕒 11:22 AM Local Time (EST)</p>
          <p>✉ jordan.dax@synca.io</p>
          <p>👥 Infrastructure Team</p>
        </div>

        <div className="border-t border-zinc-200 dark:border-zinc-800 pt-4 space-y-2">
          <h4 className="font-semibold uppercase tracking-wider text-[10px] text-zinc-400 dark:text-zinc-500">Shared Media</h4>
          <div className="grid grid-cols-3 gap-2">
            <div className="h-16 bg-zinc-200 dark:bg-zinc-800 rounded-xl" />
            <div className="h-16 bg-zinc-200 dark:bg-zinc-800 rounded-xl" />
            <div className="h-16 bg-zinc-200 dark:bg-zinc-800 rounded-xl flex items-center justify-center font-bold text-xs text-zinc-500 dark:text-zinc-400">
              +12
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
