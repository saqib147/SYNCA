import { Message, Reaction, Task, Notification } from './models.js';
export interface ClientEvents {
    'project:join': (payload: {
        projectId: string;
    }) => void;
    'project:leave': (payload: {
        projectId: string;
    }) => void;
    'message:send': (payload: {
        channelType: 'dm' | 'channel';
        channelId: string;
        content: unknown;
        attachments?: string[];
    }) => void;
    'message:react': (payload: {
        messageId: string;
        emoji: string;
    }) => void;
    'message:delete': (payload: {
        messageId: string;
    }) => void;
    'typing:start': (payload: {
        channelType: 'dm' | 'channel';
        channelId: string;
    }) => void;
    'typing:stop': (payload: {
        channelType: 'dm' | 'channel';
        channelId: string;
    }) => void;
    'task:move': (payload: {
        taskId: string;
        newStatus: string;
        newIndex: number;
    }) => void;
}
export interface ServerEvents {
    'message:new': (message: Message) => void;
    'message:deleted': (payload: {
        messageId: string;
        channelId: string;
    }) => void;
    'message:reaction': (payload: {
        messageId: string;
        reactions: Reaction[];
    }) => void;
    'typing:update': (payload: {
        channelId: string;
        typingUsers: {
            userId: string;
            name: string;
        }[];
    }) => void;
    'presence:update': (payload: {
        userId: string;
        status: 'online' | 'offline';
        lastSeen: Date;
    }) => void;
    'task:updated': (payload: {
        task: Task;
        projectId: string;
    }) => void;
    'notification:new': (notification: Notification) => void;
    'error': (payload: {
        code: string;
        message: string;
    }) => void;
}
