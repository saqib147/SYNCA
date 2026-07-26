import { z } from 'zod';

export const createProjectSchema = z.object({
  roomId: z.string().min(1, 'Room ID is required'),
  name: z.string().min(2, 'Project name must be at least 2 characters').max(100),
  description: z.string().max(2000).optional(),
  status: z.enum(['OnTrack', 'ActiveSprint', 'AtRisk', 'Completed', 'Archived']).default('ActiveSprint'),
  privacy: z.enum(['Private', 'RoomWide', 'Public']).default('RoomWide'),
  teamMembers: z.array(z.string()).optional().default([]),
});

export const updateProjectSchema = createProjectSchema.omit({ roomId: true }).partial();

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
