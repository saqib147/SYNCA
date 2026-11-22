import { z } from 'zod';

const safeAttachmentUrl = z
  .string()
  .url('Attachment must be a valid URL')
  .refine((u) => /^https?:\/\//i.test(u), { message: 'Attachment URL must use http or https' });

export const sendMessageSchema = z.object({
  channelType: z.enum(['dm', 'channel']),
  channelId: z.string().min(1, 'Channel ID is required'),
  content: z.unknown(), // Tiptap JSON or plain string for MVP
  attachments: z.array(safeAttachmentUrl).optional(),
  mentions: z.array(z.string()).optional(),
  senderName: z.string().optional(),
  senderAvatar: z.string().optional(),
});

export const typingEventSchema = z.object({
  channelType: z.enum(['dm', 'channel']),
  channelId: z.string().min(1, 'Channel ID is required'),
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
export type TypingEventInput = z.infer<typeof typingEventSchema>;
export type ReactMessageInput = z.infer<typeof reactMessageSchema>;
export type ListMessagesQuery = z.infer<typeof listMessagesQuerySchema>;
