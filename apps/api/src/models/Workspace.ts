import mongoose, { Schema, Document } from 'mongoose';

export interface IWorkspaceMember {
  userId: string;
  role: 'owner' | 'admin' | 'member';
  joinedAt: Date;
}

export interface IWorkspace extends Document {
  name: string;
  slug: string;
  description?: string;
  joinCode: string;
  ownerId: string;
  members: IWorkspaceMember[];
  isPrivate: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const WorkspaceMemberSchema = new Schema<IWorkspaceMember>(
  {
    userId: { type: String, required: true },
    role: { type: String, enum: ['owner', 'admin', 'member'], default: 'member' },
    joinedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const WorkspaceSchema = new Schema<IWorkspace>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    description: { type: String, trim: true, default: '' },
    joinCode: { type: String, required: true, unique: true, uppercase: true, trim: true, index: true },
    ownerId: { type: String, required: true, index: true },
    members: [WorkspaceMemberSchema],
    isPrivate: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);

// Compound Indexes for fast roster lookups
WorkspaceSchema.index({ 'members.userId': 1 });
WorkspaceSchema.index({ ownerId: 1, createdAt: -1 });

export const Workspace = mongoose.model<IWorkspace>('Workspace', WorkspaceSchema);
