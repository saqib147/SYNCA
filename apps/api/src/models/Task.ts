import mongoose, { Schema, Document } from 'mongoose';

export interface ISubtask {
  _id?: mongoose.Types.ObjectId;
  title: string;
  completed: boolean;
}

export interface ITask extends Document {
  workspaceId: mongoose.Types.ObjectId;
  projectId?: mongoose.Types.ObjectId | null;
  createdBy: string;
  title: string;
  description?: string;
  status: string;
  order: number;
  priority: 'High' | 'Medium' | 'Low';
  assignees: string[]; // Clerk userIds
  dueDate?: Date | null;
  subtasks: ISubtask[];
  isPrivate: boolean;
  deletedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const SubtaskSchema = new Schema<ISubtask>(
  {
    title: { type: String, required: true, trim: true },
    completed: { type: Boolean, default: false },
  },
  { _id: true }
);

const TaskSchema = new Schema<ITask>(
  {
    workspaceId: {
      type: Schema.Types.ObjectId,
      ref: 'Workspace',
      required: true,
      index: true,
    },
    projectId: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      default: null,
      index: true,
    },
    createdBy: { type: String, required: true, index: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: '' },
    status: { type: String, required: true, default: 'To Do', trim: true, index: true },
    order: { type: Number, default: 0 },
    priority: {
      type: String,
      enum: ['High', 'Medium', 'Low'],
      default: 'Medium',
      index: true,
    },
    assignees: [{ type: String, trim: true }],
    dueDate: { type: Date, default: null },
    subtasks: [SubtaskSchema],
    isPrivate: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
  }
);

// Indexes for high-performance Kanban and Dashboard queries
TaskSchema.index({ workspaceId: 1, projectId: 1, deletedAt: 1, status: 1, order: 1 });
TaskSchema.index({ workspaceId: 1, assignees: 1, deletedAt: 1 });
TaskSchema.index({ workspaceId: 1, createdBy: 1, isPrivate: 1, deletedAt: 1 });

export const Task = mongoose.model<ITask>('Task', TaskSchema);
