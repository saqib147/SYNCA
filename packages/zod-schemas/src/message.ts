import { z } from 'zod';

export const sendMessageSchema = z.object({
  channelType: z.enum(['dm', 'channel']),
  channelId: z.string().min(1, 'Channel ID is required'),
  content: z.unknown(), // Tiptap JSON or plain string for MVP
  attachments: z.array(z.string()).optional(),
  mentions: z.array(z.string()).optional(),
  senderName: z.string().optional(),
  senderAvatar: z.string().optional(),
});

export const reactMessageSchema = z.object({
  messageId: z.string().min(1),
  emoji: z.string().min(1).max(32),
});

export const listMessagesQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
});

export type SendMessageInput = z.infer<typeof sendMessageSchema>;
export type ReactMessageInput = z.infer<typeof reactMessageSchema>;
export type ListMessagesQuery = z.infer<typeof listMessagesQuerySchema>;
