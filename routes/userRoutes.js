const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { getUserProfile, updateProfile, addExperience, deleteExperience, addEducation, deleteEducation, searchUsers } = require('../controllers/userController');


router.get('/search', protect, searchUsers);

router.get('/:id', protect, getUserProfile);
router.put('/profile', protect, updateProfile);

router.post('/experience', protect, addExperience);
router.delete('/experience/:expId', protect, deleteExperience);

router.post('/education', protect, addEducation);
router.delete('/education/:eduId', protect, deleteEducation);

module.exports = router;
