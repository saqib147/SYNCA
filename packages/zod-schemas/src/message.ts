import { z } from 'zod';

export const sendMessageSchema = z.object({
  roomId: z.string().min(1, 'Room ID is required'),
  channelType: z.enum(['dm', 'channel']),
  channelId: z.string().min(1, 'Channel ID is required'),
  content: z.unknown(), // Tiptap JSON format
  attachments: z.array(z.string()).optional(),
});

export const reactMessageSchema = z.object({
  messageId: z.string().min(1),
  emoji: z.string().min(1),
});

export type SendMessageInput = z.infer<typeof sendMessageSchema>;
export type ReactMessageInput = z.infer<typeof reactMessageSchema>;
