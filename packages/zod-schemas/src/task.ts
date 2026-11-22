import { z } from 'zod';

export const subtaskSchema = z.object({
  id: z.string().optional(),
  _id: z.string().optional(),
  title: z.string().min(1, 'Subtask title is required'),
  completed: z.boolean().default(false),
});

export const createTaskSchema = z.object({
  projectId: z.string().optional().nullable(),
  title: z.string().min(1, 'Task title is required').max(280),
  description: z.string().max(2000).optional(),
  status: z.string().min(1).default('To Do'),
  column: z.string().trim().max(80).optional(),
  order: z.number().optional().default(0),
  priority: z.enum(['High', 'Medium', 'Low']).default('Medium'),
  assignees: z.array(z.string()).optional().default([]),
  dueDate: z
    .string()
    .refine((val) => !val || !Number.isNaN(Date.parse(val)), { message: 'Invalid due date' })
    .optional()
    .nullable(),
  subtasks: z.array(subtaskSchema).optional().default([]),
  isPrivate: z.boolean().default(false),
});

export const updateTaskSchema = createTaskSchema.partial();

export const moveTaskSchema = z
  .object({
    newColumn: z.string().trim().min(1).max(80).optional(),
    newStatus: z.string().min(1).optional(),
    newOrder: z.number().min(0).default(0),
  })
  .refine((data) => Boolean(data.newColumn || data.newStatus), {
    message: 'Either newColumn or newStatus is required',
  });

export const addCommentSchema = z.object({
  text: z.string().min(1, 'Comment text cannot be empty').max(2000),
});

export type CreateTaskInput = z.input<typeof createTaskSchema>;
export type UpdateTaskInput = z.input<typeof updateTaskSchema>;
export type MoveTaskInput = z.input<typeof moveTaskSchema>;
export type AddCommentInput = z.input<typeof addCommentSchema>;

