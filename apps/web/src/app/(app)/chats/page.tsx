'use client';

import { Search, Phone, Video, MoreVertical, Paperclip, Smile, Send, Download, FileText } from 'lucide-react';

export default function ChatsPage() {
  return (
    <div className="flex h-[calc(100vh-6rem)] bg-white rounded-3xl border border-zinc-200/80 shadow-sm overflow-hidden">
      {/* Main Chat View */}
      <div className="flex-1 flex flex-col justify-between border-r border-zinc-200">
        
        {/* Chat Header */}
        <div className="h-16 px-6 border-b border-zinc-200 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-zinc-900 flex items-center gap-2">
              <span>Jordan Dax</span>
              <span className="w-2 h-2 rounded-full bg-zinc-400" />
              <span className="text-xs font-normal text-zinc-400">Offline - Last seen 2h ago</span>
            </h2>
          </div>

          <div className="flex items-center gap-3 text-zinc-500">
            <button className="p-2 hover:bg-zinc-100 rounded-full transition-colors"><Search className="w-4 h-4" /></button>
            <button className="p-2 hover:bg-zinc-100 rounded-full transition-colors"><Phone className="w-4 h-4" /></button>
            <button className="p-2 hover:bg-zinc-100 rounded-full transition-colors"><Video className="w-4 h-4" /></button>
            <button className="p-2 hover:bg-zinc-100 rounded-full transition-colors"><MoreVertical className="w-4 h-4" /></button>
          </div>
        </div>

        {/* Messages Stream */}
        <div className="flex-1 p-6 overflow-y-auto space-y-4">
          <div className="flex justify-center">
            <span className="px-3 py-1 rounded-full bg-zinc-100 text-zinc-500 text-[11px] font-medium">
              Today
            </span>
          </div>

          {/* Incoming Message */}
          <div className="flex gap-3 max-w-md">
            <div className="w-8 h-8 rounded-full bg-zinc-300 flex-shrink-0 flex items-center justify-center font-bold text-xs text-zinc-800">
              JD
            </div>
            <div className="space-y-1">
              <span className="text-[10px] text-zinc-400 font-medium">Jordan Dax 09:14 AM</span>
              <div className="bg-zinc-100 p-3.5 rounded-2xl text-xs text-zinc-800 leading-relaxed">
                Hey, did you get a chance to review the Q3 dashboard metrics? We need to finalize the presentation by noon.
              </div>
            </div>
          </div>

          {/* Outgoing Message */}
          <div className="flex justify-end gap-3">
            <div className="space-y-1 text-right max-w-md">
              <span className="text-[10px] text-zinc-400 font-medium">09:22 AM You</span>
              <div className="bg-[#2ecc8f] text-white p-3.5 rounded-2xl text-xs leading-relaxed font-medium">
                Just finishing up now. The user engagement numbers look really strong this quarter. I've compiled the final draft.
              </div>
              
              {/* File Attachment */}
              <div className="bg-zinc-50 border border-zinc-200 p-3 rounded-2xl flex items-center justify-between gap-3 text-left">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-emerald-100 text-emerald-700">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-zinc-800">Q3_Dashboard_Copy_v2.docx</p>
                    <p className="text-[10px] text-zinc-400">1.2 MB • Word Document</p>
                  </div>
                </div>
                <button className="p-1.5 hover:bg-zinc-200 rounded-full text-zinc-500 transition-colors">
                  <Download className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Input Bar */}
        <div className="p-4 border-t border-zinc-200 flex items-center gap-3">
          <button className="p-2 rounded-full hover:bg-zinc-100 text-zinc-500"><Paperclip className="w-5 h-5" /></button>
          <input
            type="text"
            placeholder="Message Jordan..."
            className="flex-1 bg-zinc-50 border border-zinc-200 rounded-full px-4 py-2.5 text-xs text-zinc-800 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/50"
          />
          <button className="p-2 rounded-full hover:bg-zinc-100 text-zinc-500"><Smile className="w-5 h-5" /></button>
          <button className="p-2.5 rounded-full bg-[#2ecc8f] hover:bg-[#28b881] text-white transition-colors">
            <Send className="w-4 h-4" />
          </button>
        </div>

      </div>

      {/* Right Contact Profile Drawer */}
      <div className="w-80 p-6 space-y-6 hidden xl:block bg-zinc-50/50">
        <div className="text-center space-y-2">
          <div className="w-20 h-20 rounded-full bg-zinc-300 mx-auto flex items-center justify-center text-xl font-bold text-zinc-700">
            JD
          </div>
          <h3 className="text-base font-bold text-zinc-900">Jordan Dax</h3>
          <p className="text-xs text-zinc-400">System Administrator</p>
        </div>

        <div className="space-y-3 text-xs text-zinc-600 border-t border-zinc-200 pt-4">
          <h4 className="font-semibold uppercase tracking-wider text-[10px] text-zinc-400">About</h4>
          <p>🕒 11:22 AM Local Time (EST)</p>
          <p>✉ jordan.dax@synca.io</p>
          <p>👥 Infrastructure Team</p>
        </div>

        <div className="border-t border-zinc-200 pt-4 space-y-2">
          <h4 className="font-semibold uppercase tracking-wider text-[10px] text-zinc-400">Shared Media</h4>
          <div className="grid grid-cols-3 gap-2">
            <div className="h-16 bg-zinc-200 rounded-xl" />
            <div className="h-16 bg-zinc-200 rounded-xl" />
            <div className="h-16 bg-zinc-200 rounded-xl flex items-center justify-center font-bold text-xs text-zinc-500">
              +12
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
