'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@clerk/nextjs';
import { Project } from '@synca/types';
import { CreateProjectInput, UpdateProjectInput } from '@synca/zod-schemas';
import {
  fetchUserProjects,
  joinProjectApi,
  createProjectApi,
  updateProjectApi,
  deleteProjectApi,
  ProjectFilters,
} from '@/lib/api/project.api';

// Shared in-memory cache for instant cross-component project synchronization (scoped to active userId)
let globalProjectsCache: Project[] | null = null;
let globalProjectsCacheUserId: string | null = null;
let globalProjectsCacheAt = 0;
let inFlightProjectsPromise: Promise<Project[]> | null = null;
let inFlightProjectsUserId: string | null = null;
const PROJECTS_TTL = 60 * 1000; // 60s fresh window to prevent mount request storms

export const getCachedProjectById = (id: string): Project | null => {
  if (!globalProjectsCache || !id) return null;
  return globalProjectsCache.find((p) => String(p._id) === String(id)) || null;
};

export const notifyProjectsChanged = () => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('synca:projects-changed'));
  }
};

export function useProjects() {
  const { getToken, isSignedIn, userId } = useAuth();

  const [projects, setProjects] = useState<Project[]>(() =>
    globalProjectsCache && globalProjectsCacheUserId === userId ? globalProjectsCache : []
  );
  const [isLoading, setIsLoading] = useState<boolean>(
    () => !(globalProjectsCache !== null && globalProjectsCacheUserId === userId)
  );
  const [error, setError] = useState<string | null>(null);

  // Authenticated executor with automatic 401 retry
  const withAuth = useCallback(
    async <T,>(action: (token: string) => Promise<T>): Promise<T> => {
      let token = await getToken();
      if (!token) {
        token = await getToken({ skipCache: true });
        if (!token) throw new Error('Authentication session required');
      }

      try {
        return await action(token);
      } catch (err: any) {
        if (err?.status === 401 || err?.code === 'UNAUTHORIZED') {
          const freshToken = await getToken({ skipCache: true });
          if (freshToken) {
            return await action(freshToken);
          }
        }
        throw err;
      }
    },
    [getToken]
  );

  // Load projects user is a member of with in-flight deduplication & SWR TTL
  const loadProjects = useCallback(
    async (filters?: ProjectFilters, force = false) => {
      if (!isSignedIn || !userId) {
        globalProjectsCache = null;
        globalProjectsCacheUserId = null;
        globalProjectsCacheAt = 0;
        inFlightProjectsPromise = null;
        inFlightProjectsUserId = null;
        setProjects([]);
        setIsLoading(false);
        return;
      }

      const hasFilters = Boolean(filters && (filters.status || filters.search));
      const hasValidCache = globalProjectsCache !== null && globalProjectsCacheUserId === userId;

      if (!hasFilters && !force && hasValidCache && Date.now() - globalProjectsCacheAt < PROJECTS_TTL) {
        setProjects(globalProjectsCache!);
        setIsLoading(false);
        return;
      }

      try {
        if (!hasValidCache || hasFilters) {
          setIsLoading(true);
        }
        setError(null);

        let list: Project[];
        if (!hasFilters) {
          if (!inFlightProjectsPromise || inFlightProjectsUserId !== userId || force) {
            inFlightProjectsUserId = userId;
            inFlightProjectsPromise = withAuth((token) => fetchUserProjects(token)).finally(() => {
              if (inFlightProjectsUserId === userId) {
                inFlightProjectsPromise = null;
              }
            });
          }
          list = await inFlightProjectsPromise;
          globalProjectsCache = list;
          globalProjectsCacheUserId = userId;
          globalProjectsCacheAt = Date.now();
        } else {
          list = await withAuth((token) => fetchUserProjects(token, filters));
        }

        setProjects(list);
      } catch (err: any) {
        console.error('[useProjects] Failed to load projects:', err);
        setError(err.message || 'Failed to load projects');
      } finally {
        setIsLoading(false);
      }
    },
    [isSignedIn, userId, withAuth]
  );

  useEffect(() => {
    if (globalProjectsCache && globalProjectsCacheUserId === userId) {
      setProjects(globalProjectsCache);
      setIsLoading(false);
    }
    loadProjects();

    const handleProjectsChanged = () => {
      if (globalProjectsCache && globalProjectsCacheUserId === userId) {
        setProjects([...globalProjectsCache]);
      } else {
        loadProjects(undefined, true);
      }
    };

    window.addEventListener('synca:projects-changed', handleProjectsChanged);
    return () => {
      window.removeEventListener('synca:projects-changed', handleProjectsChanged);
    };
  }, [loadProjects, userId]);

  // Create Project with instant cache update
  const createProject = useCallback(
    async (data: CreateProjectInput): Promise<Project> => {
      const created = await withAuth((token) => createProjectApi(data, token));
      globalProjectsCache = [created, ...(globalProjectsCache || [])];
      globalProjectsCacheUserId = userId || null;
      globalProjectsCacheAt = Date.now();
      setProjects(globalProjectsCache);
      notifyProjectsChanged();
      return created;
    },
    [withAuth, userId]
  );

  // Join Project by 6-character Join Code with instant cache update
  const joinProject = useCallback(
    async (joinCode: string): Promise<Project> => {
      const joined = await withAuth((token) => joinProjectApi(joinCode, token));
      const current = globalProjectsCache || [];
      const updated = current.some((p) => p._id === joined._id)
        ? current.map((p) => (p._id === joined._id ? joined : p))
        : [joined, ...current];
      globalProjectsCache = updated;
      globalProjectsCacheUserId = userId || null;
      globalProjectsCacheAt = Date.now();
      setProjects(updated);
      notifyProjectsChanged();
      return joined;
    },
    [withAuth, userId]
  );

  // Update Project with optimistic cache update & rollback
  const updateProject = useCallback(
    async (id: string, data: UpdateProjectInput): Promise<Project> => {
      const previous = globalProjectsCache ? [...globalProjectsCache] : [];
      if (previous.length > 0) {
        globalProjectsCache = previous.map((p) =>
          p._id === id ? ({ ...p, ...data } as Project) : p
        );
        globalProjectsCacheAt = Date.now();
        setProjects(globalProjectsCache);
        notifyProjectsChanged();
      }
      try {
        const updated = await withAuth((token) => updateProjectApi(id, data, token));
        const current = globalProjectsCache || [];
        globalProjectsCache = current.map((p) => (p._id === id ? updated : p));
        globalProjectsCacheAt = Date.now();
        setProjects(globalProjectsCache);
        notifyProjectsChanged();
        return updated;
      } catch (err) {
        globalProjectsCache = previous;
        setProjects(previous);
        notifyProjectsChanged();
        throw err;
      }
    },
    [withAuth]
  );

  // Delete Project with optimistic cache update & rollback
  const deleteProject = useCallback(
    async (id: string): Promise<void> => {
      const previous = globalProjectsCache ? [...globalProjectsCache] : [];
      globalProjectsCache = previous.filter((p) => p._id !== id);
      globalProjectsCacheAt = Date.now();
      setProjects(globalProjectsCache);
      notifyProjectsChanged();
      try {
        await withAuth((token) => deleteProjectApi(id, token));
      } catch (err) {
        globalProjectsCache = previous;
        setProjects(previous);
        notifyProjectsChanged();
        throw err;
      }
    },
    [withAuth]
  );

  return {
    projects,
    isLoading,
    error,
    refreshProjects: loadProjects,
    createProject,
    joinProject,
    updateProject,
    deleteProject,
  };
}
