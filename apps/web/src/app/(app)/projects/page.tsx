'use client';

import { Plus, MoreHorizontal, Calendar, Filter } from 'lucide-react';
import Link from 'next/link';

const sampleProjects = [
  {
    id: '1',
    name: 'Develop API Endpoints',
    desc: 'Transitioning legacy databases to the new Azure scalable...',
    status: 'On Track',
    statusBg: 'bg-emerald-100 text-emerald-700',
    progress: 75,
    progressColor: 'bg-emerald-500',
    date: 'Oct 15',
    members: ['S', 'M', 'A'],
  },
  {
    id: '2',
    name: 'Cloud Migration Phase II',
    desc: 'Transitioning legacy databases to the new Azure scalable...',
    status: 'Active Sprint',
    statusBg: 'bg-[#e4e4e6] text-zinc-800',
    progress: 75,
    progressColor: 'bg-emerald-500',
    date: 'Oct 15',
    members: ['S', 'M', 'A'],
  },
  {
    id: '3',
    name: 'Stripe Integration Revamp',
    desc: 'Updating the payment gateway API to support multi-currency...',
    status: 'At Risk',
    statusBg: 'bg-rose-100 text-rose-700',
    progress: 32,
    progressColor: 'bg-rose-500',
    date: 'Sep 30',
    blocked: true,
    members: ['H', 'Z'],
  },
  {
    id: '4',
    name: 'Synca AI Engine',
    desc: 'Developing core predictive modeling algorithms for next-gen data analytics...',
    status: 'Active Sprint',
    statusBg: 'bg-[#e4e4e6] text-zinc-800',
    sprintInfo: 'Sprint 42 Goals 5/8 Completed',
    date: 'Ends in 3d',
    members: ['S', 'M', 'A'],
  },
];

export default function ProjectsPage() {
  return (
    <div className="space-y-6">
      {/* Header & Filter Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-zinc-900 tracking-tight">Project Portfolio</h1>
          <p className="text-sm text-zinc-500 mt-1">Manage and track your active initiatives across workspace teams.</p>
        </div>

        {/* Filter Dropdowns */}
        <div className="flex items-center gap-3">
          <select className="bg-white border border-zinc-200 rounded-xl px-3 py-2 text-xs font-medium text-zinc-700 shadow-sm focus:outline-none">
            <option>All Statuses</option>
            <option>On Track</option>
            <option>Active Sprint</option>
            <option>At Risk</option>
          </select>

          <select className="bg-white border border-zinc-200 rounded-xl px-3 py-2 text-xs font-medium text-zinc-700 shadow-sm focus:outline-none">
            <option>Priority: Any</option>
            <option>High</option>
            <option>Medium</option>
            <option>Low</option>
          </select>

          <select className="bg-white border border-zinc-200 rounded-xl px-3 py-2 text-xs font-medium text-zinc-700 shadow-sm focus:outline-none">
            <option>Assignee: All</option>
          </select>
        </div>
      </div>

      {/* Projects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {sampleProjects.map((proj) => (
          <Link
            key={proj.id}
            href={`/projects/${proj.id}`}
            className="bg-white rounded-3xl p-5 border border-zinc-200/80 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4 group cursor-pointer"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold flex items-center gap-1.5 ${proj.statusBg}`}>
                  <span>●</span> {proj.status}
                </span>
                <button className="text-zinc-400 hover:text-zinc-700">
                  <MoreHorizontal className="w-4 h-4" />
                </button>
              </div>

              <div>
                <h3 className="text-base font-bold text-zinc-900 group-hover:text-emerald-600 transition-colors">
                  {proj.name}
                </h3>
                <p className="text-xs text-zinc-500 mt-1 line-clamp-2">{proj.desc}</p>
              </div>
            </div>

            {/* Progress or Sprint section */}
            <div className="space-y-3 pt-2">
              {proj.sprintInfo ? (
                <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-2.5 text-center">
                  <p className="text-xs font-semibold text-emerald-800">{proj.sprintInfo}</p>
                </div>
              ) : (
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-medium">
                    <span className={proj.blocked ? 'text-rose-600 font-semibold flex items-center gap-1' : 'text-zinc-500'}>
                      {proj.blocked ? '⚠ Blocked' : 'Progress'}
                    </span>
                    <span className="text-zinc-900 font-bold">{proj.progress}%</span>
                  </div>
                  <div className="w-full h-2 bg-zinc-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${proj.progressColor} rounded-full`}
                      style={{ width: `${proj.progress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Members and Due Date */}
              <div className="flex items-center justify-between pt-2 border-t border-zinc-100">
                <div className="flex -space-x-1.5 overflow-hidden">
                  {proj.members.map((m, idx) => (
                    <div
                      key={idx}
                      className="inline-block h-6 w-6 rounded-full ring-2 ring-white bg-zinc-200 text-[10px] font-bold text-zinc-800 flex items-center justify-center"
                    >
                      {m}
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-1 text-xs text-zinc-400 font-medium">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>{proj.date}</span>
                </div>
              </div>
            </div>
          </Link>
        ))}

        {/* New Project Card */}
        <button className="bg-white/60 hover:bg-white rounded-3xl p-6 border-2 border-dashed border-zinc-300 hover:border-emerald-500 flex flex-col items-center justify-center text-center space-y-3 min-h-[260px] transition-all group">
          <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform">
            <Plus className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-zinc-900">New Project</h3>
            <p className="text-xs text-zinc-400">Create a new project workspace</p>
          </div>
        </button>
      </div>
    </div>
  );
}
