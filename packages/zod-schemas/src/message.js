"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reactMessageSchema = exports.sendMessageSchema = void 0;
const zod_1 = require("zod");
exports.sendMessageSchema = zod_1.z.object({
    roomId: zod_1.z.string().min(1, 'Room ID is required'),
    channelType: zod_1.z.enum(['dm', 'channel']),
    channelId: zod_1.z.string().min(1, 'Channel ID is required'),
    content: zod_1.z.unknown(), // Tiptap JSON format
    attachments: zod_1.z.array(zod_1.z.string()).optional(),
});
exports.reactMessageSchema = zod_1.z.object({
    messageId: zod_1.z.string().min(1),
    emoji: zod_1.z.string().min(1),
});
