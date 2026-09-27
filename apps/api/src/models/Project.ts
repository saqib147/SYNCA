import mongoose, { Schema, Document } from 'mongoose';

export interface IProjectGoal {
  title: string;
  description?: string;
  icon?: string;
  completed?: boolean;
}

export interface IProjectMilestone {
  title: string;
  description?: string;
  status: 'Completed' | 'InProgress' | 'Upcoming';
  progress: number;
  date?: Date;
}

export interface IProjectMember {
  userId: string;
  role: 'Admin' | 'Moderator' | 'Member';
  joinedAt?: Date;
}

export interface IProject extends Document {
  ownerId: string; // Clerk userId of project owner/creator
  joinCode: string; // 6-character uppercase join code
  name: string;
  slug: string;
  description?: string;
  status: 'OnTrack' | 'ActiveSprint' | 'AtRisk' | 'Completed' | 'Archived';
  privacy: 'Private' | 'RoomWide' | 'Public';
  goals: IProjectGoal[];
  milestones: IProjectMilestone[];
  teamMembers: string[]; // Clerk userIds
  members: IProjectMember[];
  connectedFiles: string[];
  deletedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const ProjectGoalSchema = new Schema<IProjectGoal>(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    icon: { type: String, trim: true },
    completed: { type: Boolean, default: false },
  },
  { _id: true }
);

const ProjectMilestoneSchema = new Schema<IProjectMilestone>(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    status: {
      type: String,
      enum: ['Completed', 'InProgress', 'Upcoming'],
      default: 'Upcoming',
    },
    progress: { type: Number, min: 0, max: 100, default: 0 },
    date: { type: Date },
  },
  { _id: true }
);

const ProjectSchema = new Schema<IProject>(
  {
    ownerId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    joinCode: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, trim: true, lowercase: true },
    description: { type: String, trim: true, default: '' },
    status: {
      type: String,
      enum: ['OnTrack', 'ActiveSprint', 'AtRisk', 'Completed', 'Archived'],
      default: 'ActiveSprint',
      index: true,
    },
    privacy: {
      type: String,
      enum: ['Private', 'RoomWide', 'Public'],
      default: 'Public',
    },
    goals: [ProjectGoalSchema],
    milestones: [ProjectMilestoneSchema],
    teamMembers: [{ type: String, trim: true }],
    members: [
      {
        userId: { type: String, required: true, trim: true },
        role: { type: String, enum: ['Admin', 'Moderator', 'Member'], default: 'Member' },
        joinedAt: { type: Date, default: Date.now },
      },
    ],
    connectedFiles: [{ type: String }],
    deletedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
  }
);

// Indexes for fast lookup
ProjectSchema.index({ 'members.userId': 1 });
ProjectSchema.index({ deletedAt: 1, status: 1 });

export const Project = mongoose.model<IProject>('Project', ProjectSchema);
