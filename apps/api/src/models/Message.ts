import mongoose, { Schema, Document } from 'mongoose';

export interface IReaction {
  emoji: string;
  userIds: string[];
}

export interface IMessage extends Document {
  channelType: 'dm' | 'channel';
  channelId: string;
  projectId: mongoose.Types.ObjectId | null;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  content: unknown;
  plainText: string;
  attachments: string[];
  reactions: IReaction[];
  mentions: string[];
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const ReactionSchema = new Schema<IReaction>(
  {
    emoji: { type: String, required: true },
    userIds: [{ type: String }],
  },
  { _id: false }
);

const MessageSchema = new Schema<IMessage>(
  {
    channelType: { type: String, enum: ['dm', 'channel'], required: true },
    channelId: { type: String, required: true, trim: true },
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', default: null },
    senderId: { type: String, required: true, trim: true, index: true },
    senderName: { type: String, default: 'User' },
    senderAvatar: { type: String, default: '' },
    content: { type: Schema.Types.Mixed, required: true },
    plainText: { type: String, default: '' },
    attachments: [{ type: String }],
    reactions: { type: [ReactionSchema], default: [] },
    mentions: [{ type: String }],
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

MessageSchema.index({ channelType: 1, channelId: 1, deletedAt: 1, createdAt: -1 });
MessageSchema.index({ projectId: 1, deletedAt: 1, createdAt: -1 });
MessageSchema.index({ senderId: 1, createdAt: -1 });
MessageSchema.index({ mentions: 1, createdAt: -1 });

MessageSchema.pre(/^find/, function (this: any) {
  if (this.getFilter().deletedAt === undefined) {
    this.where({ deletedAt: null });
  }
});

export const Message = mongoose.model<IMessage>('Message', MessageSchema);
