'use client';

import { CheckCircle2, FolderGit2, Zap, ArrowUpRight, Plus } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { TaskCard } from '@/components/shared/TaskCard';

const upcomingTasks = [
  { id: '1', title: 'API Documentation', project: 'Cloud Migration', dueDate: 'Oct 05', status: 'Upcoming', tag: 'DevSek', bgVariant: 'yellow' as const },
  { id: '2', title: 'Write Test Suites', project: 'Core API', dueDate: 'Sep 12', status: 'Upcoming', tag: 'Testing', bgVariant: 'peach' as const },
  { id: '3', title: 'Configure CDN Cache', project: 'Cloud Migration', dueDate: 'Sep 15', status: 'Upcoming', tag: 'DevOps', bgVariant: 'white' as const },
  { id: '4', title: 'Design Landing Page V2', project: 'Brand Redesign', dueDate: 'Sep 18', status: 'Upcoming', tag: 'Design', bgVariant: 'white' as const },
  { id: '5', title: 'Refactor Mongoose Helpers', project: 'Database Core', dueDate: 'Sep 22', status: 'Upcoming', tag: 'Database', bgVariant: 'white' as const },
];

const overdueTasks = [
  { id: 'o1', title: 'Fix Session Token Hijack Vuln', project: 'Security Patch', dueDate: 'Jul 15', status: 'Overdue', tag: 'SecScan', bgVariant: 'peach' as const },
  { id: 'o2', title: 'Route Guard Optimization', project: 'Clerk Migration', dueDate: 'Jul 20', status: 'Overdue', tag: 'DevOps', bgVariant: 'white' as const },
  { id: 'o3', title: 'CORS Configuration Check', project: 'Core API', dueDate: 'Jul 22', status: 'Overdue', tag: 'Backend', bgVariant: 'white' as const },
];

const completedTasks = [
  { id: 'c1', title: 'Upstash Connection Pool Setup', project: 'Database Core', dueDate: 'Jul 27', status: 'Completed', tag: 'Redis', bgVariant: 'white' as const },
  { id: 'c2', title: 'Clerk Provider Registration', project: 'Auth Shell', dueDate: 'Jul 26', status: 'Completed', tag: 'Frontend', bgVariant: 'white' as const },
  { id: 'c3', title: 'Monorepo Initialization', project: 'Core Setup', dueDate: 'Jul 25', status: 'Completed', tag: 'Turbo', bgVariant: 'white' as const },
];

const ongoingProjects = [
  {
    name: 'Develop API Endpoints',
    dueDate: '26 Nov, 2024',
    icon: (
      <svg className="w-8 h-8 flex-shrink-0 text-[#fca5a5]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <path d="M12 2v20M2 12h20M4.93 4.93l14.14 14.14M4.93 19.07l14.14-14.14" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    name: 'Onboarding Flow',
    dueDate: '26 Nov, 2024',
    icon: (
      <svg className="w-8 h-8 flex-shrink-0 text-[#854d0e]" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C12 7.52 7.52 12 2 12c5.52 0 10 4.48 10 10 0-5.52 4.48-10 10-10-5.52 0-10-4.48-10-10z" />
      </svg>
    ),
  },
  {
    name: 'Build Dashboard',
    dueDate: '26 Nov, 2024',
    icon: (
      <svg className="w-8 h-8 flex-shrink-0 text-[#2563eb]" viewBox="0 0 24 24" fill="currentColor">
        <path d="M4 18h6L16 6H10L4 18zM10 18h6l6-12h-6l-6 12z" />
      </svg>
    ),
  },
  {
    name: 'Optimize Page Load',
    dueDate: '26 Nov, 2024',
    icon: (
      <svg className="w-8 h-8 flex-shrink-0 text-[#0284c7]" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10zm0-4a6 6 0 1 0 0-12 6 6 0 0 0 0 12z" />
      </svg>
    ),
  },
  {
    name: 'Cross-Browser Testing',
    dueDate: '26 Nov, 2024',
    icon: (
      <svg className="w-8 h-8 flex-shrink-0 text-[#0d9488]" viewBox="0 0 24 24" fill="currentColor">
        <circle cx="6" cy="6" r="2.2" />
        <circle cx="12" cy="6" r="2.2" />
        <circle cx="18" cy="6" r="2.2" />
        <circle cx="6" cy="12" r="2.2" />
        <circle cx="12" cy="12" r="2.2" />
        <circle cx="18" cy="12" r="2.2" />
        <circle cx="6" cy="18" r="2.2" />
        <circle cx="12" cy="18" r="2.2" />
        <circle cx="18" cy="18" r="2.2" />
      </svg>
    ),
  },
];

const recentChats = [
  { name: 'Saqib Arshad', role: 'Full-Stack Developer', msg: 'Whats the scene bro about the FYP?', status: 'online', unreadCount: 3, avatarBg: 'bg-indigo-100 text-indigo-700' },
  { name: 'Malaika Tabassum', role: 'Game Developer', msg: 'The new Room templates are live!', status: 'online', unreadCount: 1, avatarBg: 'bg-fuchsia-100 text-fuchsia-700' },
  { name: 'Ayesha A.', role: 'Web Developer', msg: 'I checked the Mongoose connection pooling.', status: 'offline', unreadCount: 0, avatarBg: 'bg-pink-100 text-pink-700' },
  { name: 'Haris Hashim', role: 'Business Developer', msg: 'Let\'s schedule the walkthrough demo.', status: 'offline', unreadCount: 0, avatarBg: 'bg-amber-100 text-amber-700' },
];

export default function DashboardPage() {
  const { user, isLoaded } = useUser();
  const [activeTab, setActiveTab] = useState<'Upcoming' | 'Overdue' | 'Completed'>('Upcoming');
  const [greeting, setGreeting] = useState('Good Evening');

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) {
      setGreeting('Good Morning');
    } else if (hour < 18) {
      setGreeting('Good Afternoon');
    } else {
      setGreeting('Good Evening');
    }
  }, []);

  const getDisplayName = () => {
    if (!isLoaded) return '...';
    let name = '';
    if (user?.firstName) {
      name = user.firstName;
    } else if (user?.username) {
      name = user.username;
    } else if (user?.emailAddresses?.[0]?.emailAddress) {
      name = user.emailAddresses[0].emailAddress.split('@')[0];
    } else {
      name = 'User';
    }
    return name.charAt(0).toUpperCase() + name.slice(1);
  };

  const userName = getDisplayName();

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-3xl p-6   flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-normal text-zinc-900 tracking-tight">
            {greeting}, {userName}
          </h1>
          <p className="text-sm text-zinc-500 mt-1">Here is what is happening across your projects today.</p>
        </div>

        {/* Stats Chips */}
        <div className="flex items-center gap-3">
          {/* Task Completion Gauge */}
          <div className="bg-zinc-50   rounded-2xl p-3 flex items-center gap-3 min-w-[145px] hover:-translate-y-0.5 hover:border-emerald-200 transition-all duration-300 group">
            <div className="relative w-10 h-10 flex items-center justify-center flex-shrink-0">
              <svg className="w-full h-full transform -rotate-90">
                <circle
                  cx="20"
                  cy="20"
                  r="14"
                  className="stroke-zinc-200/60"
                  strokeWidth="3"
                  fill="transparent"
                />
                <circle
                  cx="20"
                  cy="20"
                  r="14"
                  className="stroke-emerald-500 transition-all duration-500 ease-out"
                  strokeWidth="3"
                  fill="transparent"
                  strokeDasharray={2 * Math.PI * 14}
                  strokeDashoffset={2 * Math.PI * 14 - (84.2 / 100) * (2 * Math.PI * 14)}
                  strokeLinecap="round"
                />
              </svg>
              <span className="absolute text-[9px] font-extrabold text-emerald-600">84%</span>
            </div>
            <div>
              <p className="text-[9px] uppercase font-bold tracking-wider text-zinc-400 group-hover:text-emerald-500/80 transition-colors">Task Completion</p>
              <p className="text-lg font-black text-zinc-900 leading-none mt-1">84.2%</p>
            </div>
          </div>

          {/* Active Projects Card */}
          <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-3 flex items-center gap-3 min-w-[145px] hover:-translate-y-0.5 hover:border-blue-200 transition-all duration-300 group">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0 transition-colors group-hover:bg-blue-100/70">
              <FolderGit2 className="w-5 h-5 transition-transform group-hover:scale-110" />
            </div>
            <div>
              <p className="text-[9px] uppercase font-bold tracking-wider text-zinc-400 group-hover:text-blue-500/80 transition-colors">Active Projects</p>
              <p className="text-lg font-black text-zinc-900 leading-none mt-1">12</p>
            </div>
          </div>

          {/* Team Velocity Card */}
          <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-3 flex items-center gap-3 min-w-[145px] hover:-translate-y-0.5 hover:border-amber-200 transition-all duration-300 group">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center flex-shrink-0 transition-colors group-hover:bg-amber-100/70">
              <Zap className="w-5 h-5 animate-pulse transition-transform group-hover:scale-110" />
            </div>
            <div>
              <p className="text-[9px] uppercase font-bold tracking-wider text-zinc-400 group-hover:text-amber-500/80 transition-colors">Team Velocity</p>
              <p className="text-lg font-black text-zinc-900 leading-none mt-1">48 <span className="text-xs font-semibold text-zinc-400">avg</span></p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left Column: Task Status */}
        <div className="bg-white rounded-3xl p-5 border border-zinc-200/80 space-y-4 flex flex-col max-h-[780px]">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-normal text-zinc-900">Task Status</h2>
            <div className="flex items-center bg-zinc-100 p-1 rounded-full text-xs font-medium text-zinc-500">
              {(['Upcoming', 'Overdue', 'Completed'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-3 py-1 rounded-full transition-all ${activeTab === tab
                    ? 'bg-[#8be6c1] text-zinc-900 font-semibold'
                    : 'hover:text-zinc-900'
                    }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          {/* Render Pixel-Matched Task Cards */}
          <div className="space-y-3.5 flex-1 overflow-y-auto pr-1 scrollbar-none">
            {(activeTab === 'Upcoming'
              ? upcomingTasks
              : activeTab === 'Overdue'
                ? overdueTasks
                : completedTasks
            ).map((task) => (
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
          {/* Completed Tasks Vertical Pill Strips */}
          <div className="bg-white rounded-3xl p-6 border border-zinc-200/80 flex flex-col justify-between hover:border-zinc-300/80 transition-all duration-300 min-h-[380px]">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-normal text-zinc-900 tracking-tight">Completed Tasks</h2>
              </div>
              <div className="text-right flex flex-col text-[11px] font-medium text-zinc-500 leading-tight">
                <span>24 Tasks Completed this</span>
                <span>Week</span>
              </div>
            </div>

            {/* Vertical Pill Grid */}
            <div className="grid grid-cols-7 gap-3 pt-6 flex-1 items-end">
              {[
                { day: 'Mon', bgClass: 'from-[#5bd9a8] to-[#3cae81]' },
                { day: 'Tue', bgClass: 'from-[#bfead7] to-[#99d7bd]' },
                { day: 'Wed', bgClass: 'from-[#bfead7] to-[#99d7bd]' },
                { day: 'Thu', bgClass: 'from-[#5bd9a8] to-[#3cae81]' },
                { day: 'Fri', bgClass: 'from-[#5bd9a8] to-[#3cae81]' },
                { day: 'Sat', bgClass: 'from-[#bfead7] to-[#99d7bd]' },
                { day: 'Sun', bgClass: 'from-[#5bd9a8] to-[#3cae81]' },
              ].map((dayData) => (
                <div key={dayData.day} className="flex flex-col items-center gap-3">
                  {/* Visual Rounded Pill Strip */}
                  <div
                    className={`w-full h-56 rounded-[36px] bg-gradient-to-b ${dayData.bgClass} transition-all hover:scale-[1.03] cursor-pointer`}
                  />

                  {/* Day Name */}
                  <span className="text-xs font-bold text-zinc-400">{dayData.day}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Private Task Placeholder */}
          <div className="bg-white rounded-3xl p-6 border border-zinc-200/80 flex flex-col items-center justify-center text-center space-y-2 min-h-[160px]">
            <div className="w-10 h-10 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-500">
              <Plus className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-normal text-zinc-800">Private Task</h3>
            <p className="text-xs text-zinc-400">Personal to-do items visible only to you</p>
          </div>
        </div>

        {/* Right Column: Ongoing Projects & Recent Chats */}
        <div className="space-y-6 flex flex-col">
          {/* Ongoing Projects */}
          <div className="bg-white rounded-3xl p-6 border border-zinc-200/80 space-y-5 hover:border-zinc-300/80 transition-all duration-300">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-normal text-zinc-900 font-funnel">Ongoing Projects</h2>
              <button className="text-xs font-normal text-zinc-800 border border-zinc-300/90 px-3 py-1 rounded-full hover:bg-zinc-50 transition-colors flex items-center gap-1">
                New <ArrowUpRight className="w-3 h-3" />
              </button>
            </div>

            <div className="space-y-4">
              {ongoingProjects.map((proj) => (
                <div key={proj.name} className="flex items-center gap-4 py-0.5 cursor-pointer group">
                  {proj.icon}
                  <div className="flex-1 min-w-0">
                    <h4 className="text-base font-normal text-zinc-900 truncate font-funnel group-hover:text-zinc-700 transition-colors">{proj.name}</h4>
                    <p className="text-xs text-zinc-400 font-normal font-sans">Due Date, {proj.dueDate}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Chats */}
          <div className="bg-white rounded-3xl p-5 border border-zinc-200/80 space-y-4 flex-1 hover:border-zinc-300/80 transition-all duration-300">
            <h2 className="text-lg font-normal text-zinc-900">Recent Chats</h2>
            <div className="space-y-3">
              {recentChats.map((chat) => (
                <div key={chat.name} className="flex items-center gap-3 p-2.5 rounded-2xl bg-zinc-50/50 border border-zinc-100/50 hover:bg-zinc-100/60 transition-all cursor-pointer hover:scale-[1.01] group/chat">
                  {/* Avatar with Presence Indicator */}
                  <div className="relative flex-shrink-0">
                    <div className={`w-9 h-9 rounded-full ${chat.avatarBg} flex items-center justify-center text-xs font-black`}>
                      {chat.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    {chat.status === 'online' && (
                      <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white animate-pulse" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-normal text-zinc-900 truncate pr-2">{chat.name}</h4>
                      {chat.unreadCount > 0 && (
                        <span className="flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-emerald-500 text-white text-[9px] font-black">
                          {chat.unreadCount}
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-zinc-400 font-medium truncate mt-0.5 group-hover/chat:text-zinc-600 transition-colors">{chat.msg}</p>
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
