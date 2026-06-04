const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
    sendRequest, acceptRequest, declineRequest, removeConnection,
    getPendingRequests, getSentRequests, getMyConnections,
    getConnectionStatus, getSuggestions,
} = require('../controllers/connectionController');

router.get('/pending', protect, getPendingRequests);
router.get('/sent', protect, getSentRequests);
router.get('/my', protect, getMyConnections);
router.get('/suggestions', protect, getSuggestions);
router.get('/status/:id', protect, getConnectionStatus);

router.post('/request/:id', protect, sendRequest);
router.put('/accept/:id', protect, acceptRequest);
router.put('/decline/:id', protect, declineRequest);
router.delete('/:id', protect, removeConnection);

module.exports = router;
