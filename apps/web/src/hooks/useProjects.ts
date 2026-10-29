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

// Shared in-memory cache for instant cross-component project synchronization
let globalProjectsCache: Project[] | null = null;

export const notifyProjectsChanged = () => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('synca:projects-changed'));
  }
};

export function useProjects() {
  const { getToken, isSignedIn } = useAuth();

  const [projects, setProjects] = useState<Project[]>(() => globalProjectsCache || []);
  const [isLoading, setIsLoading] = useState<boolean>(() => globalProjectsCache === null);
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
      if (!isSignedIn) {
        if (globalProjectsCache === null) {
          setProjects([]);
          setIsLoading(false);
        }
        return;
      }

      try {
        // Only trigger loading state if we have no cached data at all
        if (!globalProjectsCache) {
          setIsLoading(true);
        }
        setError(null);
        const list = await withAuth((token) => fetchUserProjects(token, filters));
        globalProjectsCache = list;
        setProjects(list);
      } catch (err: any) {
        console.error('[useProjects] Failed to load projects:', err);
        setError(err.message || 'Failed to load projects');
      } finally {
        setIsLoading(false);
      }
    },
    [isSignedIn, withAuth]
  );

  useEffect(() => {
    // If we have cached projects, sync immediately
    if (globalProjectsCache) {
      setProjects(globalProjectsCache);
    }
    loadProjects();

    const handleProjectsChanged = () => {
      if (globalProjectsCache) {
        setProjects([...globalProjectsCache]);
      }
      loadProjects();
    };

    window.addEventListener('synca:projects-changed', handleProjectsChanged);
    return () => {
      window.removeEventListener('synca:projects-changed', handleProjectsChanged);
    };
  }, [loadProjects]);

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
