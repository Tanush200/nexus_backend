const Notification = require('../models/Notification');


const getNotifications = async (req, res, next) => {
    try {
        const notifications = await Notification.find({ recipient: req.user._id })
            .populate('sender', 'name profilePicture headline')
            .populate('post', 'content')
            .sort({ createdAt: -1 })
            .limit(50);

        const unreadCount = await Notification.countDocuments({
            recipient: req.user._id,
            isRead: false,
        });

        res.status(200).json({ success: true, notifications, unreadCount });
    } catch (error) {
        next(error);
    }
};



const markAsRead = async (req, res, next) => {
    try {
        await Notification.findOneAndUpdate(
            { _id: req.params.id, recipient: req.user._id },
            { isRead: true }
        );
        res.status(200).json({ success: true });
    } catch (error) {
        next(error);
    }
};



const markAllAsRead = async (req, res, next) => {
    try {
        await Notification.updateMany(
            { recipient: req.user._id, isRead: false },
            { isRead: true }
        );
        res.status(200).json({ success: true, message: 'All marked as read' });
    } catch (error) {
        next(error);
    }
};




const deleteNotification = async (req, res, next) => {
    try {
        await Notification.findOneAndDelete({
            _id: req.params.id,
            recipient: req.user._id,
        });
        res.status(200).json({ success: true });
    } catch (error) {
        next(error);
    }
};


const createNotification = async ({ recipient, sender, type, post = null, message }) => {
    try {
        if (recipient.toString() === sender.toString()) return;
        await Notification.create({ recipient, sender, type, post, message });
    } catch (err) {
        console.error('createNotification failed:', err.message);
    }
};

module.exports = { getNotifications, markAsRead, markAllAsRead, deleteNotification, createNotification };
