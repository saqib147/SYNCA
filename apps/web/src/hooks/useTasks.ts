'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@clerk/nextjs';
import { Task } from '@synca/types';
import { CreateTaskInput, UpdateTaskInput, MoveTaskInput } from '@synca/zod-schemas';
import {
  fetchProjectTasks,
  createTaskApi,
  updateTaskApi,
  moveTaskApi,
  deleteTaskApi,
  TaskFilters,
} from '@/lib/api/task.api';

export const notifyTasksChanged = () => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('synca:tasks-changed'));
  }
};

export function useTasks(projectId?: string) {
  const { getToken, isSignedIn } = useAuth();

  const [tasks, setTasks] = useState<Task[]>([]);
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

  // Load tasks
  const loadTasks = useCallback(
    async (filters?: TaskFilters) => {
      if (!isSignedIn || !projectId) {
        setTasks([]);
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);
        const list = await withAuth((token) =>
          fetchProjectTasks(projectId, token, filters)
        );
        setTasks(list);
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
    loadTasks();

    const handleTasksChanged = () => {
      loadTasks();
    };

    window.addEventListener('synca:tasks-changed', handleTasksChanged);
    return () => {
      window.removeEventListener('synca:tasks-changed', handleTasksChanged);
    };
  }, [loadTasks]);

  // Create Task
  const createTask = useCallback(
    async (data: CreateTaskInput): Promise<Task> => {
      const payload = {
        ...data,
        projectId: data.projectId || projectId,
      };

      const created = await withAuth((token) => createTaskApi(payload, token));
      setTasks((prev) => [...prev, created]);
      notifyTasksChanged();
      return created;
    },
    [projectId, withAuth]
  );

  // Update Task
  const updateTask = useCallback(
    async (id: string, data: UpdateTaskInput): Promise<Task> => {
      const updated = await withAuth((token) => updateTaskApi(id, data, token));
      setTasks((prev) => prev.map((t) => (t._id === id ? updated : t)));
      notifyTasksChanged();
      return updated;
    },
    [withAuth]
  );

  // Move Task (with optimistic UI update for Kanban drag-and-drop)
  const moveTask = useCallback(
    async (id: string, newStatus: string, newOrder: number): Promise<void> => {
      // Optimistic update
      setTasks((prev) =>
        prev.map((t) =>
          t._id === id ? { ...t, status: newStatus, order: newOrder } : t
        )
      );

      try {
        await withAuth((token) =>
          moveTaskApi(id, { newStatus, newOrder }, token)
        );
        notifyTasksChanged();
      } catch (err) {
        console.error('[useTasks] Failed to sync moved task:', err);
        // Revert on error
        loadTasks();
      }
    },
    [withAuth, loadTasks]
  );

  // Toggle Subtask Completion
  const toggleSubtask = useCallback(
    async (taskId: string, subtaskIndex: number): Promise<void> => {
      const target = tasks.find((t) => t._id === taskId);
      if (!target || !target.subtasks || !target.subtasks[subtaskIndex]) return;

      const updatedSubtasks = target.subtasks.map((st, idx) =>
        idx === subtaskIndex ? { ...st, completed: !st.completed } : st
      );

      // Optimistic
      setTasks((prev) =>
        prev.map((t) => (t._id === taskId ? { ...t, subtasks: updatedSubtasks } : t))
      );

      try {
        await withAuth((token) =>
          updateTaskApi(taskId, { subtasks: updatedSubtasks }, token)
        );
        notifyTasksChanged();
      } catch (err) {
        console.error('[useTasks] Failed to toggle subtask:', err);
        loadTasks();
      }
    },
    [tasks, withAuth, loadTasks]
  );

  // Delete Task
  const deleteTask = useCallback(
    async (id: string): Promise<void> => {
      await withAuth((token) => deleteTaskApi(id, token));
      setTasks((prev) => prev.filter((t) => t._id !== id));
      notifyTasksChanged();
    },
    [withAuth]
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
