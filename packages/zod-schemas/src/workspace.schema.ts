import { z } from 'zod';

export const createWorkspaceSchema = z.object({
  name: z.string().trim().min(2, 'Workspace name must be at least 2 characters').max(50, 'Workspace name cannot exceed 50 characters'),
  slug: z.string().trim().toLowerCase().min(2).max(50).regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens').optional(),
  description: z.string().trim().max(250, 'Description cannot exceed 250 characters').optional(),
  isPrivate: z.boolean().optional().default(false),
});

export const joinWorkspaceSchema = z.object({
  joinCode: z.string().trim().toUpperCase().min(6, 'Join code must be at least 6 characters').max(10, 'Invalid join code format'),
});

export const updateWorkspaceSchema = z.object({
  name: z.string().trim().min(2).max(50).optional(),
  description: z.string().trim().max(250).optional(),
  isPrivate: z.boolean().optional(),
});

export type CreateWorkspaceInput = z.infer<typeof createWorkspaceSchema>;
export type JoinWorkspaceInput = z.infer<typeof joinWorkspaceSchema>;
export type UpdateWorkspaceInput = z.infer<typeof updateWorkspaceSchema>;
