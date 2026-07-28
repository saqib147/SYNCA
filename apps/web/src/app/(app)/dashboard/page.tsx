'use client';

import { CheckCircle2, FolderGit2, Zap, ArrowUpRight, Plus } from 'lucide-react';
import { useState } from 'react';
import { TaskCard } from '@/components/shared/TaskCard';

const upcomingTasks = [
  { id: '1', title: 'API Documentation', project: 'Cloud Migration', dueDate: 'Oct 05', status: 'Upcoming', tag: 'DevSek', bgVariant: 'yellow' as const },
  { id: '2', title: 'API Documentation', project: 'Cloud Migration', dueDate: 'Sep 12', status: 'Upcoming', tag: 'DevSek', bgVariant: 'peach' as const },
  { id: '3', title: 'API Documentation', project: 'Cloud Migration', dueDate: 'Sep 12', status: 'Upcoming', tag: 'DevSek', bgVariant: 'white' as const },
  { id: '4', title: 'API Documentation', project: 'Cloud Migration', dueDate: 'Sep 12', status: 'Upcoming', tag: 'DevSek', bgVariant: 'white' as const },
  { id: '5', title: 'API Documentation', project: 'Cloud Migration', dueDate: 'Sep 12', status: 'Upcoming', tag: 'DevSek', bgVariant: 'white' as const },
];

const ongoingProjects = [
  { name: 'Develop API Endpoints', dueDate: '26 Nov, 2024', color: 'text-amber-500' },
  { name: 'Onboarding Flow', dueDate: '26 Nov, 2024', color: 'text-emerald-500' },
  { name: 'Build Dashboard', dueDate: '26 Nov, 2024', color: 'text-blue-500' },
  { name: 'Optimize Page Load', dueDate: '26 Nov, 2024', color: 'text-cyan-500' },
  { name: 'Cross-Browser Testing', dueDate: '26 Nov, 2024', color: 'text-teal-500' },
];

const recentChats = [
  { name: 'Saqib Arshad', role: 'Full-Stack Developer', msg: 'Whats the scene bro about the FYP?', unread: true },
  { name: 'Malaika Tabassum', role: 'Game Developer', msg: 'Whats the scene bro about the FYP?', unread: true },
  { name: 'Ayesha A.', role: 'Web Developer', msg: 'Whats the scene bro about the FYP?', unread: true },
  { name: 'Haris Hashim', role: 'Business Developer', msg: 'Whats the scene bro about the FYP?', unread: true },
];

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<'Upcoming' | 'Overdue' | 'Completed'>('Upcoming');

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-zinc-200/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-zinc-900 tracking-tight">
            Good Evening Fazeel
          </h1>
          <p className="text-sm text-zinc-500 mt-1">Here is what is happening across your projects today.</p>
        </div>

        {/* Stats Chips */}
        <div className="flex items-center gap-3">
          <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-3 flex items-center gap-3 min-w-[130px]">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] uppercase font-semibold text-zinc-400">Task Completion</p>
              <p className="text-lg font-bold text-zinc-900">84.2%</p>
            </div>
          </div>

          <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-3 flex items-center gap-3 min-w-[130px]">
            <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
              <FolderGit2 className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] uppercase font-semibold text-zinc-400">Active Projects</p>
              <p className="text-lg font-bold text-zinc-900">12</p>
            </div>
          </div>

          <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-3 flex items-center gap-3 min-w-[130px]">
            <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] uppercase font-semibold text-zinc-400">Team Velocity</p>
              <p className="text-lg font-bold text-zinc-900">48 <span className="text-xs font-normal text-zinc-400">avg</span></p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Task Status */}
        <div className="bg-white rounded-3xl p-5 border border-zinc-200/80 shadow-sm space-y-4 flex flex-col">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-zinc-900">Task Status</h2>
            <div className="flex items-center bg-zinc-100 p-1 rounded-full text-xs font-medium text-zinc-500">
              {(['Upcoming', 'Overdue', 'Completed'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-3 py-1 rounded-full transition-all ${
                    activeTab === tab
                      ? 'bg-[#8be6c1] text-zinc-900 font-semibold shadow-sm'
                      : 'hover:text-zinc-900'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          {/* Render Pixel-Matched Task Cards */}
          <div className="space-y-3.5 flex-1 overflow-y-auto max-h-[520px] pr-1">
            {upcomingTasks.map((task) => (
              <TaskCard
                key={task.id}
                title={task.title}
                projectName={task.project}
                dueDate={task.dueDate}
                status={task.status}
                tag={task.tag}
                bgVariant={task.bgVariant}
              />
            ))}
          </div>
        </div>

        {/* Middle Column: Charts & Private Tasks */}
        <div className="space-y-6 flex flex-col">
          {/* Completed Projects Bar Chart Mockup */}
          <div className="bg-white rounded-3xl p-5 border border-zinc-200/80 shadow-sm space-y-3 flex-1">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-zinc-900">Completed Projects</h2>
                <p className="text-xs text-zinc-400">24 projects completed this month</p>
              </div>
            </div>
            {/* Visual Bar Columns */}
            <div className="h-40 flex items-end justify-between gap-2 pt-6 px-2">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, idx) => (
                <div key={day} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                  <div
                    className="w-full bg-[#4ecb9e] rounded-t-lg transition-all hover:bg-[#2ecc8f]"
                    style={{ height: `${[80, 45, 60, 95, 85, 30, 70][idx]}%` }}
                  />
                  <span className="text-[10px] font-medium text-zinc-400">{day}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Private Task Placeholder */}
          <div className="bg-white rounded-3xl p-6 border border-zinc-200/80 shadow-sm flex flex-col items-center justify-center text-center space-y-2 min-h-[160px]">
            <div className="w-10 h-10 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-500">
              <Plus className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-semibold text-zinc-800">Private Task</h3>
            <p className="text-xs text-zinc-400">Personal to-do items visible only to you</p>
          </div>
        </div>

        {/* Right Column: Ongoing Projects & Recent Chats */}
        <div className="space-y-6 flex flex-col">
          {/* Ongoing Projects */}
          <div className="bg-white rounded-3xl p-5 border border-zinc-200/80 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-zinc-900">Ongoing Projects</h2>
              <button className="text-xs font-semibold text-zinc-700 hover:text-zinc-900 flex items-center gap-1 border border-zinc-200 px-2.5 py-1 rounded-full bg-zinc-50">
                New <ArrowUpRight className="w-3 h-3" />
              </button>
            </div>

            <div className="space-y-3">
              {ongoingProjects.map((proj) => (
                <div key={proj.name} className="flex items-center gap-3 p-2 rounded-2xl hover:bg-zinc-50 transition-colors">
                  <div className={`w-8 h-8 rounded-xl bg-zinc-100 ${proj.color} flex items-center justify-center font-bold text-xs`}>
                    ❖
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-semibold text-zinc-900 truncate">{proj.name}</h4>
                    <p className="text-[10px] text-zinc-400">Due Date, {proj.dueDate}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Chats */}
          <div className="bg-white rounded-3xl p-5 border border-zinc-200/80 shadow-sm space-y-3 flex-1">
            <h2 className="text-lg font-bold text-zinc-900">Recent Chats</h2>
            <div className="space-y-2">
              {recentChats.map((chat) => (
                <div key={chat.name} className="flex items-center gap-3 p-2 rounded-2xl bg-zinc-50/80 border border-zinc-100 hover:bg-zinc-100/80 transition-colors cursor-pointer">
                  <div className="w-8 h-8 rounded-full bg-amber-200 flex items-center justify-center text-xs font-bold text-zinc-900">
                    {chat.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-semibold text-zinc-900">{chat.name}</h4>
                      <span className="px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-700 text-[9px] font-bold">Unread</span>
                    </div>
                    <p className="text-[10px] text-zinc-400 truncate">{chat.msg}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
