import { Router, Request, Response } from 'express';
import multer from 'multer';
import mongoose from 'mongoose';
import { FILE_LIMITS } from '@synca/config';
import { requireAuth } from '../middleware/auth.middleware.js';
import { uploadToCloudinary } from '../lib/cloudinary.js';
import { FileRef } from '../models/FileRef.js';
import { findActiveProject, isProjectMember } from '../utils/membership.js';

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: FILE_LIMITS.MAX_FILE_SIZE_BYTES,
  },
});

router.post('/upload', requireAuth, upload.single('file'), async (req: Request, res: Response) => {
  try {
    const file = req.file;
    const { projectId } = req.body;
    // Back-compat: accept legacy roomId as projectId
    const scopeId = projectId || req.body.roomId || null;

    if (!file) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'No file was provided in the multipart request',
        },
      });
    }

    if (scopeId && !mongoose.Types.ObjectId.isValid(scopeId)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid project ID format provided',
        },
      });
    }

    if (!FILE_LIMITS.ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: `MIME type "${file.mimetype}" is not permitted.`,
        },
      });
    }

    const uploaderId = (req as any).auth.userId;

    if (scopeId) {
      const project = await findActiveProject(scopeId);
      if (!project || !isProjectMember(project, uploaderId)) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'You must be a project member to upload files here',
          },
        });
      }
    }

    const folder = scopeId ? `synca-project-${scopeId}` : `synca-user-${uploaderId}`;
    const cloudinaryResult = await uploadToCloudinary(file.buffer, folder);

    const fileRef = new FileRef({
      uploaderId,
      projectId: scopeId ? new mongoose.Types.ObjectId(scopeId) : null,
      cloudinaryPublicId: cloudinaryResult.public_id,
      cloudinaryUrl: cloudinaryResult.secure_url,
      fileName: file.originalname,
      fileSize: file.size,
      fileType: file.mimetype,
    });

    await fileRef.save();

    return res.status(201).json({
      success: true,
      data: {
        id: fileRef._id,
        fileName: fileRef.fileName,
        fileSize: fileRef.fileSize,
        fileType: fileRef.fileType,
        cloudinaryUrl: fileRef.cloudinaryUrl,
        projectId: fileRef.projectId,
      },
    });
  } catch (error: any) {
    console.error('[FileUpload] Exception thrown during upload stream processing:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'An unexpected error occurred during file upload',
      },
    });
  }
});

export default router;
