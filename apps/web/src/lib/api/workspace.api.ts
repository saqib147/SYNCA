import { Workspace } from '@synca/types';
import {
  CreateWorkspaceInput,
  JoinWorkspaceInput,
  UpdateWorkspaceInput,
} from '@synca/zod-schemas';

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

/**
 * Fetch all workspaces the authenticated user belongs to.
 */
export async function fetchUserWorkspaces(token: string): Promise<Workspace[]> {
  const res = await fetch(`${API_BASE_URL}/api/v1/workspaces`, {
    method: 'GET',
    headers: getHeaders(token),
  });
  return handleResponse<Workspace[]>(res);
}

/**
 * Fetch a single workspace by ID or slug.
 */
export async function fetchWorkspaceById(
  id: string,
  token: string
): Promise<Workspace> {
  const res = await fetch(`${API_BASE_URL}/api/v1/workspaces/${id}`, {
    method: 'GET',
    headers: getHeaders(token),
  });
  return handleResponse<Workspace>(res);
}

/**
 * Create a new workspace.
 */
export async function createWorkspaceApi(
  data: CreateWorkspaceInput,
  token: string
): Promise<Workspace> {
  const res = await fetch(`${API_BASE_URL}/api/v1/workspaces`, {
    method: 'POST',
    headers: getHeaders(token),
    body: JSON.stringify(data),
  });
  return handleResponse<Workspace>(res);
}

/**
 * Join an existing workspace via 6-character join code.
 */
export async function joinWorkspaceApi(
  data: JoinWorkspaceInput,
  token: string
): Promise<Workspace> {
  const res = await fetch(`${API_BASE_URL}/api/v1/workspaces/join`, {
    method: 'POST',
    headers: getHeaders(token),
    body: JSON.stringify(data),
  });
  return handleResponse<Workspace>(res);
}

/**
 * Update workspace metadata (name, description, isPrivate).
 */
export async function updateWorkspaceApi(
  id: string,
  data: UpdateWorkspaceInput,
  token: string
): Promise<Workspace> {
  const res = await fetch(`${API_BASE_URL}/api/v1/workspaces/${id}`, {
    method: 'PATCH',
    headers: getHeaders(token),
    body: JSON.stringify(data),
  });
  return handleResponse<Workspace>(res);
}

/**
 * Remove a member from the workspace or leave.
 */
export async function removeMemberApi(
  workspaceId: string,
  userId: string,
  token: string
): Promise<{ message: string; workspace: Workspace }> {
  const res = await fetch(
    `${API_BASE_URL}/api/v1/workspaces/${workspaceId}/members/${userId}`,
    {
      method: 'DELETE',
      headers: getHeaders(token),
    }
  );
  return handleResponse<{ message: string; workspace: Workspace }>(res);
}

/**
 * Delete a workspace (Owner only).
 */
export async function deleteWorkspaceApi(
  id: string,
  token: string
): Promise<{ id: string; message: string }> {
  const res = await fetch(`${API_BASE_URL}/api/v1/workspaces/${id}`, {
    method: 'DELETE',
    headers: getHeaders(token),
  });
  return handleResponse<{ id: string; message: string }>(res);
}
