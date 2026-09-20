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
  teamMemberProfiles?: Array<{
    userId: string;
    name?: string;
    email?: string;
    imageUrl?: string;
    projectRole?: 'Admin' | 'Member' | 'Viewer';
  }>;
}

/**
 * List all projects for a workspace with optional status & search query.
 */
export async function fetchWorkspaceProjects(
  workspaceId: string,
  token: string,
  filters?: ProjectFilters
): Promise<Project[]> {
  const params = new URLSearchParams({ workspaceId });
  if (filters?.status && filters.status !== 'All') {
    params.append('status', filters.status);
  }
  if (filters?.search && filters.search.trim()) {
    params.append('search', filters.search.trim());
  }

  const res = await fetch(`${API_BASE_URL}/api/v1/projects?${params.toString()}`, {
    method: 'GET',
    headers: getHeaders(token),
  });
  return handleResponse<Project[]>(res);
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
 * Create a new project in the active workspace.
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
