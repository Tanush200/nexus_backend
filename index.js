const express = require('express');
const http = require('http');          // WHY: Socket.io needs raw http server, not just Express
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const dotenv = require('dotenv');

dotenv.config();

const connectDB = require('./config/DB.JS');
const errorHandler = require('./middleware/errorHandler');

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const postRoutes = require('./routes/postRoutes');
const connectionRoutes = require('./routes/connectionRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const messageRoutes = require('./routes/messageRoutes');
const jobRoutes = require('./routes/jobRoutes');

const app = express();

const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: process.env.NODE_ENV === 'production'
            ? 'https://your-frontend-domain.vercel.app'
            : 'http://localhost:3000',
        credentials: true,
    },
});

connectDB();

app.use(helmet());
app.use(cors({
    origin: process.env.NODE_ENV === 'production'
        ? 'https://your-frontend-domain.vercel.app'
        : 'http://localhost:3000',
    credentials: true,
}));

const limiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 1000,
    message: { success: false, message: 'Too many requests from this IP' },
});

app.use('/api', limiter);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false }));

if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
}

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/connections', connectionRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/jobs', jobRoutes);

app.get('/', (req, res) => {
    res.json({ success: true, message: '🚀 Nexus API is running', version: '1.0.0' });
});

app.use('/{*any}', (req, res) => {
    res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` });
});

app.use(errorHandler);



const onlineUsers = new Map();

io.on('connection', (socket) => {
    console.log(`🔌 Socket connected: ${socket.id}`);

    socket.on('user:online', (userId) => {
        onlineUsers.set(userId, socket.id);
        socket.broadcast.emit('user:status', { userId, online: true });
        console.log(`✅ User online: ${userId}`);
    });


    socket.on('message:send', async (data) => {
        const { receiverId, conversationId, content, senderId, senderName, senderPicture } = data;

        const Message = require('./models/Message');
        const Conversation = require('./models/Conversation');

        try {
            const message = await Message.create({
                conversation: conversationId,
                sender: senderId,
                content,
            });

            await Conversation.findByIdAndUpdate(conversationId, {
                lastMessage: message._id,
                $inc: { [`unreadCounts.${receiverId}`]: 1 },
                updatedAt: new Date(),
            });

            const payload = {
                _id: message._id,
                conversation: conversationId,
                sender: { _id: senderId, name: senderName, profilePicture: senderPicture },
                content,
                isRead: false,
                createdAt: message.createdAt,
            };

            const receiverSocketId = onlineUsers.get(receiverId);
            if (receiverSocketId) {
                io.to(receiverSocketId).emit('message:receive', payload);
            }
            socket.emit('message:sent', payload);

        } catch (err) {
            socket.emit('message:error', { error: err.message });
        }
    });

    socket.on('typing:start', ({ receiverId, senderName }) => {
        const receiverSocketId = onlineUsers.get(receiverId);
        if (receiverSocketId) {
            io.to(receiverSocketId).emit('typing:start', { senderName });
        }
    });

    socket.on('typing:stop', ({ receiverId }) => {
        const receiverSocketId = onlineUsers.get(receiverId);
        if (receiverSocketId) {
            io.to(receiverSocketId).emit('typing:stop');
        }
    });

    socket.on('messages:read', ({ conversationId, senderId }) => {
        const senderSocketId = onlineUsers.get(senderId);
        if (senderSocketId) {
            io.to(senderSocketId).emit('messages:read', { conversationId });
        }
    });

    socket.on('disconnect', () => {
        for (const [userId, socketId] of onlineUsers.entries()) {
            if (socketId === socket.id) {
                onlineUsers.delete(userId);
                socket.broadcast.emit('user:status', { userId, online: false });
                console.log(`❌ User offline: ${userId}`);
                break;
            }
        }
    });
});



const PORT = process.env.PORT || 5000;


server.listen(PORT, () => {
    console.log(`🚀 Server + Socket.io running on port ${PORT} in ${process.env.NODE_ENV} mode`);
});