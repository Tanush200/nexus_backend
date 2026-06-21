const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { 
    getUserProfile, 
    updateProfile, 
    addExperience, 
    deleteExperience, 
    addEducation, 
    deleteEducation, 
    searchUsers,
    requestEmailVerification,
    confirmEmailVerification,
    verifyGitHub,
    verifyFigma
} = require('../controllers/userController');


router.get('/search', protect, searchUsers);

router.post('/verify-email-request', protect, requestEmailVerification);
router.post('/verify-email-confirm', protect, confirmEmailVerification);
router.post('/verify-github', protect, verifyGitHub);
router.post('/verify-figma', protect, verifyFigma);

router.get('/:id', protect, getUserProfile);
router.put('/profile', protect, updateProfile);

router.post('/experience', protect, addExperience);
router.delete('/experience/:expId', protect, deleteExperience);

router.post('/education', protect, addEducation);
router.delete('/education/:eduId', protect, deleteEducation);

module.exports = router;
