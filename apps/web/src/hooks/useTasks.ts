'use client';

import type React from 'react';
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@clerk/nextjs';
import { Task } from '@synca/types';
import { CreateTaskInput, UpdateTaskInput, MoveTaskInput } from '@synca/zod-schemas';
import { useSocket } from '@/context/SocketContext';
import {
  fetchProjectTasks,
  createTaskApi,
  updateTaskApi,
  moveTaskApi,
  deleteTaskApi,
  TaskFilters,
} from '@/lib/api/task.api';

// Per-project in-memory task cache & in-flight deduplication
const tasksCache = new Map<string, { tasks: Task[]; at: number }>();
const inFlightTasks = new Map<string, Promise<Task[]>>();
const TASKS_TTL = 30 * 1000;

export const notifyTasksChanged = (projectId?: string) => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('synca:tasks-changed', { detail: { projectId } }));
  }
};

export function useTasks(projectId?: string) {
  const { getToken, isSignedIn } = useAuth();
  const { socket } = useSocket();

  const [tasks, setTasksState] = useState<Task[]>(() =>
    projectId && tasksCache.has(projectId) ? tasksCache.get(projectId)!.tasks : []
  );
  const [isLoading, setIsLoading] = useState<boolean>(
    () => !(projectId && tasksCache.has(projectId))
  );
  const [error, setError] = useState<string | null>(null);

  // Helper to update both React state and per-project cache atomically
  const setTasks = useCallback(
    (updater: React.SetStateAction<Task[]>) => {
      setTasksState((prev) => {
        const next = typeof updater === 'function' ? updater(prev) : updater;
        if (projectId) {
          tasksCache.set(projectId, { tasks: next, at: Date.now() });
        }
        return next;
      });
    },
    [projectId]
  );

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

  // Load tasks with per-project cache & in-flight deduplication
  const loadTasks = useCallback(
    async (filters?: TaskFilters, force = false) => {
      if (!isSignedIn || !projectId) {
        setTasksState([]);
        setIsLoading(false);
        return;
      }

      const hasFilters = Boolean(filters && Object.values(filters).some(Boolean));
      const cached = tasksCache.get(projectId);

      if (!hasFilters && !force && cached && Date.now() - cached.at < TASKS_TTL) {
        setTasksState(cached.tasks);
        setIsLoading(false);
        return;
      }

      try {
        if (!cached || hasFilters) {
          setIsLoading(true);
        }
        setError(null);

        let list: Task[];
        if (!hasFilters) {
          let promise = !force ? inFlightTasks.get(projectId) : undefined;
          if (!promise) {
            promise = withAuth((token) => fetchProjectTasks(projectId, token)).finally(() => {
              inFlightTasks.delete(projectId);
            });
            inFlightTasks.set(projectId, promise);
          }
          list = await promise;
          tasksCache.set(projectId, { tasks: list, at: Date.now() });
        } else {
          list = await withAuth((token) => fetchProjectTasks(projectId, token, filters));
        }

        setTasksState(list);
      } catch (err: any) {
        console.error('[useTasks] Failed to load tasks:', err);
        setError(err.message || 'Failed to load tasks');
      } finally {
        setIsLoading(false);
      }
    },
    [isSignedIn, projectId, withAuth]
  );

  useEffect(() => {
    if (projectId && tasksCache.has(projectId)) {
      setTasksState(tasksCache.get(projectId)!.tasks);
      setIsLoading(false);
    }
    loadTasks(undefined, false);

    const handleTasksChanged = (e: Event) => {
      const detail = (e as CustomEvent<{ projectId?: string }>).detail;
      // If cache was already updated optimistically for this project, just sync state without a refetch storm
      if (projectId && detail?.projectId === projectId && tasksCache.has(projectId)) {
        setTasksState([...tasksCache.get(projectId)!.tasks]);
        return;
      }
      loadTasks(undefined, true);
    };

    window.addEventListener('synca:tasks-changed', handleTasksChanged);
    return () => {
      window.removeEventListener('synca:tasks-changed', handleTasksChanged);
    };
  }, [loadTasks, projectId]);

  // Live Socket.io sync for Kanban moves, task edits, and comments from teammates
  useEffect(() => {
    if (!socket || !projectId) return;

    const handleTaskUpdated = ({ task, projectId: updatedProjectId }: { task: Task; projectId: string }) => {
      if (String(updatedProjectId) !== String(projectId)) return;
      setTasks((prev) => {
        const exists = prev.some((t) => t._id === task._id);
        return exists ? prev.map((t) => (t._id === task._id ? task : t)) : [...prev, task];
      });
    };

    socket.on('task:updated', handleTaskUpdated);
    return () => {
      socket.off('task:updated', handleTaskUpdated);
    };
  }, [socket, projectId, setTasks]);

  // Create Task
  const createTask = useCallback(
    async (data: CreateTaskInput): Promise<Task> => {
      const payload = {
        ...data,
        projectId: data.projectId || projectId,
      };

      const created = await withAuth((token) => createTaskApi(payload, token));
      setTasks((prev) => (prev.some((t) => t._id === created._id) ? prev : [...prev, created]));
      notifyTasksChanged(projectId);
      return created;
    },
    [projectId, withAuth, setTasks]
  );

  // Update Task (optimistic with rollback)
  const updateTask = useCallback(
    async (id: string, data: UpdateTaskInput): Promise<Task> => {
      const previous = projectId && tasksCache.has(projectId) ? [...tasksCache.get(projectId)!.tasks] : tasks;
      setTasks((prev) =>
        prev.map((t) => (t._id === id ? ({ ...t, ...data } as Task) : t))
      );

      try {
        const updated = await withAuth((token) => updateTaskApi(id, data, token));
        setTasks((prev) => prev.map((t) => (t._id === id ? updated : t)));
        notifyTasksChanged(projectId);
        return updated;
      } catch (err) {
        setTasks(previous);
        throw err;
      }
    },
    [projectId, tasks, withAuth, setTasks]
  );

  // Move Task between board columns (optimistic, decoupled from status — never alters task.status)
  const moveTask = useCallback(
    async (id: string, newColumn: string, newOrder: number): Promise<void> => {
      const previous = projectId && tasksCache.has(projectId) ? [...tasksCache.get(projectId)!.tasks] : tasks;
      setTasks((prev) =>
        prev.map((t) =>
          t._id === id ? { ...t, column: newColumn, order: newOrder } : t
        )
      );

      try {
        await withAuth((token) =>
          moveTaskApi(id, { newColumn, newOrder }, token)
        );
      } catch (err) {
        console.error('[useTasks] Failed to sync moved task:', err);
        setTasks(previous);
      }
    },
    [projectId, tasks, withAuth, setTasks]
  );

  // Toggle Subtask Completion (optimistic with rollback)
  const toggleSubtask = useCallback(
    async (taskId: string, subtaskIndex: number): Promise<void> => {
      const target = tasks.find((t) => t._id === taskId);
      if (!target || !target.subtasks || !target.subtasks[subtaskIndex]) return;

      const previous = [...tasks];
      const updatedSubtasks = target.subtasks.map((st, idx) =>
        idx === subtaskIndex ? { ...st, completed: !st.completed } : st
      );

      setTasks((prev) =>
        prev.map((t) => (t._id === taskId ? { ...t, subtasks: updatedSubtasks } : t))
      );

      try {
        await withAuth((token) =>
          updateTaskApi(taskId, { subtasks: updatedSubtasks }, token)
        );
      } catch (err) {
        console.error('[useTasks] Failed to toggle subtask:', err);
        setTasks(previous);
      }
    },
    [tasks, withAuth, setTasks]
  );

  // Delete Task (optimistic with rollback)
  const deleteTask = useCallback(
    async (id: string): Promise<void> => {
      const previous = projectId && tasksCache.has(projectId) ? [...tasksCache.get(projectId)!.tasks] : tasks;
      setTasks((prev) => prev.filter((t) => t._id !== id));

      try {
        await withAuth((token) => deleteTaskApi(id, token));
        notifyTasksChanged(projectId);
      } catch (err) {
        setTasks(previous);
        throw err;
      }
    },
    [projectId, tasks, withAuth, setTasks]
  );

  return {
    tasks,
    setTasks,
    isLoading,
    error,
    refreshTasks: loadTasks,
    createTask,
    updateTask,
    moveTask,
    toggleSubtask,
    deleteTask,
  };
}
