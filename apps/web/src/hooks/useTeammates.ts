import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@clerk/nextjs';
import { API_BASE_URL as API_BASE } from '@/lib/env';

export interface Teammate {
  userId: string;
  name: string;
  avatarUrl: string;
  sharedProjects: string[];
  lastMessageAt?: string | null;
  lastMessagePreview?: string | null;
}

export const notifyDmUpdated = () => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('synca:dm-updated'));
  }
};

const HIDDEN_KEY_PREFIX = 'synca:hidden-dms:';

function readHiddenDms(userId?: string | null): Record<string, number> {
  if (typeof window === 'undefined' || !userId) return {};
  try {
    const raw = window.localStorage.getItem(`${HIDDEN_KEY_PREFIX}${userId}`);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeHiddenDms(userId: string, map: Record<string, number>) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(`${HIDDEN_KEY_PREFIX}${userId}`, JSON.stringify(map));
  } catch {
    // ignore storage quota errors
  }
}

export function hideDmPeerLocally(userId: string | null | undefined, peerId: string) {
  if (!userId || !peerId) return;
  const current = readHiddenDms(userId);
  current[peerId] = Date.now();
  writeHiddenDms(userId, current);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('synca:dm-optimistic'));
  }
}

export function upsertDmPeerLocally(
  userId: string | null | undefined,
  peer: {
    userId: string;
    name: string;
    avatarUrl?: string;
    lastMessagePreview?: string | null;
    lastMessageAt?: string | null;
  }
) {
  if (!userId || !peer.userId || peer.userId === userId) return;

  // Unhide if previously deleted
  const hidden = readHiddenDms(userId);
  if (hidden[peer.userId]) {
    delete hidden[peer.userId];
    writeHiddenDms(userId, hidden);
  }

  // Optimistically upsert into shared in-memory cache & move to top
  const existingList = cache && cacheUserId === userId ? [...cache] : [];
  const existing = existingList.find((t) => t.userId === peer.userId);
  const merged: Teammate = {
    userId: peer.userId,
    name: peer.name || existing?.name || 'Direct Message',
    avatarUrl: peer.avatarUrl ?? existing?.avatarUrl ?? '',
    sharedProjects: existing?.sharedProjects || [],
    lastMessageAt:
      peer.lastMessageAt !== undefined
        ? peer.lastMessageAt
        : existing?.lastMessageAt || new Date().toISOString(),
    lastMessagePreview:
      peer.lastMessagePreview !== undefined
        ? peer.lastMessagePreview
        : existing?.lastMessagePreview ?? null,
  };

  cache = [merged, ...existingList.filter((t) => t.userId !== peer.userId)];
  cacheUserId = userId;
  cacheAt = Date.now();

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('synca:dm-optimistic'));
  }
}

let cache: Teammate[] | null = null;
let cacheUserId: string | null = null;
let cacheAt = 0;
let inFlightTeammatesPromise: Promise<Teammate[]> | null = null;
let inFlightTeammatesUserId: string | null = null;
const TTL = 5 * 60 * 1000; // 5 min

export function useTeammates() {
  const { getToken, isSignedIn, userId } = useAuth();
  const [rawTeammates, setRawTeammates] = useState<Teammate[]>(() =>
    cache && cacheUserId === userId ? cache : []
  );
  const [hiddenMap, setHiddenMap] = useState<Record<string, number>>(() =>
    readHiddenDms(userId)
  );
  const [isLoading, setIsLoading] = useState(() => !(cache && cacheUserId === userId));

  const fetchTeammates = useCallback(
    async (force = false) => {
      if (!isSignedIn || !userId) {
        cache = null;
        cacheUserId = null;
        cacheAt = 0;
        inFlightTeammatesPromise = null;
        inFlightTeammatesUserId = null;
        setRawTeammates([]);
        setHiddenMap({});
        setIsLoading(false);
        return;
      }

      setHiddenMap(readHiddenDms(userId));

      if (!force && cache && cacheUserId === userId && Date.now() - cacheAt < TTL) {
        setRawTeammates(cache);
        setIsLoading(false);
        return;
      }

      try {
        // Only show loading state on initial cold fetch — never flash spinners during background refreshes
        if (!cache || cacheUserId !== userId) {
          setIsLoading(true);
        }

        if (!inFlightTeammatesPromise || inFlightTeammatesUserId !== userId || force) {
          inFlightTeammatesUserId = userId;
          inFlightTeammatesPromise = (async () => {
            const token = await getToken();
            if (!token) return cache && cacheUserId === userId ? cache : [];
            const res = await window.fetch(`${API_BASE}/api/v1/users/teammates`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) throw new Error('Failed to load teammates');
            const body = await res.json();
            const list: Teammate[] = body.data?.teammates || [];
            cache = list;
            cacheUserId = userId;
            cacheAt = Date.now();
            return list;
          })().finally(() => {
            if (inFlightTeammatesUserId === userId) {
              inFlightTeammatesPromise = null;
            }
          });
        }

        const list = await inFlightTeammatesPromise;
        setRawTeammates(list);
      } catch (err) {
        console.error('[useTeammates]', err);
      } finally {
        setIsLoading(false);
      }
    },
    [getToken, isSignedIn, userId]
  );

  useEffect(() => {
    fetchTeammates(false);

    const handleOptimistic = () => {
      setHiddenMap(readHiddenDms(userId));
      if (cache && cacheUserId === userId) {
        setRawTeammates([...cache]);
      }
    };
    const handleRefresh = () => {
      setHiddenMap(readHiddenDms(userId));
      fetchTeammates(true);
    };
    window.addEventListener('synca:dm-optimistic', handleOptimistic);
    window.addEventListener('synca:projects-changed', handleRefresh);
    window.addEventListener('synca:dm-updated', handleRefresh);
    return () => {
      window.removeEventListener('synca:dm-optimistic', handleOptimistic);
      window.removeEventListener('synca:projects-changed', handleRefresh);
      window.removeEventListener('synca:dm-updated', handleRefresh);
    };
  }, [fetchTeammates, userId]);

  // Visible teammates for Sidebar/Hub: hide conversations the user deleted unless a newer message arrived after deletion
  const teammates = useMemo(() => {
    return rawTeammates.filter((tm) => {
      const hiddenAt = hiddenMap[tm.userId];
      if (!hiddenAt) return true;
      if (tm.lastMessageAt) {
        const lastMs = new Date(tm.lastMessageAt).getTime();
        if (!Number.isNaN(lastMs) && lastMs > hiddenAt) {
          return true;
        }
      }
      return false;
    });
  }, [rawTeammates, hiddenMap]);

  const deleteConversation = useCallback(
    async (peerId: string): Promise<void> => {
      if (!userId) return;
      const previousCache = cache ? [...cache] : [];
      const previousHidden = readHiddenDms(userId);

      // Optimistically hide locally & remove from cache immediately
      const nextHidden = { ...previousHidden, [peerId]: Date.now() };
      writeHiddenDms(userId, nextHidden);
      cache = previousCache.filter((t) => t.userId !== peerId);
      setRawTeammates(cache);
      setHiddenMap(nextHidden);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('synca:dm-optimistic'));
      }

      try {
        const token = await getToken();
        if (!token) throw new Error('Authentication required');

        const res = await window.fetch(`${API_BASE}/api/v1/messages/dm/${encodeURIComponent(peerId)}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body?.error?.message || 'Failed to delete conversation');
        }
      } catch (err) {
        // Rollback on API failure
        writeHiddenDms(userId, previousHidden);
        cache = previousCache;
        setRawTeammates(previousCache);
        setHiddenMap(previousHidden);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('synca:dm-optimistic'));
        }
        throw err;
      }
    },
    [getToken, userId]
  );

  const refetch = useCallback(() => fetchTeammates(true), [fetchTeammates]);

  return {
    teammates,
    allTeammates: rawTeammates,
    isLoading,
    refetch,
    deleteConversation,
  };
}
