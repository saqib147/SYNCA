'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@clerk/nextjs';
import { Project } from '@synca/types';
import { CreateProjectInput, UpdateProjectInput } from '@synca/zod-schemas';
import {
  fetchWorkspaceProjects,
  createProjectApi,
  updateProjectApi,
  deleteProjectApi,
  ProjectFilters,
} from '@/lib/api/project.api';
import { useWorkspace } from '@/hooks/useWorkspace';

export const notifyProjectsChanged = () => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('synca:projects-changed'));
  }
};

export function useProjects(customWorkspaceId?: string) {
  const { getToken, isSignedIn } = useAuth();
  const { activeWorkspace } = useWorkspace();
  const workspaceId = customWorkspaceId || activeWorkspace?._id;

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

  // Load projects
  const loadProjects = useCallback(
    async (filters?: ProjectFilters) => {
      if (!isSignedIn || !workspaceId) {
        setProjects([]);
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);
        const list = await withAuth((token) =>
          fetchWorkspaceProjects(workspaceId, token, filters)
        );
        setProjects(list);
      } catch (err: any) {
        console.error('[useProjects] Failed to load projects:', err);
        setError(err.message || 'Failed to load projects');
      } finally {
        setIsLoading(false);
      }
    },
    [isSignedIn, workspaceId, withAuth]
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
      if (!workspaceId) throw new Error('No active workspace selected');

      const payload = {
        ...data,
        workspaceId: data.workspaceId || workspaceId,
      };

      const created = await withAuth((token) => createProjectApi(payload, token));
      setProjects((prev) => [created, ...prev]);
      notifyProjectsChanged();
      return created;
    },
    [workspaceId, withAuth]
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
    updateProject,
    deleteProject,
  };
}
