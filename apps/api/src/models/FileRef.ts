import mongoose, { Schema, Document } from 'mongoose';

export interface IFileRef extends Document {
  uploaderId: string;
  roomId: mongoose.Types.ObjectId;
  cloudinaryPublicId: string;
  cloudinaryUrl: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  deletedAt: Date | null;
  uploadedAt: Date;
}

const FileRefSchema = new Schema<IFileRef>(
  {
    uploaderId: { type: String, required: true, index: true },
    roomId: { type: Schema.Types.ObjectId, required: true, index: true },
    cloudinaryPublicId: { type: String, required: true },
    cloudinaryUrl: { type: String, required: true },
    fileName: { type: String, required: true },
    fileSize: { type: Number, required: true },
    fileType: { type: String, required: true },
    deletedAt: { type: Date, default: null },
  },
  {
    timestamps: { createdAt: 'uploadedAt', updatedAt: false }, // Automatically maps to uploadedAt
  }
);

// Indexes defined in docs/database.md
FileRefSchema.index({ roomId: 1, deletedAt: 1 });

// Pre-find query middleware to filter out soft-deleted files automatically
FileRefSchema.pre(/^find/, function (this: any) {
  if (this.getFilter().deletedAt === undefined) {
    this.where({ deletedAt: null });
  }
});

export const FileRef = mongoose.model<IFileRef>('FileRef', FileRefSchema);
