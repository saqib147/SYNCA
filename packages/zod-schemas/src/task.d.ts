import { z } from 'zod';
export declare const subtaskSchema: z.ZodObject<{
    title: z.ZodString;
    completed: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    title: string;
    completed: boolean;
}, {
    title: string;
    completed?: boolean | undefined;
}>;
export declare const createTaskSchema: z.ZodObject<{
    projectId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    title: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    status: z.ZodDefault<z.ZodString>;
    priority: z.ZodDefault<z.ZodEnum<["High", "Medium", "Low"]>>;
    assignees: z.ZodDefault<z.ZodOptional<z.ZodArray<z.ZodString, "many">>>;
    dueDate: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    subtasks: z.ZodDefault<z.ZodOptional<z.ZodArray<z.ZodObject<{
        title: z.ZodString;
        completed: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        title: string;
        completed: boolean;
    }, {
        title: string;
        completed?: boolean | undefined;
    }>, "many">>>;
    isPrivate: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    status: string;
    title: string;
    priority: "High" | "Medium" | "Low";
    assignees: string[];
    subtasks: {
        title: string;
        completed: boolean;
    }[];
    isPrivate: boolean;
    description?: string | undefined;
    projectId?: string | null | undefined;
    dueDate?: string | null | undefined;
}, {
    title: string;
    description?: string | undefined;
    status?: string | undefined;
    projectId?: string | null | undefined;
    priority?: "High" | "Medium" | "Low" | undefined;
    assignees?: string[] | undefined;
    dueDate?: string | null | undefined;
    subtasks?: {
        title: string;
        completed?: boolean | undefined;
    }[] | undefined;
    isPrivate?: boolean | undefined;
}>;
export declare const updateTaskSchema: z.ZodObject<{
    projectId: z.ZodOptional<z.ZodNullable<z.ZodOptional<z.ZodString>>>;
    title: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    status: z.ZodOptional<z.ZodDefault<z.ZodString>>;
    priority: z.ZodOptional<z.ZodDefault<z.ZodEnum<["High", "Medium", "Low"]>>>;
    assignees: z.ZodOptional<z.ZodDefault<z.ZodOptional<z.ZodArray<z.ZodString, "many">>>>;
    dueDate: z.ZodOptional<z.ZodNullable<z.ZodOptional<z.ZodString>>>;
    subtasks: z.ZodOptional<z.ZodDefault<z.ZodOptional<z.ZodArray<z.ZodObject<{
        title: z.ZodString;
        completed: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        title: string;
        completed: boolean;
    }, {
        title: string;
        completed?: boolean | undefined;
    }>, "many">>>>;
    isPrivate: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
}, "strip", z.ZodTypeAny, {
    description?: string | undefined;
    status?: string | undefined;
    title?: string | undefined;
    projectId?: string | null | undefined;
    priority?: "High" | "Medium" | "Low" | undefined;
    assignees?: string[] | undefined;
    dueDate?: string | null | undefined;
    subtasks?: {
        title: string;
        completed: boolean;
    }[] | undefined;
    isPrivate?: boolean | undefined;
}, {
    description?: string | undefined;
    status?: string | undefined;
    title?: string | undefined;
    projectId?: string | null | undefined;
    priority?: "High" | "Medium" | "Low" | undefined;
    assignees?: string[] | undefined;
    dueDate?: string | null | undefined;
    subtasks?: {
        title: string;
        completed?: boolean | undefined;
    }[] | undefined;
    isPrivate?: boolean | undefined;
}>;
export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
