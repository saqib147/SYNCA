'use client';

import { Plus } from 'lucide-react';

const stickyNotes = [
  {
    id: '1',
    title: 'ToDo Name',
    color: 'bg-[#fde896]',
    dotColor: 'bg-amber-500',
    notes: [
      'Stickies lets you keep notes (like these) on your desktop.',
      'Use a Stickies note to jot down reminders, lists or other information.',
      'To close this note, click the close button.',
      'Your current notes appear when you open Stickies',
    ],
  },
  {
    id: '2',
    title: 'ToDo Name',
    color: 'bg-[#8be6c1]',
    dotColor: 'bg-emerald-600',
    notes: [
      'Stickies lets you keep notes (like these) on your desktop.',
      'Use a Stickies note to jot down reminders, lists or other information.',
      'To close this note, click the close button.',
      'Your current notes appear when you open Stickies',
    ],
  },
  {
    id: '3',
    title: 'ToDo Name',
    color: 'bg-[#f9c5d1]',
    dotColor: 'bg-rose-500',
    notes: [
      'Stickies lets you keep notes (like these) on your desktop.',
      'Use a Stickies note to jot down reminders, lists or other information.',
      'To close this note, click the close button.',
      'Your current notes appear when you open Stickies',
    ],
  },
  {
    id: '4',
    title: 'ToDo Name',
    color: 'bg-[#fde896]',
    dotColor: 'bg-amber-500',
    notes: [
      'Stickies lets you keep notes (like these) on your desktop.',
      'Use a Stickies note to jot down reminders, lists or other information.',
      'To close this note, click the close button.',
      'Your current notes appear when you open Stickies',
    ],
  },
];

export default function ToDoPage() {
  return (
    <div className="space-y-6">
      {/* Header & Add Task CTA */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-zinc-900 tracking-tight">Personal To-Do List</h1>
          <p className="text-sm text-zinc-500 mt-1">Manage your private stickies and personal task notes.</p>
        </div>

        <button className="px-5 py-2.5 rounded-full bg-[#d8f870] hover:bg-[#c4ea48] text-zinc-900 font-bold text-sm flex items-center gap-2 shadow-sm transition-colors">
          <span>Add Task</span>
          <span className="w-5 h-5 rounded-full bg-zinc-900 text-white flex items-center justify-center text-xs">
            +
          </span>
        </button>
      </div>

      {/* Sticky Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {stickyNotes.map((note) => (
          <div
            key={note.id}
            className={`${note.color} rounded-3xl p-5 shadow-sm space-y-4 flex flex-col justify-between border border-black/5 hover:shadow-md transition-shadow`}
          >
            <div className="space-y-3">
              {/* Header with status dot */}
              <div className="flex items-center gap-2">
                <span className={`w-3 h-3 rounded-full ${note.dotColor}`} />
                <h3 className="text-sm font-bold text-zinc-900">{note.title}</h3>
              </div>

              {/* Notes Content */}
              <div className="space-y-2 text-xs text-zinc-800 leading-relaxed font-medium">
                <p className="font-semibold">{note.notes[0]}</p>
                <ul className="list-disc pl-4 space-y-1 text-zinc-700">
                  <li>{note.notes[1]}</li>
                  <li>{note.notes[2]}</li>
                </ul>
                <p className="text-[11px] text-zinc-600 pt-1">{note.notes[3]}</p>
              </div>
            </div>

            {/* Bottom Formatting Toolbar */}
            <div className="pt-3 border-t border-black/10 flex items-center justify-between text-xs font-bold text-zinc-800">
              <span className="cursor-pointer hover:opacity-75">B</span>
              <span className="italic cursor-pointer hover:opacity-75">I</span>
              <span className="underline cursor-pointer hover:opacity-75">U</span>
              <span className="cursor-pointer hover:opacity-75">/</span>
              <span className="cursor-pointer hover:opacity-75">≡</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
