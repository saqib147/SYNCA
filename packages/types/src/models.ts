import { Role, Permission } from './permissions.js';

export interface User {
  id: string; // Clerk userId
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
  completed?: boolean;
}

export interface Milestone {
  id?: string;
  _id?: string;
  projectId?: string;
  title: string;
  description?: string;
  status: MilestoneStatus;
  progress: number; // 0 - 100
  date?: Date | string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export type ProjectRole = 'Admin' | 'Member' | 'Viewer';

export interface ProjectTeamMember {
  userId: string;
  role: ProjectRole;
}

export interface Project {
  id?: string;
  _id: string;
  workspaceId: string;
  roomId?: string;
  name: string;
  slug: string;
  description?: string;
  status: ProjectStatus;
  privacy: ProjectPrivacy;
  goals?: ProjectGoal[];
  milestones?: Milestone[];
  teamMembers: string[]; // userIds
  members?: ProjectTeamMember[];
  connectedFiles?: string[]; // fileRefIds
  deletedAt?: Date | string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export type TaskPriority = 'High' | 'Medium' | 'Low';

export interface Subtask {
  id?: string;
  _id?: string;
  title: string;
  completed: boolean;
}

export interface Task {
  id?: string;
  _id: string;
  workspaceId: string;
  projectId?: string | null;
  createdBy: string;
  title: string;
  description?: string;
  status: string;
  order?: number;
  priority: TaskPriority;
  assignees: string[]; // userIds
  dueDate?: Date | string | null;
  subtasks: Subtask[];
  isPrivate: boolean;
  deletedAt?: Date | string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export type MilestoneStatus = 'Completed' | 'InProgress' | 'Upcoming';

export type ChannelType = 'dm' | 'channel';

export interface Reaction {
  emoji: string;
  userIds: string[];
}

export interface Message {
  id: string;
  roomId: string;
  channelType: ChannelType;
  channelId: string; // target userId (DM) or projectId (Channel)
  senderId: string;
  content: unknown; // Tiptap JSON or structured content
  attachments?: string[]; // fileRefIds
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
