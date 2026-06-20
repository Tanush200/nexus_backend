const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
    author: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },

    content: {
        type: String,
        required: false,
        maxlength: [3000, 'Post is too long']
    },

    image: {
        type: String,
        default: ''
    },

    likes: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        }
    ],

    comments: [
        {
            user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
            text: { type: String, required: true, maxlength: 1000 },
            createdAt: { type: Date, default: Date.now },
        }
    ]
}, { timestamps: true })

module.exports = mongoose.model('Post', postSchema);