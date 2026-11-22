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

  // Load projects user is a member of with SWR background revalidation
  const loadProjects = useCallback(
    async (filters?: ProjectFilters) => {
      if (!isSignedIn || !userId) {
        globalProjectsCache = null;
        globalProjectsCacheUserId = null;
        setProjects([]);
        setIsLoading(false);
        return;
      }

      const hasFilters = Boolean(filters && (filters.status || filters.search));
      const hasValidCache = globalProjectsCache !== null && globalProjectsCacheUserId === userId;

      try {
        if (!hasValidCache || hasFilters) {
          setIsLoading(true);
        }
        setError(null);
        const list = await withAuth((token) => fetchUserProjects(token, filters));
        // Only update global cache for unfiltered full lists
        if (!hasFilters) {
          globalProjectsCache = list;
          globalProjectsCacheUserId = userId;
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
    }
    loadProjects();

    const handleProjectsChanged = () => {
      if (globalProjectsCache && globalProjectsCacheUserId === userId) {
        setProjects([...globalProjectsCache]);
      } else {
        loadProjects();
      }
    };

    window.addEventListener('synca:projects-changed', handleProjectsChanged);
    return () => {
      window.removeEventListener('synca:projects-changed', handleProjectsChanged);
    };
  }, [loadProjects, userId]);

  // Create Project with optimistic instant cache update
  const createProject = useCallback(
    async (data: CreateProjectInput): Promise<Project> => {
      const created = await withAuth((token) => createProjectApi(data, token));
      globalProjectsCache = [created, ...(globalProjectsCache || [])];
      setProjects(globalProjectsCache);
      notifyProjectsChanged();
      return created;
    },
    [withAuth]
  );

  // Join Project by 6-character Join Code with optimistic cache update
  const joinProject = useCallback(
    async (joinCode: string): Promise<Project> => {
      const joined = await withAuth((token) => joinProjectApi(joinCode, token));
      const current = globalProjectsCache || [];
      const updated = current.some((p) => p._id === joined._id)
        ? current.map((p) => (p._id === joined._id ? joined : p))
        : [joined, ...current];
      globalProjectsCache = updated;
      setProjects(updated);
      notifyProjectsChanged();
      return joined;
    },
    [withAuth]
  );

  // Update Project with optimistic cache update
  const updateProject = useCallback(
    async (id: string, data: UpdateProjectInput): Promise<Project> => {
      const updated = await withAuth((token) => updateProjectApi(id, data, token));
      const current = globalProjectsCache || [];
      globalProjectsCache = current.map((p) => (p._id === id ? updated : p));
      setProjects(globalProjectsCache);
      notifyProjectsChanged();
      return updated;
    },
    [withAuth]
  );

  // Delete Project with optimistic cache update
  const deleteProject = useCallback(
    async (id: string): Promise<void> => {
      await withAuth((token) => deleteProjectApi(id, token));
      const current = globalProjectsCache || [];
      globalProjectsCache = current.filter((p) => p._id !== id);
      setProjects(globalProjectsCache);
      notifyProjectsChanged();
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
