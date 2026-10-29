'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Search, X, MessageSquare, Mail, Users, Loader2, AtSign } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { useProjects } from '@/hooks/useProjects';
import { cn } from '@/lib/utils';

interface Teammate {
  userId: string;
  name: string;
  role?: string;
  avatarUrl?: string;
  projectNames: string[];
}

interface NewMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AVATAR_COLORS = [
  'bg-emerald-500',
  'bg-sky-500',
  'bg-amber-500',
  'bg-purple-500',
  'bg-rose-500',
  'bg-indigo-500',
  'bg-teal-500',
  'bg-orange-500',
];

function getColor(userId: string) {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export function NewMessageModal({ isOpen, onClose }: NewMessageModalProps) {
  const router = useRouter();
  const { userId: currentUserId } = useAuth();
  const { projects } = useProjects();

  const [query, setQuery] = useState('');
  const [mounted, setMounted] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => setMounted(true), []);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
    }
  }, [isOpen]);

  // Esc to close
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  // --- Tier 1: Derive teammates from shared projects ---
  const teammates = useMemo<Teammate[]>(() => {
    const map = new Map<string, Teammate>();

    for (const proj of projects) {
      // ownerId
      if (proj.ownerId && proj.ownerId !== currentUserId && !map.has(proj.ownerId)) {
        map.set(proj.ownerId, {
          userId: proj.ownerId,
          name: `Project Owner`,
          role: 'Admin',
          projectNames: [proj.name],
        });
      } else if (proj.ownerId && proj.ownerId !== currentUserId && map.has(proj.ownerId)) {
        map.get(proj.ownerId)!.projectNames.push(proj.name);
      }

      // members array (has .userId + .role)
      if (Array.isArray(proj.members)) {
        for (const m of proj.members as any[]) {
          const uid = m.userId;
          if (!uid || uid === currentUserId) continue;
          if (!map.has(uid)) {
            map.set(uid, {
              userId: uid,
              name: m.name || m.displayName || `Teammate`,
              role: m.role || 'Member',
              avatarUrl: m.avatarUrl || m.imageUrl,
              projectNames: [proj.name],
            });
          } else {
            map.get(uid)!.projectNames.push(proj.name);
          }
        }
      }

      // teamMembers string array (just userId)
      if (Array.isArray(proj.teamMembers)) {
        for (const uid of proj.teamMembers as string[]) {
          if (!uid || uid === currentUserId) continue;
          if (!map.has(uid)) {
            map.set(uid, {
              userId: uid,
              name: `Member ${uid.slice(-4)}`,
              role: 'Member',
              projectNames: [proj.name],
            });
          } else {
            map.get(uid)!.projectNames.push(proj.name);
          }
        }
      }
    }

    return Array.from(map.values());
  }, [projects, currentUserId]);

  // --- Tier 1 filter by display name / partial match ---
  const isEmailQuery = query.includes('@');
  const trimmedQuery = query.trim().toLowerCase();

  const filteredTeammates = useMemo(() => {
    if (!trimmedQuery || isEmailQuery) return teammates;
    return teammates.filter((t) => t.name.toLowerCase().includes(trimmedQuery));
  }, [teammates, trimmedQuery, isEmailQuery]);

  const handleSelect = (teammate: Teammate) => {
    onClose();
    router.push(`/chats?dm=${teammate.userId}&name=${encodeURIComponent(teammate.name)}`);
  };

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9998] flex items-start justify-center pt-[12vh] px-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="relative z-10 w-full max-w-md bg-[#16191e] border border-zinc-800/80 rounded-3xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-4 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 pt-5 pb-4 border-b border-zinc-800/60">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
                <MessageSquare className="w-4 h-4 text-emerald-400" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-zinc-100">New Message</h2>
                <p className="text-[11px] text-zinc-500">Start a 1:1 conversation</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search teammates or enter exact email..."
              className="w-full pl-9 pr-4 py-2.5 bg-zinc-900 border border-zinc-700/60 rounded-2xl text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500/40 transition-all"
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Results */}
        <div className="overflow-y-auto max-h-80 scrollbar-thin scrollbar-thumb-zinc-800">
          {/* Tier 1 – Teammates from shared projects */}
          {!isEmailQuery && (
            <div>
              {filteredTeammates.length > 0 ? (
                <div>
                  {!trimmedQuery && (
                    <div className="px-5 pt-3 pb-1.5 flex items-center gap-2">
                      <Users className="w-3 h-3 text-zinc-500" />
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                        Your Teammates
                      </span>
                    </div>
                  )}
                  {filteredTeammates.map((teammate) => {
                    const color = getColor(teammate.userId);
                    return (
                      <button
                        key={teammate.userId}
                        onClick={() => handleSelect(teammate)}
                        className="w-full flex items-center gap-3 px-5 py-3 hover:bg-zinc-800/50 transition-colors text-left group"
                      >
                        {/* Avatar */}
                        <div className="relative flex-shrink-0">
                          {teammate.avatarUrl ? (
                            <img
                              src={teammate.avatarUrl}
                              alt={teammate.name}
                              className="w-9 h-9 rounded-full object-cover"
                            />
                          ) : (
                            <div
                              className={cn(
                                'w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm text-white',
                                color
                              )}
                            >
                              {teammate.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-[#16191e]" />
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-zinc-200 group-hover:text-white truncate">
                            {teammate.name}
                          </p>
                          <p className="text-[11px] text-zinc-500 truncate">
                            {teammate.role} · {teammate.projectNames.slice(0, 2).join(', ')}
                            {teammate.projectNames.length > 2 && ` +${teammate.projectNames.length - 2}`}
                          </p>
                        </div>

                        {/* CTA */}
                        <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                          <span className="px-2 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-semibold">
                            Message
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : trimmedQuery ? (
                <div className="px-5 py-8 text-center">
                  <p className="text-sm text-zinc-500">No teammates named "{query}"</p>
                  <p className="text-[11px] text-zinc-600 mt-1">
                    Try entering their exact email address to find external users
                  </p>
                </div>
              ) : teammates.length === 0 ? (
                <div className="px-5 py-8 text-center">
                  <Users className="w-8 h-8 text-zinc-700 mx-auto mb-2" />
                  <p className="text-sm text-zinc-500">No teammates yet</p>
                  <p className="text-[11px] text-zinc-600 mt-1">
                    Join a project to connect with collaborators
                  </p>
                </div>
              ) : null}
            </div>
          )}

          {/* Tier 3 – Exact email search */}
          {isEmailQuery && (
            <div className="px-5 pt-4 pb-3">
              <div className="flex items-center gap-2 mb-3">
                <AtSign className="w-3.5 h-3.5 text-zinc-500" />
                <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                  Email Lookup
                </span>
              </div>
              <div className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800/60 text-center space-y-1.5">
                <Mail className="w-6 h-6 text-zinc-600 mx-auto" />
                <p className="text-xs text-zinc-400">
                  Send a message to <span className="text-zinc-200 font-semibold">{query}</span>
                </p>
                <p className="text-[11px] text-zinc-600">
                  If this user exists on Synca, the conversation will open.
                </p>
                <button
                  onClick={() => {
                    onClose();
                    router.push(`/chats?email=${encodeURIComponent(query)}`);
                  }}
                  className="mt-2 w-full py-2 px-4 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-400 text-xs font-semibold transition-colors flex items-center justify-center gap-2"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  Start conversation
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer hint */}
        <div className="px-5 py-3 border-t border-zinc-800/60 flex items-center justify-between">
          <p className="text-[11px] text-zinc-600">
            {teammates.length} teammate{teammates.length !== 1 ? 's' : ''} in your network
          </p>
          <div className="flex items-center gap-2 text-[11px] text-zinc-600">
            <kbd className="px-1.5 py-0.5 rounded-md bg-zinc-800 border border-zinc-700 font-mono text-zinc-400">↑↓</kbd>
            <span>navigate</span>
            <kbd className="px-1.5 py-0.5 rounded-md bg-zinc-800 border border-zinc-700 font-mono text-zinc-400">Esc</kbd>
            <span>close</span>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

