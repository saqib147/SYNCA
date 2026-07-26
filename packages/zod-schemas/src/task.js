"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateTaskSchema = exports.createTaskSchema = exports.subtaskSchema = void 0;
const zod_1 = require("zod");
exports.subtaskSchema = zod_1.z.object({
    title: zod_1.z.string().min(1, 'Subtask title is required'),
    completed: zod_1.z.boolean().default(false),
});
exports.createTaskSchema = zod_1.z.object({
    projectId: zod_1.z.string().optional().nullable(),
    title: zod_1.z.string().min(1, 'Task title is required').max(280),
    description: zod_1.z.string().max(2000).optional(),
    status: zod_1.z.string().min(1).default('To Do'),
    priority: zod_1.z.enum(['High', 'Medium', 'Low']).default('Medium'),
    assignees: zod_1.z.array(zod_1.z.string()).optional().default([]),
    dueDate: zod_1.z.string().datetime().optional().nullable(),
    subtasks: zod_1.z.array(exports.subtaskSchema).optional().default([]),
    isPrivate: zod_1.z.boolean().default(false),
});
exports.updateTaskSchema = exports.createTaskSchema.partial();
