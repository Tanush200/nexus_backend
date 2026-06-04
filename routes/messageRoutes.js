const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { getOrCreateConversation, getConversations, getMessages, sendMessage } = require('../controllers/messageController');



router.get('/conversations', protect, getConversations);
router.post('/conversation/:userId', protect, getOrCreateConversation);
router.get('/:conversationId', protect, getMessages);
router.post('/:conversationId', protect, sendMessage);

module.exports = router;
