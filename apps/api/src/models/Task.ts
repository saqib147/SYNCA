import mongoose, { Schema, Document } from 'mongoose';

export interface ISubtask {
  _id?: mongoose.Types.ObjectId;
  title: string;
  completed: boolean;
}

export interface IComment {
  _id?: mongoose.Types.ObjectId;
  userId: string;
  userName: string;
  userAvatar?: string;
  text: string;
  createdAt: Date;
}

export interface ITask extends Document {
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
  comments: IComment[];
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

const CommentSchema = new Schema<IComment>(
  {
    userId: { type: String, required: true },
    userName: { type: String, required: true, trim: true },
    userAvatar: { type: String, default: '' },
    text: { type: String, required: true, trim: true },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const TaskSchema = new Schema<ITask>(
  {
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
    comments: [CommentSchema],
    isPrivate: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
  }
);

// Indexes for high-performance Kanban and Dashboard queries
TaskSchema.index({ projectId: 1, deletedAt: 1, status: 1, order: 1 });
TaskSchema.index({ assignees: 1, deletedAt: 1 });
TaskSchema.index({ createdBy: 1, isPrivate: 1, deletedAt: 1 });

export const Task = mongoose.model<ITask>('Task', TaskSchema);
