
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import dotenv from 'dotenv';

dotenv.config();

cloudinary.config({
  cloud_name: process.env.YOUR_CLOUDINARY_NAME,
  api_key: process.env.YOUR_CLOUDINARY_API_KEY,
  api_secret: process.env.YOUR_API_SECRET, // Ensure you have this in your .env file
});

// Multer storage engine for Cloudinary
const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => ({
    folder: 'chat_uploads',
    resource_type: 'auto', // <-- VERY IMPORTANT for non-images (pdf, zip)
    public_id: Date.now() + '-' + file.originalname,
  }),
});

export { cloudinary, storage };
