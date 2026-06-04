const Conversation = require('../models/Conversation');
const Message = require('../models/Message');


const getOrCreateConversation = async (req, res, next) => {
    try {
        const otherUserId = req.params.userId;
        const myId = req.user._id;

        let conversation = await Conversation.findOne({
            participants: { $all: [myId, otherUserId] },
        })
            .populate('participants', 'name profilePicture headline')
            .populate('lastMessage');

        if (!conversation) {
            conversation = await Conversation.create({
                participants: [myId, otherUserId],
            });
            await conversation.populate('participants', 'name profilePicture headline');
        }

        res.status(200).json({ success: true, conversation });
    } catch (error) {
        next(error);
    }
};



const getConversations = async (req, res, next) => {
    try {
        const conversations = await Conversation.find({
            participants: req.user._id,
        })
            .populate('participants', 'name profilePicture headline')
            .populate('lastMessage')
            .sort({ updatedAt: -1 });

        res.status(200).json({ success: true, conversations });
    } catch (error) {
        next(error);
    }
};




const getMessages = async (req, res, next) => {
    try {
        const { conversationId } = req.params;
        const conversation = await Conversation.findOne({
            _id: conversationId,
            participants: req.user._id,
        });

        if (!conversation) {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }

        const messages = await Message.find({ conversation: conversationId })
            .populate('sender', 'name profilePicture')
            .sort({ createdAt: 1 });

        await Message.updateMany(
            {
                conversation: conversationId,
                sender: { $ne: req.user._id },
                isRead: false,
            },
            { isRead: true }
        );

        await Conversation.findByIdAndUpdate(conversationId, {
            $set: { [`unreadCounts.${req.user._id}`]: 0 },
        });

        res.status(200).json({ success: true, messages });
    } catch (error) {
        next(error);
    }
};




const sendMessage = async (req, res, next) => {
    try {
        const { conversationId } = req.params;
        const { content } = req.body;

        if (!content?.trim()) {
            return res.status(400).json({ success: false, message: 'Message cannot be empty' });
        }

        const conversation = await Conversation.findOne({
            _id: conversationId,
            participants: req.user._id,
        });

        if (!conversation) {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }

        const message = await Message.create({
            conversation: conversationId,
            sender: req.user._id,
            content,
        });

        await message.populate('sender', 'name profilePicture');

        const otherUserId = conversation.participants.find(
            (id) => id.toString() !== req.user._id.toString()
        );

        await Conversation.findByIdAndUpdate(conversationId, {
            lastMessage: message._id,
            $inc: { [`unreadCounts.${otherUserId}`]: 1 },
            updatedAt: new Date(),
        });

        res.status(201).json({ success: true, message });
    } catch (error) {
        next(error);
    }
};

module.exports = { getOrCreateConversation, getConversations, getMessages, sendMessage };
