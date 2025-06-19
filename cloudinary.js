// import { v2 as cloudinary } from 'cloudinary';
// const dotenv = require('dotenv');


// dotenv.config();

// (async function() {

//     // Configuration
//     cloudinary.config({ 
//         cloud_name: 'drpkliaca', 
//         api_key: '298651695968369', 
//         api_secret: process.env.YOUR_API_SECRET // Click 'View API Keys' above to copy your API secret
//     })})();
    
    // Upload an image
//      const uploadResult = await cloudinary.uploader
//        .upload(
//            'https://res.cloudinary.com/profilePic/image/upload/getting-started/shoes.jpg', {
//                public_id: 'shoes',
//            }
//        )
//        .catch((error) => {
//            console.log(error);
//        });
    
//     console.log(uploadResult);
    
//     // Optimize delivery by resizing and applying auto-format and auto-quality
//     const optimizeUrl = cloudinary.url('shoes', {
//         fetch_format: 'auto',
//         quality: 'auto'
//     });
    
//     console.log(optimizeUrl);
    
//     // Transform the image: auto-crop to square aspect_ratio
//     const autoCropUrl = cloudinary.url('shoes', {
//         crop: 'auto',
//         gravity: 'auto',
//         width: 500,
//         height: 500,
//     });
    
//     console.log(autoCropUrl);    
// })();


// config/cloudinary.js
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import dotenv from 'dotenv';

dotenv.config();

cloudinary.config({
  cloud_name: 'drpkliaca',
  api_key:    '298651695968369',
  api_secret: 'q1fOF5BEAOUwF-cGTrFzI1-RBQ8',
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
