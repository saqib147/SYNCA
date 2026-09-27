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

export const notifyProjectsChanged = () => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('synca:projects-changed'));
  }
};

export function useProjects() {
  const { getToken, isSignedIn } = useAuth();

  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
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

  // Load projects user is a member of
  const loadProjects = useCallback(
    async (filters?: ProjectFilters) => {
      if (!isSignedIn) {
        setProjects([]);
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);
        const list = await withAuth((token) => fetchUserProjects(token, filters));
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
    loadProjects();

    const handleProjectsChanged = () => {
      loadProjects();
    };

    window.addEventListener('synca:projects-changed', handleProjectsChanged);
    return () => {
      window.removeEventListener('synca:projects-changed', handleProjectsChanged);
    };
  }, [loadProjects]);

  // Create Project
  const createProject = useCallback(
    async (data: CreateProjectInput): Promise<Project> => {
      const created = await withAuth((token) => createProjectApi(data, token));
      setProjects((prev) => [created, ...prev]);
      notifyProjectsChanged();
      return created;
    },
    [withAuth]
  );

  // Join Project by 6-character Join Code
  const joinProject = useCallback(
    async (joinCode: string): Promise<Project> => {
      const joined = await withAuth((token) => joinProjectApi(joinCode, token));
      setProjects((prev) => {
        if (prev.some((p) => p._id === joined._id)) {
          return prev.map((p) => (p._id === joined._id ? joined : p));
        }
        return [joined, ...prev];
      });
      notifyProjectsChanged();
      return joined;
    },
    [withAuth]
  );

  // Update Project
  const updateProject = useCallback(
    async (id: string, data: UpdateProjectInput): Promise<Project> => {
      const updated = await withAuth((token) => updateProjectApi(id, data, token));
      setProjects((prev) => prev.map((p) => (p._id === id ? updated : p)));
      notifyProjectsChanged();
      return updated;
    },
    [withAuth]
  );

  // Delete Project
  const deleteProject = useCallback(
    async (id: string): Promise<void> => {
      await withAuth((token) => deleteProjectApi(id, token));
      setProjects((prev) => prev.filter((p) => p._id !== id));
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
