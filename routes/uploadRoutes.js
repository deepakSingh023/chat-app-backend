const express = require('express');
const auth = require('../middleware/authMiddleware'); 
const upload = require('../middleware/upload'); 
const { updateProfile, fetchProfile } = require('../controllers/uploadController'); 

const router = express.Router();


router.post('/setUserInfo', auth, upload.single('profilepic'), updateProfile);


router.get('/getUserInfo/:id',auth , fetchProfile);

module.exports = router;
