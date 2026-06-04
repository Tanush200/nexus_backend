const Connection = require('../models/Connection');
const User = require('../models/User');
const { createNotification } = require('./notificationController');


const sendRequest = async (req, res, next) => {
    try {
        const receiverId = req.params.id;
        const senderId = req.user._id;

        if (senderId.toString() === receiverId.toString()) {
            return res.status(400).json({
                success: false,
                message: 'You cannot connect with yourself'
            });
        }

        const existing = await Connection.findOne({
            $or: [
                { sender: senderId, receiver: receiverId },
                { sender: receiverId, receiver: senderId },
            ]
        });

        if (existing) {
            return res.status(400).json({
                success: true,
                message:
                    existing.status === 'accepted'
                        ? 'Already connected'
                        : 'Connection request already sent',
            });
        }

        const connection = await Connection.create({
            sender: senderId,
            receiver: receiverId,
        });

        await createNotification({
            recipient: receiverId,
            sender: senderId,
            type: 'connection_request',
            message: `${req.user.name} sent you a connection request`,
        });

        res.status(201).json({
            success: true,
            message: 'Connection request sent',
            connection,
        });


    } catch (error) {
        next(error);
    }
}




const acceptRequest = async (req, res, next) => {
    try {
        const connection = await Connection.findById(req.params.id);

        if (!connection) {
            return res.status(404).json({ success: false, message: 'Request not found' });
        }

        if (connection.receiver.toString() !== req.user._id.toString()) {
            return res.status(403).json({ success: false, message: 'Not authorized' });

        }


        connection.status = 'accepted';
        await connection.save();


        await User.findByIdAndUpdate(connection.sender, {
            $addToSet: { connections: connection.receiver },
            $inc: { connectionCount: 1 },
        });
        await User.findByIdAndUpdate(connection.receiver, {
            $addToSet: { connections: connection.sender },
            $inc: { connectionCount: 1 },
        });

        await createNotification({
            recipient: connection.sender,
            sender: connection.receiver,
            type: 'connection_accepted',
            message: `${req.user.name} accepted your connection request`,
        });

        res.status(200).json({ success: true, message: 'Connection accepted', connection });


    } catch (error) {
        next(error);

    }
}


const declineRequest = async (req, res, next) => {
    try {
        const connection = await Connection.findById(req.params.id);

        if (!connection) {
            return res.status(400).json({
                success: false,
                message: 'Request not found'
            })
        }

        if (connection.receiver.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized'
            })
        }

        connection.status = 'declined';
        await connection.save();


        res.status(200).json({ success: true, message: 'Request declined' });

    } catch (error) {
        next(error);
    }
}




const removeConnection = async (req, res, next) => {
    try {
        const otherId = req.params.id;
        const myId = req.user._id;
        const connection = await Connection.findOneAndDelete({
            $or: [
                { sender: myId, receiver: otherId },
                { sender: otherId, receiver: myId },
            ],
        });
        if (!connection) {
            return res.status(404).json({ success: false, message: 'Connection not found' });
        }
        if (connection.status === 'accepted') {
            await User.findByIdAndUpdate(myId, {
                $pull: { connections: otherId },
                $inc: { connectionCount: -1 },
            });
            await User.findByIdAndUpdate(otherId, {
                $pull: { connections: myId },
                $inc: { connectionCount: -1 },
            });
        }
        res.status(200).json({ success: true, message: 'Connection removed' });
    } catch (error) {
        next(error);
    }
};



const getPendingRequests = async (req, res, next) => {
    try {
        const requests = await Connection.find({
            receiver: req.user._id,
            status: 'pending',
        }).populate('sender', 'name headline profilePicture connectionCount');
        res.status(200).json({ success: true, requests });
    } catch (error) {
        next(error);
    }
};




const getSentRequests = async (req, res, next) => {
    try {
        const requests = await Connection.find({
            sender: req.user._id,
            status: 'pending',
        }).populate('receiver', 'name headline profilePicture connectionCount');
        res.status(200).json({ success: true, requests });
    } catch (error) {
        next(error);
    }
};



const getMyConnections = async (req, res, next) => {
    try {
        const user = await User.findById(req.user._id)
            .populate('connections', 'name headline profilePicture location connectionCount');
        res.status(200).json({ success: true, connections: user.connections });
    } catch (error) {
        next(error);
    }
};




const getConnectionStatus = async (req, res, next) => {
    try {
        const otherId = req.params.id;
        const myId = req.user._id;
        if (myId.toString() === otherId) {
            return res.status(200).json({ success: true, status: 'self' });
        }
        const connection = await Connection.findOne({
            $or: [
                { sender: myId, receiver: otherId },
                { sender: otherId, receiver: myId },
            ],
        });
        if (!connection) {
            return res.status(200).json({ success: true, status: 'none', connectionId: null });
        }
        res.status(200).json({
            success: true,
            status: connection.status,
            connectionId: connection._id,
            isSender: connection.sender.toString() === myId.toString(),
        });
    } catch (error) {
        next(error);
    }
};




const getSuggestions = async (req, res, next) => {
    try {
        const currentUser = await User.findById(req.user._id).select('connections');

        const myConnectionIds = currentUser.connections.map((id) => id.toString());

        const excludeIds = [req.user._id, ...currentUser.connections];

        const suggestions = await User.find({
            _id: { $nin: excludeIds },
        })
            .select('name headline profilePicture location connectionCount')
            .limit(8);


        res.status(200).json({ success: true, suggestions });
    } catch (error) {
        next(error);
    }
};
module.exports = {
    sendRequest,
    acceptRequest,
    declineRequest,
    removeConnection,
    getPendingRequests,
    getSentRequests,
    getMyConnections,
    getConnectionStatus,
    getSuggestions,
};