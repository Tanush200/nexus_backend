const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
    createPost, getFeedPosts, getUserPosts,
    likePost, addComment, deletePost, getImageKitAuth,
    getNeighborhoodFeed
} = require('../controllers/postController');

router.get('/feed', protect, getFeedPosts);
router.get('/neighborhood', protect, getNeighborhoodFeed);
router.get('/imagekit-auth', protect, getImageKitAuth);
router.post('/', protect, createPost);
router.get('/user/:userId', protect, getUserPosts);
router.post('/:id/like', protect, likePost);
router.post('/:id/comment', protect, addComment);
router.delete('/:id', protect, deletePost);

module.exports = router;
