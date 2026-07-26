import { z } from 'zod';
export declare const createProjectSchema: z.ZodObject<{
    roomId: z.ZodString;
    name: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    status: z.ZodDefault<z.ZodEnum<["OnTrack", "ActiveSprint", "AtRisk", "Completed", "Archived"]>>;
    privacy: z.ZodDefault<z.ZodEnum<["Private", "RoomWide", "Public"]>>;
    teamMembers: z.ZodDefault<z.ZodOptional<z.ZodArray<z.ZodString, "many">>>;
}, "strip", z.ZodTypeAny, {
    name: string;
    status: "OnTrack" | "ActiveSprint" | "AtRisk" | "Completed" | "Archived";
    roomId: string;
    privacy: "Private" | "RoomWide" | "Public";
    teamMembers: string[];
    description?: string | undefined;
}, {
    name: string;
    roomId: string;
    description?: string | undefined;
    status?: "OnTrack" | "ActiveSprint" | "AtRisk" | "Completed" | "Archived" | undefined;
    privacy?: "Private" | "RoomWide" | "Public" | undefined;
    teamMembers?: string[] | undefined;
}>;
export declare const updateProjectSchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    status: z.ZodOptional<z.ZodDefault<z.ZodEnum<["OnTrack", "ActiveSprint", "AtRisk", "Completed", "Archived"]>>>;
    privacy: z.ZodOptional<z.ZodDefault<z.ZodEnum<["Private", "RoomWide", "Public"]>>>;
    teamMembers: z.ZodOptional<z.ZodDefault<z.ZodOptional<z.ZodArray<z.ZodString, "many">>>>;
}, "strip", z.ZodTypeAny, {
    name?: string | undefined;
    description?: string | undefined;
    status?: "OnTrack" | "ActiveSprint" | "AtRisk" | "Completed" | "Archived" | undefined;
    privacy?: "Private" | "RoomWide" | "Public" | undefined;
    teamMembers?: string[] | undefined;
}, {
    name?: string | undefined;
    description?: string | undefined;
    status?: "OnTrack" | "ActiveSprint" | "AtRisk" | "Completed" | "Archived" | undefined;
    privacy?: "Private" | "RoomWide" | "Public" | undefined;
    teamMembers?: string[] | undefined;
}>;
export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
