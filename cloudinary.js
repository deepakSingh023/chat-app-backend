// config/cloudinary.js
const { v2: cloudinary } = require('cloudinary');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const dotenv = require('dotenv');

dotenv.config();

cloudinary.config({
  cloud_name: process.env.YOUR_CLOUDINARY_NAME,
  api_key: process.env.YOUR_CLOUDINARY_API_KEY,
  api_secret: process.env.YOUR_API_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => ({
    folder: 'chat_uploads',
    resource_type: 'auto',
    public_id: Date.now() + '-' + file.originalname,
  }),
});

module.exports = { cloudinary, storage };
