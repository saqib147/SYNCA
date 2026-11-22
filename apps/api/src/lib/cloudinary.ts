import { v2 as cloudinary, UploadApiResponse, UploadApiErrorResponse } from 'cloudinary';

function ensureCloudinaryConfig() {
  const cloud_name = process.env.CLOUDINARY_CLOUD_NAME?.trim();
  const api_key = process.env.CLOUDINARY_API_KEY?.trim();
  const api_secret = process.env.CLOUDINARY_API_SECRET?.trim();

  if (!cloud_name || !api_key || !api_secret) {
    throw new Error(
      'Cloudinary credentials are missing (CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET)'
    );
  }

  cloudinary.config({
    cloud_name,
    api_key,
    api_secret,
    secure: true,
  });
}

const SAFE_RASTER_IMAGES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
]);

export function resolveCloudinaryResourceType(mimeType?: string): 'image' | 'raw' {
  return mimeType && SAFE_RASTER_IMAGES.has(mimeType.toLowerCase()) ? 'image' : 'raw';
}

/**
 * Streams an in-memory buffer directly to Cloudinary storage.
 * Uses `image` for safe raster images and `raw` for all other file types
 * (PDFs, docs, archives, SVGs, code, etc.) so any file uploads safely.
 */
export const uploadToCloudinary = (
  fileBuffer: Buffer,
  folder: string = 'synca-workspace',
  mimeType?: string,
  originalFileName?: string
): Promise<UploadApiResponse> => {
  ensureCloudinaryConfig();

  const resourceType = resolveCloudinaryResourceType(mimeType);

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: resourceType,
        ...(originalFileName
          ? {
              use_filename: true,
              unique_filename: true,
              filename_override: originalFileName,
            }
          : {}),
      },
      (error: UploadApiErrorResponse | undefined, result: UploadApiResponse | undefined) => {
        if (error) {
          return reject(error);
        }
        if (result) {
          return resolve(result);
        }
        reject(new Error('Unknown upload error occurred in Cloudinary SDK'));
      }
    );

    uploadStream.end(fileBuffer);
  });
};

export { ensureCloudinaryConfig };
export default cloudinary;
