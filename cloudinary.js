
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import dotenv from 'dotenv';

dotenv.config();

cloudinary.config({
  cloud_name: Process.env.YOUR_CLOUDINARY_NAME,
  api_key: process.env.YOUR_CLOUDINARY_API_KEY,
  api_secret: process.env.YOUR_API_SECRET, // Ensure you have this in your .env file
});

// Multer storage engine for Cloudinary
const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'profile_pics',            // your folder in Cloudinary
    allowed_formats: ['jpg', 'png'],   // restrict formats
    transformation: [{ width: 500, crop: 'limit' }],
  },
});

export { cloudinary, storage };
