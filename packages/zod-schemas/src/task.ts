import { z } from 'zod';

export const subtaskSchema = z.object({
  id: z.string().optional(),
  _id: z.string().optional(),
  title: z.string().min(1, 'Subtask title is required'),
  completed: z.boolean().default(false),
});

export const createTaskSchema = z.object({
  workspaceId: z.string().min(1, 'Workspace ID is required').optional(),
  projectId: z.string().optional().nullable(),
  title: z.string().min(1, 'Task title is required').max(280),
  description: z.string().max(2000).optional(),
  status: z.string().min(1).default('To Do'),
  order: z.number().optional().default(0),
  priority: z.enum(['High', 'Medium', 'Low']).default('Medium'),
  assignees: z.array(z.string()).optional().default([]),
  dueDate: z.string().optional().nullable(),
  subtasks: z.array(subtaskSchema).optional().default([]),
  isPrivate: z.boolean().default(false),
});

export const updateTaskSchema = createTaskSchema.partial();

export const moveTaskSchema = z.object({
  newStatus: z.string().min(1, 'New status is required'),
  newOrder: z.number().min(0).default(0),
});

export type CreateTaskInput = z.input<typeof createTaskSchema>;
export type UpdateTaskInput = z.input<typeof updateTaskSchema>;
export type MoveTaskInput = z.input<typeof moveTaskSchema>;

