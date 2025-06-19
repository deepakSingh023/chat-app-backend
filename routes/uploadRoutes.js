const express = require('express');
const auth = require('../middleware/authMiddleware');
const upload = require('../middleware/upload');
const { updateProfile, fetchProfile } = require('../controllers/uploadController');

const router = express.Router();

// POST /api/upload/setUserInfo
//   - auth: ensures req.user.id is set
//   - upload.single('profilepic'): uploads to Cloudinary
router.post('/setUserInfo', auth, upload.single('profilepic'), updateProfile);

// GET /api/upload/getUserInfo/:id
router.get('/getUserInfo/:id', auth, fetchProfile);

module.exports = router;
