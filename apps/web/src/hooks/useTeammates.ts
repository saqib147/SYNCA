import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@clerk/nextjs';

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

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

let cache: Teammate[] | null = null;
let cacheUserId: string | null = null;
let cacheAt = 0;
const TTL = 5 * 60 * 1000; // 5 min

export function useTeammates() {
  const { getToken, isSignedIn, userId } = useAuth();
  const [teammates, setTeammates] = useState<Teammate[]>(() =>
    cache && cacheUserId === userId ? cache : []
  );
  const [isLoading, setIsLoading] = useState(() => !(cache && cacheUserId === userId));

  const fetchTeammates = useCallback(
    async (force = false) => {
      if (!isSignedIn || !userId) {
        cache = null;
        cacheUserId = null;
        cacheAt = 0;
        setTeammates([]);
        setIsLoading(false);
        return;
      }

      if (!force && cache && cacheUserId === userId && Date.now() - cacheAt < TTL) {
        setTeammates(cache);
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const token = await getToken();
        if (!token) return;
        const res = await window.fetch(`${API_BASE}/api/v1/users/teammates`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error('Failed to load teammates');
        const body = await res.json();
        const list: Teammate[] = body.data?.teammates || [];
        cache = list;
        cacheUserId = userId;
        cacheAt = Date.now();
        setTeammates(list);
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

    const handleRefresh = () => {
      fetchTeammates(true);
    };
    window.addEventListener('synca:projects-changed', handleRefresh);
    window.addEventListener('synca:dm-updated', handleRefresh);
    return () => {
      window.removeEventListener('synca:projects-changed', handleRefresh);
      window.removeEventListener('synca:dm-updated', handleRefresh);
    };
  }, [fetchTeammates]);

  const refetch = useCallback(() => fetchTeammates(true), [fetchTeammates]);

  return { teammates, isLoading, refetch };
}
