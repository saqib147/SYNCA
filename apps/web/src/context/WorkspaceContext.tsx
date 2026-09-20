'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from 'react';
import { useAuth } from '@clerk/nextjs';
import { Workspace, WorkspaceRole } from '@synca/types';
import {
  CreateWorkspaceInput,
  JoinWorkspaceInput,
  UpdateWorkspaceInput,
} from '@synca/zod-schemas';
import {
  fetchUserWorkspaces,
  createWorkspaceApi,
  joinWorkspaceApi,
  updateWorkspaceApi,
  removeMemberApi,
  deleteWorkspaceApi,
} from '@/lib/api/workspace.api';

const ACTIVE_WORKSPACE_KEY = 'synca_active_workspace_id';

export interface WorkspaceContextType {
  workspaces: Workspace[];
  activeWorkspace: Workspace | null;
  isLoading: boolean;
  error: string | null;
  userRole: WorkspaceRole | null;
  isOwner: boolean;
  isAdmin: boolean;
  setActiveWorkspace: (workspace: Workspace | null) => void;
  setActiveWorkspaceId: (id: string) => void;
  refreshWorkspaces: () => Promise<void>;
  createWorkspace: (data: CreateWorkspaceInput) => Promise<Workspace>;
  joinWorkspace: (joinCode: string) => Promise<Workspace>;
  updateWorkspace: (id: string, data: UpdateWorkspaceInput) => Promise<Workspace>;
  leaveWorkspace: (workspaceId: string) => Promise<void>;
  deleteWorkspace: (workspaceId: string) => Promise<void>;
}

export const WorkspaceContext = createContext<WorkspaceContextType | undefined>(
  undefined
);

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const { getToken, userId, isSignedIn } = useAuth();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWorkspace, setActiveWorkspaceState] = useState<Workspace | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Set active workspace and sync with localStorage
  const setActiveWorkspace = useCallback((ws: Workspace | null) => {
    setActiveWorkspaceState(ws);
    if (typeof window !== 'undefined') {
      if (ws?._id) {
        localStorage.setItem(ACTIVE_WORKSPACE_KEY, ws._id);
      } else {
        localStorage.removeItem(ACTIVE_WORKSPACE_KEY);
      }
    }
  }, []);

  const setActiveWorkspaceId = useCallback(
    (id: string) => {
      const match = workspaces.find((w) => w._id === id || w.slug === id);
      if (match) {
        setActiveWorkspace(match);
      }
    },
    [workspaces, setActiveWorkspace]
  );

  // Helper to execute an API action with automatic token refresh on 401
  const withAuth = useCallback(
    async <T,>(action: (token: string) => Promise<T>): Promise<T> => {
      let token = await getToken();
      if (!token) {
        // Try skipping cache if initial getToken is empty
        token = await getToken({ skipCache: true });
        if (!token) {
          throw new Error('Your session has expired. Please sign in again.');
        }
      }

      try {
        return await action(token);
      } catch (err: any) {
        // If 401 UNAUTHORIZED, attempt to force-refresh token from Clerk and retry once
        if (err?.status === 401 || err?.code === 'UNAUTHORIZED') {
          console.warn('[WorkspaceContext] 401 received, attempting force token refresh...');
          const freshToken = await getToken({ skipCache: true });
          if (freshToken) {
            return await action(freshToken);
          }
          throw new Error('Your session has expired. Please refresh the page or sign in again.');
        }
        throw err;
      }
    },
    [getToken]
  );

  // Fetch workspaces for the current authenticated user
  const loadWorkspaces = useCallback(async () => {
    if (!isSignedIn) {
      setWorkspaces([]);
      setActiveWorkspace(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const list = await withAuth((token) => fetchUserWorkspaces(token));
      setWorkspaces(list);

      // Restore active workspace from localStorage, or select first available
      if (list.length > 0) {
        const storedId = typeof window !== 'undefined' ? localStorage.getItem(ACTIVE_WORKSPACE_KEY) : null;
        const matched = list.find((w) => w._id === storedId);
        setActiveWorkspace(matched || list[0]);
      } else {
        setActiveWorkspace(null);
      }
    } catch (err: any) {
      console.error('[WorkspaceContext] Failed to load workspaces:', err);
      setError(err.message || 'Failed to load workspaces');
    } finally {
      setIsLoading(false);
    }
  }, [isSignedIn, withAuth, setActiveWorkspace]);

  // Load on auth state readiness
  useEffect(() => {
    loadWorkspaces();
  }, [loadWorkspaces]);

  // Create Workspace action
  const createWorkspace = useCallback(
    async (data: CreateWorkspaceInput): Promise<Workspace> => {
      const created = await withAuth((token) => createWorkspaceApi(data, token));
      setWorkspaces((prev) => [created, ...prev]);
      setActiveWorkspace(created);
      return created;
    },
    [withAuth, setActiveWorkspace]
  );

  // Join Workspace action
  const joinWorkspace = useCallback(
    async (joinCode: string): Promise<Workspace> => {
      const joined = await withAuth((token) => joinWorkspaceApi({ joinCode }, token));
      setWorkspaces((prev) => {
        const filtered = prev.filter((w) => w._id !== joined._id);
        return [joined, ...filtered];
      });
      setActiveWorkspace(joined);
      return joined;
    },
    [withAuth, setActiveWorkspace]
  );

  // Update Workspace action
  const updateWorkspace = useCallback(
    async (id: string, data: UpdateWorkspaceInput): Promise<Workspace> => {
      const updated = await withAuth((token) => updateWorkspaceApi(id, data, token));
      setWorkspaces((prev) => prev.map((w) => (w._id === id ? updated : w)));
      if (activeWorkspace?._id === id) {
        setActiveWorkspace(updated);
      }
      return updated;
    },
    [withAuth, activeWorkspace, setActiveWorkspace]
  );

  // Leave Workspace action
  const leaveWorkspace = useCallback(
    async (workspaceId: string): Promise<void> => {
      if (!userId) throw new Error('User ID required');
      await withAuth((token) => removeMemberApi(workspaceId, userId, token));
      setWorkspaces((prev) => {
        const remaining = prev.filter((w) => w._id !== workspaceId);
        if (activeWorkspace?._id === workspaceId) {
          setActiveWorkspace(remaining[0] || null);
        }
        return remaining;
      });
    },
    [userId, withAuth, activeWorkspace, setActiveWorkspace]
  );

  // Delete Workspace action
  const deleteWorkspace = useCallback(
    async (workspaceId: string): Promise<void> => {
      await withAuth((token) => deleteWorkspaceApi(workspaceId, token));
      setWorkspaces((prev) => {
        const remaining = prev.filter((w) => w._id !== workspaceId);
        if (activeWorkspace?._id === workspaceId) {
          setActiveWorkspace(remaining[0] || null);
        }
        return remaining;
      });
    },
    [withAuth, activeWorkspace, setActiveWorkspace]
  );

  // Derived user roles & permissions in the active workspace
  const userRole = useMemo<WorkspaceRole | null>(() => {
    if (!activeWorkspace || !userId) return null;
    const member = activeWorkspace.members.find((m) => m.userId === userId);
    return member?.role || null;
  }, [activeWorkspace, userId]);

  const isOwner = useMemo<boolean>(() => {
    if (!activeWorkspace || !userId) return false;
    return activeWorkspace.ownerId === userId || userRole === 'owner';
  }, [activeWorkspace, userId, userRole]);

  const isAdmin = useMemo<boolean>(() => {
    return isOwner || userRole === 'admin';
  }, [isOwner, userRole]);

  const contextValue = useMemo<WorkspaceContextType>(
    () => ({
      workspaces,
      activeWorkspace,
      isLoading,
      error,
      userRole,
      isOwner,
      isAdmin,
      setActiveWorkspace,
      setActiveWorkspaceId,
      refreshWorkspaces: loadWorkspaces,
      createWorkspace,
      joinWorkspace,
      updateWorkspace,
      leaveWorkspace,
      deleteWorkspace,
    }),
    [
      workspaces,
      activeWorkspace,
      isLoading,
      error,
      userRole,
      isOwner,
      isAdmin,
      setActiveWorkspace,
      setActiveWorkspaceId,
      loadWorkspaces,
      createWorkspace,
      joinWorkspace,
      updateWorkspace,
      leaveWorkspace,
      deleteWorkspace,
    ]
  );

  return (
    <WorkspaceContext.Provider value={contextValue}>
      {children}
    </WorkspaceContext.Provider>
  );
}
