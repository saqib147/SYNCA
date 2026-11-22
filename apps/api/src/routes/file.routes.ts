import { Router, Request, Response } from 'express';
import multer from 'multer';
import mongoose from 'mongoose';
import { FILE_LIMITS } from '@synca/config';
import { requireAuth } from '../middleware/auth.middleware.js';
import { createRateLimiter } from '../middleware/rate-limit.middleware.js';
import cloudinary, {
  ensureCloudinaryConfig,
  resolveCloudinaryResourceType,
  uploadToCloudinary,
} from '../lib/cloudinary.js';
import { FileRef } from '../models/FileRef.js';
import { findActiveProject, getProjectRole, isProjectMember } from '../utils/membership.js';

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: FILE_LIMITS.MAX_FILE_SIZE_BYTES,
  },
});

const uploadLimiter = createRateLimiter({ windowSeconds: 60, maxRequests: 20, keyPrefix: 'file-upload' });

router.post('/upload', requireAuth, uploadLimiter, upload.single('file'), async (req: Request, res: Response) => {
  try {
    const file = req.file;
    const scopeId = req.body.projectId || null;

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

    if (!FILE_LIMITS.ALLOW_ALL_TYPES && !FILE_LIMITS.ALLOWED_MIME_TYPES.includes(file.mimetype)) {
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
    const cloudinaryResult = await uploadToCloudinary(
      file.buffer,
      folder,
      file.mimetype,
      file.originalname
    );

    const expiresAt = new Date(
      Date.now() + FILE_LIMITS.RETENTION_HOURS * 60 * 60 * 1000
    );

    const fileRef = new FileRef({
      uploaderId,
      projectId: scopeId ? new mongoose.Types.ObjectId(scopeId) : null,
      cloudinaryPublicId: cloudinaryResult.public_id,
      cloudinaryUrl: cloudinaryResult.secure_url,
      fileName: file.originalname,
      fileSize: file.size,
      fileType: file.mimetype || 'application/octet-stream',
      expiresAt,
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
        expiresAt: fileRef.expiresAt,
      },
    });
  } catch (error: any) {
    console.error('[FileUpload] Exception thrown during upload stream processing:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred during file upload',
      },
    });
  }
});

/**
 * GET /api/v1/files/:id
 * Retrieve file metadata & URL (requires project membership if project-scoped, or uploader if personal).
 */
router.get('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).auth.userId;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid file ID format' },
      });
    }

    const fileRef = await FileRef.findById(id).lean();
    if (!fileRef) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'File not found' },
      });
    }

    if (fileRef.expiresAt && new Date(fileRef.expiresAt).getTime() <= Date.now()) {
      return res.status(410).json({
        success: false,
        error: { code: 'FILE_EXPIRED', message: 'This file has expired after its 24-hour retention period' },
      });
    }

    if (fileRef.projectId) {
      const project = await findActiveProject(String(fileRef.projectId));
      if (!project || !isProjectMember(project, userId)) {
        return res.status(403).json({
          success: false,
          error: { code: 'FORBIDDEN', message: 'You do not have access to this file' },
        });
      }
    } else if (fileRef.uploaderId !== userId) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'You do not have access to this file' },
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        id: fileRef._id,
        fileName: fileRef.fileName,
        fileSize: fileRef.fileSize,
        fileType: fileRef.fileType,
        cloudinaryUrl: fileRef.cloudinaryUrl,
        projectId: fileRef.projectId,
        uploaderId: fileRef.uploaderId,
        uploadedAt: fileRef.uploadedAt,
      },
    });
  } catch (error) {
    console.error('[FileGet] Error:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to retrieve file metadata' },
    });
  }
});

/**
 * DELETE /api/v1/files/:id
 * Soft delete FileRef and remove asset from Cloudinary (uploader or project Admin).
 */
router.delete('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).auth.userId;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid file ID format' },
      });
    }

    const fileRef = await FileRef.findById(id);
    if (!fileRef) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'File not found' },
      });
    }

    let canDelete = fileRef.uploaderId === userId;
    if (!canDelete && fileRef.projectId) {
      const project = await findActiveProject(String(fileRef.projectId));
      if (project && getProjectRole(project, userId) === 'Admin') {
        canDelete = true;
      }
    }

    if (!canDelete) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Only the uploader or a Project Admin can delete this file' },
      });
    }

    try {
      ensureCloudinaryConfig();
      const resourceType = resolveCloudinaryResourceType(fileRef.fileType);
      await cloudinary.uploader.destroy(fileRef.cloudinaryPublicId, {
        resource_type: resourceType,
      });
    } catch (cloudErr) {
      console.warn('[FileDelete] Cloudinary asset destroy failed (continuing soft-delete):', cloudErr);
    }

    fileRef.deletedAt = new Date();
    await fileRef.save();

    return res.status(200).json({
      success: true,
      data: { id: fileRef._id, message: 'File deleted successfully' },
    });
  } catch (error) {
    console.error('[FileDelete] Error:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to delete file' },
    });
  }
});

export default router;
