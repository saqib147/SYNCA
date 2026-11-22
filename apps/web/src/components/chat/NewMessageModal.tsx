'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  Search,
  X,
  MessageSquare,
  Mail,
  Users,
  Loader2,
  AtSign,
  AlertCircle,
  ArrowRight,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { useTeammates, Teammate, upsertDmPeerLocally } from '@/hooks/useTeammates';
import { useSocket } from '@/context/SocketContext';
import { cn } from '@/lib/utils';

interface NewMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface LookupResult {
  userId: string;
  name: string;
  email: string;
  avatarUrl?: string;
}

const AVATAR_COLORS = [
  'bg-emerald-600',
  'bg-sky-600',
  'bg-amber-600',
  'bg-purple-600',
  'bg-rose-600',
  'bg-indigo-600',
  'bg-teal-600',
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
  const { getToken, userId } = useAuth();
  const { allTeammates: teammates } = useTeammates();
  const { onlineUsers } = useSocket();

  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const [mounted, setMounted] = useState(false);

  // Inline live email lookup state (Tier 3 discovery without blind redirect)
  const [lookupState, setLookupState] = useState<
    'idle' | 'loading' | 'found' | 'not_found' | 'error'
  >('idle');
  const [lookupResult, setLookupResult] = useState<LookupResult | null>(null);
  const [lookupError, setLookupError] = useState<string>('');

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (isOpen) {
      setActiveIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
      setLookupState('idle');
      setLookupResult(null);
      setLookupError('');
    }
  }, [isOpen]);

  const isEmailQuery = query.includes('@');
  const trimmedQuery = query.trim().toLowerCase();

  const filteredTeammates = useMemo(() => {
    if (!trimmedQuery || isEmailQuery) return teammates;
    return teammates.filter((t) => t.name.toLowerCase().includes(trimmedQuery));
  }, [teammates, trimmedQuery, isEmailQuery]);

  useEffect(() => {
    setActiveIndex(0);
    if (!isEmailQuery) {
      setLookupState('idle');
      setLookupResult(null);
      setLookupError('');
    }
  }, [query, isEmailQuery]);

  const handleSelect = React.useCallback(
    (peer: { userId: string; name: string; avatarUrl?: string }) => {
      // Optimistically add/unhide in sidebar immediately (0ms, no refresh needed)
      upsertDmPeerLocally(userId, {
        userId: peer.userId,
        name: peer.name,
        avatarUrl: peer.avatarUrl,
      });
      onClose();
      router.push(
        `/chats?dm=${peer.userId}&name=${encodeURIComponent(peer.name)}&avatar=${encodeURIComponent(peer.avatarUrl || '')}`
      );
    },
    [onClose, router, userId]
  );

  const handleLookupEmail = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const email = query.trim();
    if (!email || !email.includes('@')) return;

    try {
      setLookupState('loading');
      setLookupError('');
      setLookupResult(null);

      const token = await getToken();
      const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const res = await window.fetch(
        `${apiBase}/api/v1/users/lookup?email=${encodeURIComponent(email)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const body = await res.json().catch(() => ({}));
      if (res.ok && body.data?.userId) {
        const found = {
          userId: body.data.userId,
          name: body.data.name || email,
          email: body.data.email || email,
          avatarUrl: body.data.avatarUrl,
        };
        setLookupResult(found);
        setLookupState('found');
        // Open conversation immediately in 1 click (and show in sidebar right away)
        handleSelect(found);
      } else {
        setLookupError(
          body?.error?.message || `No Synca user found for "${email}".`
        );
        setLookupState('not_found');
      }
    } catch {
      setLookupError('Could not complete lookup. Please try again.');
      setLookupState('error');
    }
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (
        e.key === 'ArrowDown' &&
        !isEmailQuery &&
        filteredTeammates.length > 0
      ) {
        e.preventDefault();
        setActiveIndex((prev) => (prev + 1) % filteredTeammates.length);
      } else if (
        e.key === 'ArrowUp' &&
        !isEmailQuery &&
        filteredTeammates.length > 0
      ) {
        e.preventDefault();
        setActiveIndex(
          (prev) =>
            (prev - 1 + filteredTeammates.length) % filteredTeammates.length
        );
      } else if (
        e.key === 'Enter' &&
        !isEmailQuery &&
        filteredTeammates[activeIndex]
      ) {
        e.preventDefault();
        handleSelect(filteredTeammates[activeIndex]);
      }
    };
    if (isOpen) window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [
    isOpen,
    onClose,
    isEmailQuery,
    filteredTeammates,
    activeIndex,
    handleSelect,
  ]);

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9998] flex items-start justify-center pt-[12vh] px-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      <div
        className="relative z-10 w-full max-w-[460px] bg-white dark:bg-[#14171c] border border-[#bdc9c2] dark:border-white/[0.1] rounded-[20px] shadow-2xl overflow-hidden text-[#191c1d] dark:text-zinc-100 animate-in fade-in slide-in-from-top-3 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 pt-5 pb-4 border-b border-[#e5e7eb] dark:border-white/[0.08]">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="size-9 rounded-[10px] bg-[#e6f7f1] dark:bg-[#006c52]/25 border border-[#79deba]/60 dark:border-[#79deba]/30 flex items-center justify-center text-[#006c52] dark:text-[#66deb4]">
                <MessageSquare className="w-4 h-4" />
              </div>
              <div>
                <h2 className="font-['Funnel_Display',sans-serif] font-medium text-[19px] leading-[24px] text-[#191c1d] dark:text-white">
                  New Message
                </h2>
                <p className="text-[12px] text-[#3e4944] dark:text-zinc-400">
                  Message a teammate or find someone by exact email
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-[8px] text-[#3e4944] dark:text-zinc-400 hover:bg-[#f3f3f3] dark:hover:bg-white/[0.08] transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Search Input */}
          <form onSubmit={handleLookupEmail} className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#3e4944] dark:text-zinc-400 pointer-events-none" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search teammates or type exact email..."
              className="w-full h-[42px] pl-10 pr-9 bg-[#f8f9fa] dark:bg-white/[0.04] border border-[#bdc9c2] dark:border-white/[0.12] rounded-[10px] text-[13.5px] text-[#191c1d] dark:text-white placeholder-[#3e4944]/60 dark:placeholder-zinc-500 focus:outline-none focus:border-[#006c52] dark:focus:border-[#66deb4] transition-colors"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded text-[#3e4944] dark:text-zinc-400 hover:text-[#191c1d] dark:hover:text-white cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </form>
        </div>

        {/* Results */}
        <div className="overflow-y-auto max-h-80 scrollbar-thin">
          {/* Teammates & Recent Chats */}
          {!isEmailQuery && (
            <div>
              {filteredTeammates.length > 0 ? (
                <div className="py-2">
                  {!trimmedQuery && (
                    <div className="px-6 pt-1.5 pb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.7px] text-[#3e4944] dark:text-zinc-500">
                      <Users className="w-3 h-3" />
                      <span>People in Your Network</span>
                    </div>
                  )}
                  {filteredTeammates.map((teammate: Teammate, idx) => {
                    const color = getColor(teammate.userId);
                    const isOnline = Boolean(onlineUsers[teammate.userId]);
                    const isHighlighted = idx === activeIndex;
                    return (
                      <button
                        key={teammate.userId}
                        type="button"
                        onClick={() => handleSelect(teammate)}
                        onMouseEnter={() => setActiveIndex(idx)}
                        className={cn(
                          'w-full flex items-center gap-3 px-6 py-2.5 transition-colors text-left group cursor-pointer',
                          isHighlighted
                            ? 'bg-[#eefaf5] dark:bg-[#006c52]/15'
                            : 'hover:bg-[#f8f9fa] dark:hover:bg-white/[0.04]'
                        )}
                      >
                        <div className="relative shrink-0">
                          {teammate.avatarUrl ? (
                            <img
                              src={teammate.avatarUrl}
                              alt={teammate.name}
                              className="size-9 rounded-full object-cover"
                            />
                          ) : (
                            <div
                              className={cn(
                                'size-9 rounded-full flex items-center justify-center font-semibold text-sm text-white',
                                color
                              )}
                            >
                              {teammate.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <span
                            className={cn(
                              'absolute bottom-0 right-0 size-2.5 rounded-full border-2 border-white dark:border-[#14171c]',
                              isOnline ? 'bg-[#66deb4]' : 'bg-zinc-400'
                            )}
                          />
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className="text-[14px] font-medium text-[#191c1d] dark:text-zinc-100 truncate">
                            {teammate.name}
                          </p>
                          {teammate.sharedProjects &&
                          teammate.sharedProjects.length > 0 ? (
                            <p className="text-[11.5px] text-[#3e4944] dark:text-zinc-400 truncate">
                              {teammate.sharedProjects.slice(0, 2).join(', ')}
                              {teammate.sharedProjects.length > 2 &&
                                ` +${teammate.sharedProjects.length - 2}`}
                            </p>
                          ) : (
                            <p className="text-[11.5px] text-[#3e4944] dark:text-zinc-500">
                              {isOnline ? 'Active now' : 'Direct contact'}
                            </p>
                          )}
                        </div>

                        <span className="px-2.5 py-1 rounded-[6px] bg-[#e6f7f1] dark:bg-[#006c52]/25 text-[#006c52] dark:text-[#79deba] text-[11px] font-semibold opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                          Message
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : trimmedQuery ? (
                <div className="px-6 py-9 text-center space-y-1.5">
                  <p className="text-[14px] font-medium text-[#191c1d] dark:text-zinc-200">
                    No teammates named &ldquo;{query}&rdquo;
                  </p>
                  <p className="text-[12.5px] text-[#3e4944] dark:text-zinc-400">
                    Type their full email address (e.g. name@domain.com) to find any Synca user.
                  </p>
                </div>
              ) : (
                <div className="px-6 py-9 text-center space-y-2">
                  <div className="size-10 rounded-[12px] bg-[#eefaf5] dark:bg-[#006c52]/20 flex items-center justify-center mx-auto text-[#006c52] dark:text-[#66deb4]">
                    <Users className="w-5 h-5" />
                  </div>
                  <p className="text-[14px] font-medium text-[#191c1d] dark:text-zinc-200">
                    Start your first conversation
                  </p>
                  <p className="text-[12.5px] text-[#3e4944] dark:text-zinc-400 max-w-xs mx-auto">
                    Join a project to see teammates here, or enter anyone&apos;s exact Synca email above to message them directly.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Tier 3: Exact Email Live Lookup */}
          {isEmailQuery && (
            <div className="px-6 py-5 space-y-3">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.7px] text-[#3e4944] dark:text-zinc-400">
                <AtSign className="w-3.5 h-3.5" />
                <span>Find User by Email</span>
              </div>

              {lookupState === 'found' && lookupResult ? (
                <div className="p-4 rounded-[12px] bg-[#eefaf5] dark:bg-[#006c52]/15 border border-[#79deba] flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="size-10 rounded-full bg-[#006c52] text-white flex items-center justify-center font-semibold text-sm overflow-hidden shrink-0">
                      {lookupResult.avatarUrl ? (
                        <img
                          src={lookupResult.avatarUrl}
                          alt={lookupResult.name}
                          className="size-full object-cover"
                        />
                      ) : (
                        lookupResult.name.charAt(0).toUpperCase()
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[14px] font-semibold text-[#191c1d] dark:text-white truncate">
                        {lookupResult.name}
                      </p>
                      <p className="text-[12px] text-[#3e4944] dark:text-zinc-400 truncate">
                        {lookupResult.email}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleSelect(lookupResult)}
                    className="px-3.5 py-2 rounded-[8px] bg-[#006c52] dark:bg-[#66deb4] text-white dark:text-[#111316] text-[12.5px] font-semibold inline-flex items-center gap-1.5 shrink-0 cursor-pointer"
                  >
                    <span>Chat</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div className="p-4 rounded-[12px] bg-[#f8f9fa] dark:bg-white/[0.03] border border-[#e5e7eb] dark:border-white/[0.08] text-center space-y-2.5">
                  {lookupState === 'not_found' || lookupState === 'error' ? (
                    <div className="flex items-center justify-center gap-2 text-[#93000a] dark:text-rose-300 text-[12.5px] bg-[#ffdad6] dark:bg-rose-500/15 px-3 py-2 rounded-[8px]">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{lookupError}</span>
                    </div>
                  ) : (
                    <>
                      <Mail className="w-6 h-6 text-[#006c52] dark:text-[#66deb4] mx-auto" />
                      <p className="text-[13px] text-[#3e4944] dark:text-zinc-300">
                        Look up <strong className="text-[#191c1d] dark:text-white">{query.trim()}</strong> on Synca
                      </p>
                    </>
                  )}
                  <button
                    type="button"
                    disabled={lookupState === 'loading'}
                    onClick={() => handleLookupEmail()}
                    className="w-full py-2.5 px-4 rounded-[8px] bg-[#006c52] hover:bg-[#005742] dark:bg-[#66deb4] dark:hover:bg-[#52d1a4] text-white dark:text-[#111316] text-[13px] font-semibold transition-colors inline-flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                  >
                    {lookupState === 'loading' ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Searching Synca...</span>
                      </>
                    ) : (
                      <>
                        <Search className="w-3.5 h-3.5" />
                        <span>Find &amp; Message</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-[#f8f9fa] dark:bg-white/[0.02] border-t border-[#e5e7eb] dark:border-white/[0.06] flex items-center justify-between text-[11px] text-[#3e4944] dark:text-zinc-500">
          <span>
            {teammates.length} {teammates.length === 1 ? 'contact' : 'contacts'}
          </span>
          <div className="flex items-center gap-2">
            <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-white/[0.06] border border-[#bdc9c2] dark:border-white/[0.1] font-mono">
              ↑↓
            </kbd>
            <span>navigate</span>
            <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-white/[0.06] border border-[#bdc9c2] dark:border-white/[0.1] font-mono">
              Esc
            </kbd>
            <span>close</span>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
