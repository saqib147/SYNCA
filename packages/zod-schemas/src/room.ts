import { z } from 'zod';

export const createRoomSchema = z.object({
  name: z.string().min(2, 'Room name must be at least 2 characters').max(100),
  description: z.string().max(500).optional(),
  avatarUrl: z.string().url().optional(),
});

export const updateRoomSchema = createRoomSchema.partial();

export const joinRoomSchema = z.object({
  inviteCode: z.string().min(1, 'Invite code is required'),
});

export const updateMemberRoleSchema = z.object({
  role: z.enum(['Owner', 'Admin', 'Manager', 'Member', 'Viewer', 'Guest']),
  customPermissions: z.array(z.string()).optional(),
});

export type CreateRoomInput = z.infer<typeof createRoomSchema>;
export type UpdateRoomInput = z.infer<typeof updateRoomSchema>;
export type JoinRoomInput = z.infer<typeof joinRoomSchema>;
export type UpdateMemberRoleInput = z.infer<typeof updateMemberRoleSchema>;
