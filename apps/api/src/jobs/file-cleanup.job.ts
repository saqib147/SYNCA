import { FILE_LIMITS } from '@synca/config';
import { FileRef } from '../models/FileRef.js';
import cloudinary, {
  ensureCloudinaryConfig,
  resolveCloudinaryResourceType,
} from '../lib/cloudinary.js';

const CLEANUP_INTERVAL_MS = 15 * 60 * 1000; // Run every 15 minutes
let cleanupTimer: ReturnType<typeof setInterval> | null = null;
let initialTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Finds files past their 24-hour retention window, deletes their assets from Cloudinary,
 * and marks their FileRef documents as soft-deleted in MongoDB.
 */
export async function runExpiredFileCleanup(): Promise<number> {
  try {
    const now = new Date();
    const retentionCutoff = new Date(
      now.getTime() - FILE_LIMITS.RETENTION_HOURS * 60 * 60 * 1000
    );

    const expiredFiles = await FileRef.find({
      deletedAt: null,
      $or: [
        { expiresAt: { $lte: now } },
        { expiresAt: { $exists: false }, uploadedAt: { $lte: retentionCutoff } },
      ],
    }).limit(50);

    if (expiredFiles.length === 0) return 0;

    let deletedCount = 0;
    for (const fileRef of expiredFiles) {
      try {
        ensureCloudinaryConfig();
        const resourceType = resolveCloudinaryResourceType(fileRef.fileType);
        await cloudinary.uploader.destroy(fileRef.cloudinaryPublicId, {
          resource_type: resourceType,
        });
      } catch (cloudErr) {
        console.warn(
          `[FileCleanup] Cloudinary destroy skipped for ${fileRef.cloudinaryPublicId}:`,
          (cloudErr as Error)?.message
        );
      }

      fileRef.deletedAt = now;
      await fileRef.save();
      deletedCount += 1;
    }

    console.log(`[FileCleanup] Auto-deleted ${deletedCount} expired file(s) (>24h old).`);
    return deletedCount;
  } catch (err) {
    console.error('[FileCleanup] Sweep error:', err);
    return 0;
  }
}

export function startFileCleanupJob() {
  if (cleanupTimer) return;
  // Run an initial sweep 15s after startup, then every 15 minutes
  initialTimer = setTimeout(() => {
    void runExpiredFileCleanup();
  }, 15_000);
  cleanupTimer = setInterval(() => {
    void runExpiredFileCleanup();
  }, CLEANUP_INTERVAL_MS);
  console.log(
    `[FileCleanup] 24-hour auto-delete scheduler active (sweeping every 15m).`
  );
}

export function stopFileCleanupJob() {
  if (initialTimer) {
    clearTimeout(initialTimer);
    initialTimer = null;
  }
  if (cleanupTimer) {
    clearInterval(cleanupTimer);
    cleanupTimer = null;
  }
}
