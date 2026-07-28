import { Router, Request, Response } from 'express';
import multer from 'multer';
import mongoose from 'mongoose';
import { FILE_LIMITS } from '@synca/config';
import { requireAuth } from '../middleware/auth.middleware.js';
import { uploadToCloudinary } from '../lib/cloudinary.js';
import { FileRef } from '../models/FileRef.js';

const router = Router();

// Setup multer memory storage configuration
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: FILE_LIMITS.MAX_FILE_SIZE_BYTES, // Limit to 25 MB
  },
});

router.post('/upload', requireAuth, upload.single('file'), async (req: Request, res: Response) => {
  try {
    const file = req.file;
    const { roomId } = req.body;

    // 1. Validate file exists in request payload
    if (!file) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'No file was provided in the multipart request',
        },
      });
    }

    // 2. Validate Room ID exists
    if (!roomId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Room ID is required to associate this file reference',
        },
      });
    }

    // 3. Validate MongoDB Room ID format
    if (!mongoose.Types.ObjectId.isValid(roomId)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid Room ID format provided',
        },
      });
    }

    // 4. Validate MIME type against workspace allowed lists
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

    // 5. Upload buffer stream to Cloudinary (partition by room namespace)
    const cloudinaryResult = await uploadToCloudinary(file.buffer, `synca-room-${roomId}`);

    // 6. Save tracking reference in MongoDB
    const fileRef = new FileRef({
      uploaderId,
      roomId: new mongoose.Types.ObjectId(roomId),
      cloudinaryPublicId: cloudinaryResult.public_id,
      cloudinaryUrl: cloudinaryResult.secure_url,
      fileName: file.originalname,
      fileSize: file.size,
      fileType: file.mimetype,
    });

    await fileRef.save();

    // 7. Return standard JSON API envelope
    return res.status(201).json({
      success: true,
      data: {
        id: fileRef._id,
        fileName: fileRef.fileName,
        fileSize: fileRef.fileSize,
        fileType: fileRef.fileType,
        cloudinaryUrl: fileRef.cloudinaryUrl,
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
