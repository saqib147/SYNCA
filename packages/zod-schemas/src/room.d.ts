import { z } from 'zod';
export declare const createRoomSchema: z.ZodObject<{
    name: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    avatarUrl: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    name: string;
    description?: string | undefined;
    avatarUrl?: string | undefined;
}, {
    name: string;
    description?: string | undefined;
    avatarUrl?: string | undefined;
}>;
export declare const updateRoomSchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    avatarUrl: z.ZodOptional<z.ZodOptional<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    name?: string | undefined;
    description?: string | undefined;
    avatarUrl?: string | undefined;
}, {
    name?: string | undefined;
    description?: string | undefined;
    avatarUrl?: string | undefined;
}>;
export declare const joinRoomSchema: z.ZodObject<{
    inviteCode: z.ZodString;
}, "strip", z.ZodTypeAny, {
    inviteCode: string;
}, {
    inviteCode: string;
}>;
export declare const updateMemberRoleSchema: z.ZodObject<{
    role: z.ZodEnum<["Owner", "Admin", "Manager", "Member", "Viewer", "Guest"]>;
    customPermissions: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    role: "Owner" | "Admin" | "Manager" | "Member" | "Viewer" | "Guest";
    customPermissions?: string[] | undefined;
}, {
    role: "Owner" | "Admin" | "Manager" | "Member" | "Viewer" | "Guest";
    customPermissions?: string[] | undefined;
}>;
export type CreateRoomInput = z.infer<typeof createRoomSchema>;
export type UpdateRoomInput = z.infer<typeof updateRoomSchema>;
export type JoinRoomInput = z.infer<typeof joinRoomSchema>;
export type UpdateMemberRoleInput = z.infer<typeof updateMemberRoleSchema>;
