import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@clerk/nextjs';

export interface Teammate {
  userId: string;
  name: string;
  avatarUrl: string;
  sharedProjects: string[];
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

let cache: Teammate[] | null = null;
let cacheAt = 0;
const TTL = 5 * 60 * 1000; // 5 min

export function useTeammates() {
  const { getToken } = useAuth();
  const [teammates, setTeammates] = useState<Teammate[]>(cache || []);
  const [isLoading, setIsLoading] = useState(!cache);

  const fetch = useCallback(async () => {
    if (cache && Date.now() - cacheAt < TTL) {
      setTeammates(cache);
      setIsLoading(false);
      return;
    }
    try {
      setIsLoading(true);
      const token = await getToken();
      const res = await window.fetch(`${API_BASE}/api/v1/users/teammates`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to load teammates');
      const body = await res.json();
      const list: Teammate[] = body.data?.teammates || [];
      cache = list;
      cacheAt = Date.now();
      setTeammates(list);
    } catch (err) {
      console.error('[useTeammates]', err);
    } finally {
      setIsLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { teammates, isLoading, refetch: fetch };
}

