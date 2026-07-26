import { z } from 'zod';

export const subtaskSchema = z.object({
  title: z.string().min(1, 'Subtask title is required'),
  completed: z.boolean().default(false),
});

export const createTaskSchema = z.object({
  projectId: z.string().optional().nullable(),
  title: z.string().min(1, 'Task title is required').max(280),
  description: z.string().max(2000).optional(),
  status: z.string().min(1).default('To Do'),
  priority: z.enum(['High', 'Medium', 'Low']).default('Medium'),
  assignees: z.array(z.string()).optional().default([]),
  dueDate: z.string().datetime().optional().nullable(),
  subtasks: z.array(subtaskSchema).optional().default([]),
  isPrivate: z.boolean().default(false),
});

export const updateTaskSchema = createTaskSchema.partial();

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
