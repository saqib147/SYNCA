import { z } from 'zod';

export const projectGoalSchema = z.object({
  title: z.string().min(1, 'Goal title is required'),
  description: z.string().optional(),
  icon: z.string().optional(),
  completed: z.boolean().optional().default(false),
});

export const projectMilestoneSchema = z.object({
  title: z.string().min(1, 'Milestone title is required'),
  description: z.string().optional(),
  status: z.enum(['Completed', 'InProgress', 'Upcoming']).default('Upcoming'),
  progress: z.number().min(0).max(100).default(0),
  date: z.string().optional(),
});

export const projectTeamMemberSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  role: z.enum(['Admin', 'Member', 'Viewer']).default('Member'),
});

export const createProjectSchema = z.object({
  workspaceId: z.string().min(1, 'Workspace ID is required').optional(),
  roomId: z.string().optional(),
  name: z.string().min(2, 'Project name must be at least 2 characters').max(100),
  slug: z.string().optional(),
  description: z.string().max(2000).optional(),
  status: z.enum(['OnTrack', 'ActiveSprint', 'AtRisk', 'Completed', 'Archived']).default('ActiveSprint'),
  privacy: z.enum(['Private', 'RoomWide', 'Public']).default('RoomWide'),
  teamMembers: z.array(z.string()).optional().default([]),
  members: z.array(projectTeamMemberSchema).optional().default([]),
  goals: z.array(projectGoalSchema).optional().default([]),
  milestones: z.array(projectMilestoneSchema).optional().default([]),
});

export const updateProjectSchema = createProjectSchema.partial();

export type CreateProjectInput = z.input<typeof createProjectSchema>;
export type UpdateProjectInput = z.input<typeof updateProjectSchema>;

