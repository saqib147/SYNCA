import { z } from 'zod';
export declare const sendMessageSchema: z.ZodObject<{
    roomId: z.ZodString;
    channelType: z.ZodEnum<["dm", "channel"]>;
    channelId: z.ZodString;
    content: z.ZodUnknown;
    attachments: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    roomId: string;
    channelType: "dm" | "channel";
    channelId: string;
    content?: unknown;
    attachments?: string[] | undefined;
}, {
    roomId: string;
    channelType: "dm" | "channel";
    channelId: string;
    content?: unknown;
    attachments?: string[] | undefined;
}>;
export declare const reactMessageSchema: z.ZodObject<{
    messageId: z.ZodString;
    emoji: z.ZodString;
}, "strip", z.ZodTypeAny, {
    messageId: string;
    emoji: string;
}, {
    messageId: string;
    emoji: string;
}>;
export type SendMessageInput = z.infer<typeof sendMessageSchema>;
export type ReactMessageInput = z.infer<typeof reactMessageSchema>;
