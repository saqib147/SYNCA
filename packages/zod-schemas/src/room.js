"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateMemberRoleSchema = exports.joinRoomSchema = exports.updateRoomSchema = exports.createRoomSchema = void 0;
const zod_1 = require("zod");
exports.createRoomSchema = zod_1.z.object({
    name: zod_1.z.string().min(2, 'Room name must be at least 2 characters').max(100),
    description: zod_1.z.string().max(500).optional(),
    avatarUrl: zod_1.z.string().url().optional(),
});
exports.updateRoomSchema = exports.createRoomSchema.partial();
exports.joinRoomSchema = zod_1.z.object({
    inviteCode: zod_1.z.string().min(1, 'Invite code is required'),
});
exports.updateMemberRoleSchema = zod_1.z.object({
    role: zod_1.z.enum(['Owner', 'Admin', 'Manager', 'Member', 'Viewer', 'Guest']),
    customPermissions: zod_1.z.array(zod_1.z.string()).optional(),
});
