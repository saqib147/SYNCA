import { z } from 'zod';

export const projectGoalSchema = z.object({
  title: z.string().min(1, 'Goal title is required'),
  description: z.string().optional(),
  icon: z.string().optional(),
  completed: z.boolean().optional().default(false),
});

const validDateString = z
  .string()
  .refine((val) => !val || !Number.isNaN(Date.parse(val)), { message: 'Invalid date format' });

export const projectMilestoneSchema = z.object({
  title: z.string().min(1, 'Milestone title is required'),
  description: z.string().optional(),
  status: z.enum(['Completed', 'InProgress', 'Upcoming']).default('Upcoming'),
  progress: z.number().min(0).max(100).default(0),
  date: validDateString.optional(),
});

export const projectTeamMemberSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  role: z.enum(['Admin', 'Moderator', 'Member']).default('Member'),
});

export const createProjectSchema = z.object({
  name: z.string().min(2, 'Project name must be at least 2 characters').max(100),
  slug: z.string().optional(),
  description: z.string().max(2000).optional(),
  status: z.enum(['OnTrack', 'ActiveSprint', 'AtRisk', 'Completed', 'Archived']).default('ActiveSprint'),
  privacy: z.enum(['Private', 'Public']).default('Public'),
  teamMembers: z.array(z.string()).optional().default([]),
  members: z.array(projectTeamMemberSchema).optional().default([]),
  goals: z.array(projectGoalSchema).optional().default([]),
  milestones: z.array(projectMilestoneSchema).optional().default([]),
  columns: z.array(z.string().trim().min(1).max(80)).optional().default([]),
});

export const joinProjectSchema = z.object({
  joinCode: z.string().length(6, 'Join code must be 6 characters'),
});

export const updateMemberRoleSchema = z.object({
  role: z.enum(['Admin', 'Moderator', 'Member']),
});

export const addProjectMemberSchema = z
  .object({
    email: z.string().email('Valid email address is required').optional(),
    userId: z.string().min(1).optional(),
    role: z.enum(['Admin', 'Moderator', 'Member']).optional().default('Member'),
  })
  .refine((data) => Boolean(data.email || data.userId), {
    message: 'Either email or userId is required',
  });

// Explicitly omit members and teamMembers so PATCH /projects/:id cannot escalate privileges
export const updateProjectSchema = createProjectSchema
  .omit({ members: true, teamMembers: true })
  .partial()
  .extend({
    renameColumn: z
      .object({
        from: z.string().min(1),
        to: z.string().trim().min(1).max(80),
      })
      .optional(),
  });

export type CreateProjectInput = z.input<typeof createProjectSchema>;
export type UpdateProjectInput = z.input<typeof updateProjectSchema>;
export type JoinProjectInput = z.infer<typeof joinProjectSchema>;
export type UpdateMemberRoleInput = z.infer<typeof updateMemberRoleSchema>;
export type AddProjectMemberInput = z.input<typeof addProjectMemberSchema>;

