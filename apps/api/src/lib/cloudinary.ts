import { v2 as cloudinary, UploadApiResponse, UploadApiErrorResponse } from 'cloudinary';

// Configure Cloudinary SDK using environment variables
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

/**
 * Streams an in-memory buffer directly to Cloudinary storage.
 * 
 * @param fileBuffer The file buffer provided by multer
 * @param folder The target folder inside your Cloudinary account
 * @returns A promise resolving to the Cloudinary Upload API response
 */
export const uploadToCloudinary = (
  fileBuffer: Buffer,
  folder: string = 'synca-workspace'
): Promise<UploadApiResponse> => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: 'auto', // Automatically detects images, videos, raw files, and PDFs
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

    // End the write stream and push the buffer data
    uploadStream.end(fileBuffer);
  });
};

export default cloudinary;
