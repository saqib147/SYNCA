import type { ProjectRole } from './permissions.js';

export interface User {
  id: string; // Clerk userId
  email: string;
  name: string;
  avatarUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type ProjectStatus = 'OnTrack' | 'ActiveSprint' | 'AtRisk' | 'Completed' | 'Archived';
export type ProjectPrivacy = 'Private' | 'Public';

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

export interface ProjectTeamMember {
  userId: string;
  role: ProjectRole;
  joinedAt?: Date | string;
}

export interface Project {
  id?: string;
  _id: string;
  ownerId: string;
  joinCode: string;
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

export interface TaskComment {
  _id?: string;
  id?: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  text: string;
  createdAt: Date | string;
}

export interface Task {
  id?: string;
  _id: string;
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
  comments?: TaskComment[];
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
  id?: string;
  _id?: string;
  channelType: ChannelType;
  channelId: string; // projectId (channel) or sorted "userA:userB" (dm)
  projectId?: string | null;
  senderId: string;
  senderName?: string;
  senderAvatar?: string;
  content: unknown; // Tiptap JSON or structured content
  plainText?: string;
  attachments?: string[]; // fileRefIds
  reactions?: Reaction[];
  mentions?: string[];
  deletedAt?: Date | string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface FileRef {
  id?: string;
  _id?: string;
  uploaderId: string;
  projectId?: string | null;
  cloudinaryPublicId: string;
  cloudinaryUrl: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  deletedAt?: Date | string | null;
  uploadedAt: Date | string;
}

export type NotificationType = 'TaskAssigned' | 'Mentioned' | 'MessageReceived';

export interface Notification {
  id?: string;
  _id?: string;
  userId: string;
  type: NotificationType;
  referenceId: string;
  projectId?: string | null;
  read: boolean;
  createdAt: Date | string;
}
