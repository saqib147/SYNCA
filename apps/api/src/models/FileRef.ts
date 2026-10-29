import mongoose, { Schema, Document } from 'mongoose';

export interface IFileRef extends Document {
  uploaderId: string;
  projectId: mongoose.Types.ObjectId | null;
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
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', default: null, index: true },
    cloudinaryPublicId: { type: String, required: true },
    cloudinaryUrl: { type: String, required: true },
    fileName: { type: String, required: true },
    fileSize: { type: Number, required: true },
    fileType: { type: String, required: true },
    deletedAt: { type: Date, default: null },
  },
  {
    timestamps: { createdAt: 'uploadedAt', updatedAt: false },
  }
);

FileRefSchema.index({ projectId: 1, deletedAt: 1 });

FileRefSchema.pre(/^find/, function (this: any) {
  if (this.getFilter().deletedAt === undefined) {
    this.where({ deletedAt: null });
  }
});

export const FileRef = mongoose.model<IFileRef>('FileRef', FileRefSchema);
