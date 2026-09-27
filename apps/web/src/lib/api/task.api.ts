import { Task } from '@synca/types';
import { CreateTaskInput, UpdateTaskInput, MoveTaskInput } from '@synca/zod-schemas';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

class ApiError extends Error {
  code: string;
  status: number;
  details?: any[];

  constructor(message: string, code: string, status: number, details?: any[]) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

function getHeaders(token?: string | null): HeadersInit {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

async function handleResponse<T>(res: Response): Promise<T> {
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const error = body.error || {};
    throw new ApiError(
      error.message || `Request failed with status ${res.status}`,
      error.code || 'UNKNOWN_ERROR',
      res.status,
      error.details
    );
  }
  return body.data as T;
}

export interface TaskFilters {
  status?: string;
  priority?: string;
}

/**
 * Fetch all tasks for a project.
 */
export async function fetchProjectTasks(
  projectId: string,
  token: string,
  filters?: TaskFilters
): Promise<Task[]> {
  const params = new URLSearchParams({ projectId });
  if (filters?.status && filters.status !== 'All') {
    params.append('status', filters.status);
  }
  if (filters?.priority && filters.priority !== 'All') {
    params.append('priority', filters.priority);
  }

  const res = await fetch(`${API_BASE_URL}/api/v1/tasks?${params.toString()}`, {
    method: 'GET',
    headers: getHeaders(token),
  });
  return handleResponse<Task[]>(res);
}

/**
 * Fetch current user's personal and assigned tasks across all joined projects.
 */
export async function fetchMyTasks(
  token: string,
  filter?: 'upcoming' | 'overdue' | 'completed' | 'all'
): Promise<Task[]> {
  const params = new URLSearchParams();
  if (filter && filter !== 'all') {
    params.append('filter', filter);
  }

  const queryString = params.toString() ? `?${params.toString()}` : '';
  const res = await fetch(`${API_BASE_URL}/api/v1/tasks/my${queryString}`, {
    method: 'GET',
    headers: getHeaders(token),
  });
  return handleResponse<Task[]>(res);
}

/**
 * Create a new task.
 */
export async function createTaskApi(
  data: CreateTaskInput,
  token: string
): Promise<Task> {
  const res = await fetch(`${API_BASE_URL}/api/v1/tasks`, {
    method: 'POST',
    headers: getHeaders(token),
    body: JSON.stringify(data),
  });
  return handleResponse<Task>(res);
}

/**
 * Update task metadata, status, priority, subtasks, or assignees.
 */
export async function updateTaskApi(
  id: string,
  data: UpdateTaskInput,
  token: string
): Promise<Task> {
  const res = await fetch(`${API_BASE_URL}/api/v1/tasks/${id}`, {
    method: 'PATCH',
    headers: getHeaders(token),
    body: JSON.stringify(data),
  });
  return handleResponse<Task>(res);
}

/**
 * Move task to a new Kanban column or update order index.
 */
export async function moveTaskApi(
  id: string,
  data: MoveTaskInput,
  token: string
): Promise<Task> {
  const res = await fetch(`${API_BASE_URL}/api/v1/tasks/${id}/move`, {
    method: 'PATCH',
    headers: getHeaders(token),
    body: JSON.stringify(data),
  });
  return handleResponse<Task>(res);
}

/**
 * Soft delete a task.
 */
export async function deleteTaskApi(
  id: string,
  token: string
): Promise<{ id: string; message: string }> {
  const res = await fetch(`${API_BASE_URL}/api/v1/tasks/${id}`, {
    method: 'DELETE',
    headers: getHeaders(token),
  });
  return handleResponse<{ id: string; message: string }>(res);
}

/**
 * Add a comment to a task.
 */
export async function addTaskCommentApi(
  id: string,
  text: string,
  token: string
): Promise<Task> {
  const res = await fetch(`${API_BASE_URL}/api/v1/tasks/${id}/comments`, {
    method: 'POST',
    headers: getHeaders(token),
    body: JSON.stringify({ text }),
  });
  return handleResponse<Task>(res);
}
