import { Role, Permission } from './permissions.js';
export interface User {
    id: string;
    email: string;
    name: string;
    avatarUrl?: string;
    role: Role;
    createdAt: Date;
    updatedAt: Date;
}
export interface Room {
    id: string;
    name: string;
    description?: string;
    avatarUrl?: string;
    ownerId: string;
    inviteCode: string;
    createdAt: Date;
    updatedAt: Date;
}
export interface RoomMember {
    id: string;
    roomId: string;
    userId: string;
    role: Role;
    customPermissions: Permission[];
    joinedAt: Date;
}
export type ProjectStatus = 'OnTrack' | 'ActiveSprint' | 'AtRisk' | 'Completed' | 'Archived';
export type ProjectPrivacy = 'Private' | 'RoomWide' | 'Public';
export interface ProjectGoal {
    title: string;
    description?: string;
    icon?: string;
}
export interface Project {
    id: string;
    roomId: string;
    name: string;
    description?: string;
    status: ProjectStatus;
    privacy: ProjectPrivacy;
    goals?: ProjectGoal[];
    teamMembers: string[];
    connectedFiles?: string[];
    deletedAt?: Date | null;
    createdAt: Date;
    updatedAt: Date;
}
export type TaskPriority = 'High' | 'Medium' | 'Low';
export interface Subtask {
    title: string;
    completed: boolean;
}
export interface Task {
    id: string;
    projectId?: string | null;
    createdBy: string;
    title: string;
    description?: string;
    status: string;
    priority: TaskPriority;
    assignees: string[];
    dueDate?: Date | null;
    subtasks: Subtask[];
    isPrivate: boolean;
    deletedAt?: Date | null;
    createdAt: Date;
    updatedAt: Date;
}
export type MilestoneStatus = 'Completed' | 'InProgress' | 'Upcoming';
export interface Milestone {
    id: string;
    projectId: string;
    title: string;
    description?: string;
    status: MilestoneStatus;
    progress: number;
    date: Date;
    createdAt: Date;
    updatedAt: Date;
}
export type ChannelType = 'dm' | 'channel';
export interface Reaction {
    emoji: string;
    userIds: string[];
}
export interface Message {
    id: string;
    roomId: string;
    channelType: ChannelType;
    channelId: string;
    senderId: string;
    content: unknown;
    attachments?: string[];
    reactions?: Reaction[];
    deletedAt?: Date | null;
    createdAt: Date;
    updatedAt: Date;
}
export interface FileRef {
    id: string;
    uploaderId: string;
    roomId: string;
    cloudinaryPublicId: string;
    cloudinaryUrl: string;
    fileName: string;
    fileSize: number;
    fileType: string;
    uploadedAt: Date;
}
export type NotificationType = 'TaskAssigned' | 'Mentioned' | 'MessageReceived';
export interface Notification {
    id: string;
    userId: string;
    type: NotificationType;
    referenceId: string;
    read: boolean;
    createdAt: Date;
}
