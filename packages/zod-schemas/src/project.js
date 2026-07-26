"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateProjectSchema = exports.createProjectSchema = void 0;
const zod_1 = require("zod");
exports.createProjectSchema = zod_1.z.object({
    roomId: zod_1.z.string().min(1, 'Room ID is required'),
    name: zod_1.z.string().min(2, 'Project name must be at least 2 characters').max(100),
    description: zod_1.z.string().max(2000).optional(),
    status: zod_1.z.enum(['OnTrack', 'ActiveSprint', 'AtRisk', 'Completed', 'Archived']).default('ActiveSprint'),
    privacy: zod_1.z.enum(['Private', 'RoomWide', 'Public']).default('RoomWide'),
    teamMembers: zod_1.z.array(zod_1.z.string()).optional().default([]),
});
exports.updateProjectSchema = exports.createProjectSchema.omit({ roomId: true }).partial();
