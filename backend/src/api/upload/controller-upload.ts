import { Context } from 'hono';
import { uploadFileToS3 } from './services-upload';

// Controller for handling image uploads
export const uploadImage = async (c: Context) => {
  try {
    // Get file from multipart form data
    const formData = await c.req.formData();
    const file = formData.get('image') as File | null;

    if (!file) {
      return c.json({
        success: false,
        error: 'No image file provided. Please send an image with the key "image".'
      }, 400);
    }

    // Get file information
    const fileName = file.name;
    const contentType = file.type;
    
    // Convert File to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Log file info
    console.log(`Processing upload: ${fileName}, type: ${contentType}, size: ${buffer.length} bytes`);

    // Upload to S3
    const result = await uploadFileToS3(buffer, fileName, contentType);

    if (!result.success) {
      return c.json({
        success: false,
        error: result.error
      }, 400);
    }

    // Return success response with the image URL
    return c.json({
      success: true,
      message: 'Image uploaded successfully',
      imageUrl: result.url
    });
  } catch (error) {
    console.error('❌ Error processing image upload:', error);
    return c.json({
      success: false,
      error: 'Failed to process image upload',
      details: error.message
    }, 500);
  }
};