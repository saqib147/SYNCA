import { Project } from '@synca/types';
import { CreateProjectInput, UpdateProjectInput } from '@synca/zod-schemas';

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

export interface ProjectFilters {
  status?: string;
  search?: string;
}

export interface EnrichedProject extends Project {
  currentUserRole?: 'Admin' | 'Moderator' | 'Member';
  teamMemberProfiles?: Array<{
    userId: string;
    name?: string;
    email?: string;
    imageUrl?: string;
    projectRole?: 'Admin' | 'Moderator' | 'Member';
  }>;
}

/**
 * List all projects the user belongs to.
 */
export async function fetchUserProjects(
  token: string,
  filters?: ProjectFilters
): Promise<Project[]> {
  const params = new URLSearchParams();
  if (filters?.status && filters.status !== 'All') {
    params.append('status', filters.status);
  }
  if (filters?.search && filters.search.trim()) {
    params.append('search', filters.search.trim());
  }

  const queryString = params.toString() ? `?${params.toString()}` : '';
  const res = await fetch(`${API_BASE_URL}/api/v1/projects${queryString}`, {
    method: 'GET',
    headers: getHeaders(token),
  });
  return handleResponse<Project[]>(res);
}

/**
 * Join an existing project using a 6-character join code.
 */
export async function joinProjectApi(
  joinCode: string,
  token: string
): Promise<Project> {
  const res = await fetch(`${API_BASE_URL}/api/v1/projects/join`, {
    method: 'POST',
    headers: getHeaders(token),
    body: JSON.stringify({ joinCode }),
  });
  return handleResponse<Project>(res);
}

/**
 * Retrieve a project by its ObjectId or slug.
 */
export async function fetchProjectById(
  id: string,
  token: string
): Promise<EnrichedProject> {
  const res = await fetch(`${API_BASE_URL}/api/v1/projects/${id}`, {
    method: 'GET',
    headers: getHeaders(token),
  });
  return handleResponse<EnrichedProject>(res);
}

/**
 * Create a new top-level project.
 */
export async function createProjectApi(
  data: CreateProjectInput,
  token: string
): Promise<Project> {
  const res = await fetch(`${API_BASE_URL}/api/v1/projects`, {
    method: 'POST',
    headers: getHeaders(token),
    body: JSON.stringify(data),
  });
  return handleResponse<Project>(res);
}

/**
 * Update project metadata, status, brief, goals, or milestones.
 */
export async function updateProjectApi(
  id: string,
  data: UpdateProjectInput,
  token: string
): Promise<Project> {
  const res = await fetch(`${API_BASE_URL}/api/v1/projects/${id}`, {
    method: 'PATCH',
    headers: getHeaders(token),
    body: JSON.stringify(data),
  });
  return handleResponse<Project>(res);
}

/**
 * Update member role in project (Admin only).
 */
export async function updateMemberRoleApi(
  projectId: string,
  targetUserId: string,
  role: 'Admin' | 'Moderator' | 'Member',
  token: string
): Promise<{ userId: string; role: string }> {
  const res = await fetch(
    `${API_BASE_URL}/api/v1/projects/${projectId}/members/${targetUserId}/role`,
    {
      method: 'PATCH',
      headers: getHeaders(token),
      body: JSON.stringify({ role }),
    }
  );
  return handleResponse<{ userId: string; role: string }>(res);
}

/**
 * Remove member from project or leave project.
 */
export async function removeMemberApi(
  projectId: string,
  targetUserId: string,
  token: string
): Promise<{ message: string }> {
  const res = await fetch(
    `${API_BASE_URL}/api/v1/projects/${projectId}/members/${targetUserId}`,
    {
      method: 'DELETE',
      headers: getHeaders(token),
    }
  );
  return handleResponse<{ message: string }>(res);
}

/**
 * Reset join code for a project (Admin only).
 */
export async function regenerateJoinCodeApi(
  projectId: string,
  token: string
): Promise<{ joinCode: string }> {
  const res = await fetch(
    `${API_BASE_URL}/api/v1/projects/${projectId}/join-code/reset`,
    {
      method: 'POST',
      headers: getHeaders(token),
    }
  );
  return handleResponse<{ joinCode: string }>(res);
}

/**
 * Soft delete / archive a project.
 */
export async function deleteProjectApi(
  id: string,
  token: string
): Promise<{ id: string; message: string }> {
  const res = await fetch(`${API_BASE_URL}/api/v1/projects/${id}`, {
    method: 'DELETE',
    headers: getHeaders(token),
  });
  return handleResponse<{ id: string; message: string }>(res);
}
