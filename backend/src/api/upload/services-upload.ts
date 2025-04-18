import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';

dotenv.config();

// Create S3 client
const s3Client = new S3Client({
  region: process.env.AWS_REGION as string,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY as string,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY as string,
    sessionToken: process.env.AWS_SESSION_TOKEN as string,
  },
});

// S3 bucket name - you should add this to your .env file
const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME || 'rangrez-uploads';

// Define allowed file types
const ALLOWED_FILE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png'
];

// Define max file size (5MB)
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB in bytes

// Interface for upload response
interface UploadResult {
  success: boolean;
  url?: string;
  error?: string;
}

/**
 * Upload file to S3
 * @param file The file buffer to upload
 * @param fileName Original file name (used to determine extension)
 * @param contentType MIME type of the file
 */
export const uploadFileToS3 = async (
  file: Buffer,
  fileName: string,
  contentType: string
): Promise<UploadResult> => {
  try {
    // Validate file type
    if (!ALLOWED_FILE_TYPES.includes(contentType)) {
      return {
        success: false,
        error: `Invalid file type. Allowed types: ${ALLOWED_FILE_TYPES.join(', ')}`
      };
    }

    // Validate file size
    if (file.length > MAX_FILE_SIZE) {
      return {
        success: false,
        error: `File too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB`
      };
    }

    // Get file extension
    const extension = fileName.split('.').pop()?.toLowerCase() || 'jpg';
    
    // Generate unique filename with UUID
    const uniqueFileName = `${uuidv4()}.${extension}`;

    // Define S3 path - you might want to organize by date or user
    const s3Key = `uploads/${uniqueFileName}`;

    // Upload to S3
    const putCommand = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: s3Key,
      Body: file,
      ContentType: contentType,
      ACL: 'public-read', // Make the file publicly accessible
    });

    await s3Client.send(putCommand);

    // Return the public URL
    const publicUrl = `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${s3Key}`;

    return {
      success: true,
      url: publicUrl
    };
  } catch (error) {
    console.error('❌ Error uploading file to S3:', error);
    return {
      success: false,
      error: 'Failed to upload file to S3'
    };
  }
};

export { s3Client };