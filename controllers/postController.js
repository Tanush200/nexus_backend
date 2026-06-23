const User = require('../models/User');
const Post = require('../models/Post');
const { createNotification } = require('./notificationController');
const ImageKit = require('imagekit');

let imagekit = null;
if (process.env.IMAGEKIT_PUBLIC_KEY && 
    process.env.IMAGEKIT_PRIVATE_KEY && 
    process.env.IMAGEKIT_URL_ENDPOINT && 
    process.env.IMAGEKIT_PUBLIC_KEY !== 'your_imagekit_public_key' &&
    process.env.IMAGEKIT_PUBLIC_KEY.trim() !== '') {
    imagekit = new ImageKit({
        publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
        privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
        urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT
    });
}

const getImageKitAuth = async (req, res, next) => {
    try {
        if (!imagekit) {
            return res.status(400).json({ success: false, message: 'ImageKit is not configured' });
        }
        const authenticationParameters = imagekit.getAuthenticationParameters();
        res.status(200).json(authenticationParameters);
    } catch (error) {
        console.error('IMAGEKIT AUTH ERROR:', error.name, '|', error.message);
        next(error);
    }
};

const createPost = async (req, res, next) => {
    try {
        const { content, image, postType, lostFoundStatus, lostFoundLocation, lostFoundItem } = req.body;
        if (!content?.trim() && !image) {
            return res.status(400).json({ success: false, message: 'Post content or image is required' });
        }

        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        let pincode = '';
        if (postType === 'neighborhood' || postType === 'lost_found') {
            if (!user.pincodeVerified || !user.pincode) {
                return res.status(403).json({
                    success: false,
                    message: 'You must verify your neighborhood pincode before posting here.'
                });
            }
            pincode = user.pincode;
        }

        const post = await Post.create({
            author: req.user._id,
            content: content || '',
            image: image || '',
            postType: postType || 'general',
            pincode,
            lostFoundStatus,
            lostFoundLocation,
            lostFoundItem
        });

        await post.populate('author', 'name headline profilePicture pincode');

        res.status(201).json({
            success: true,
            post,
        });
    } catch (error) {
        console.error('CREATE POST ERROR:', error.name, '|', error.message);
        next(error);
    }
};


const getFeedPosts = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const currentUser = await User.findById(req.user._id).select('connections');
        const connectionIds = currentUser.connections;

        const authorIds = [...connectionIds, req.user._id];

        const query = {
            author: { $in: authorIds },
            postType: { $in: ['general', undefined] }
        };

        const posts = await Post.find(query).populate('author', 'name headline profilePicture')
            .populate('comments.user', 'name profilePicture')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);


        const totalPosts = await Post.countDocuments(query);

        res.status(200).json({
            success: true,
            posts,
            pagination: {
                currentPage: page,
                totalPages: Math.ceil(totalPosts / limit),
                totalPosts,
                hasMore: page < Math.ceil(totalPosts / limit),
            },
        });

    } catch (error) {
        console.error('GET FEED POSTS ERROR:', error.name, '|', error.message);
        next(error);
    }

}


const getUserPosts = async (req, res, next) => {
    try {
        const posts = await Post.find({ author: req.params.userId }).populate('author', 'name headline profilePicture').sort({ createdAt: -1 })
        res.status(200).json({
            success: true,
            posts
        })
    } catch (error) {
        console.error('GET USER POSTS ERROR', error.name, '|', error.message);
        next(error);
    }
}



const likePost = async (req, res, next) => {
    try {
        const post = await Post.findById(req.params.id);

        if (!post) {
            return res.status(404).json({ success: false, message: 'Post not found' });
        }

        const userId = req.user._id;

        const isLiked = post.likes.some((id) => id.toString() === userId.toString());

        const update = isLiked
            ? { $pull: { likes: userId } }
            : { $addToSet: { likes: userId } };

        const updatedPost = await Post.findByIdAndUpdate(
            req.params.id,
            update,
            { new: true }
        );

        if (!isLiked) {
            await createNotification({
                recipient: post.author,
                sender: userId,
                type: 'like',
                post: post._id,
                message: `${req.user.name} liked your post`,
            });
        }

        res.status(200).json({
            success: true,
            liked: !isLiked,
            likesCount: updatedPost.likes.length,
        });

    } catch (error) {
        console.error('LIKE POST ERROR:', error.name, '|', error.message);
        next(error);
    }
};





const addComment = async (req, res, next) => {
    try {
        const { text } = req.body;
        if (!text?.trim()) {
            return res.status(400).json({ success: false, message: 'Comment text required' });
        }

        const post = await Post.findById(req.params.id);
        if (!post) {
            return res.status(404).json({ success: false, message: 'Post not found' });
        }

        const newComment = { user: req.user._id, text, createdAt: new Date() };

        post.comments.push(newComment);

        await post.save();

        await createNotification({
            recipient: post.author,
            sender: req.user._id,
            type: 'comment',
            post: post._id,
            message: `${req.user.name} commented: "${text.slice(0, 60)}${text.length > 60 ? '...' : ''}"`,
        });

        await post.populate('comments.user', 'name profilePicture');

        const addedComment = post.comments[post.comments.length - 1];
        res.status(201).json({ success: true, comment: addedComment });
    } catch (error) {
        console.error('ADD COMMENT ERROR:', error.name, '|', error.message);
        next(error);
    }
};



const getNeighborhoodFeed = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const user = await User.findById(req.user._id);
        if (!user || !user.pincodeVerified || !user.pincode) {
            return res.status(403).json({
                success: false,
                message: 'You must verify your pincode to access the neighborhood feed.'
            });
        }

        const query = {
            pincode: user.pincode,
            postType: req.query.type ? req.query.type : { $in: ['neighborhood', 'lost_found'] }
        };

        const posts = await Post.find(query)
            .populate('author', 'name headline profilePicture pincode')
            .populate('comments.user', 'name profilePicture')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const totalPosts = await Post.countDocuments(query);

        res.status(200).json({
            success: true,
            posts,
            pagination: {
                currentPage: page,
                totalPages: Math.ceil(totalPosts / limit),
                totalPosts,
                hasMore: page < Math.ceil(totalPosts / limit),
            },
        });
    } catch (error) {
        console.error('GET NEIGHBORHOOD FEED ERROR:', error.message);
        next(error);
    }
};

const deletePost = async (req, res, next) => {
    try {
        const post = await Post.findById(req.params.id);
        if (!post) {
            return res.status(404).json({ success: false, message: 'Post not found' });
        }
        if (post.author.toString() !== req.user._id.toString()) {
            return res.status(403).json({ success: false, message: 'Not authorized to delete this post' });
        }
        await Post.findByIdAndDelete(req.params.id);
        res.status(200).json({ success: true, message: 'Post deleted' });
    } catch (error) {
        console.error('DELETE POST ERROR:', error.name, '|', error.message);
        next(error);
    }
};

module.exports = { 
    createPost, 
    getFeedPosts, 
    getUserPosts, 
    likePost, 
    addComment, 
    deletePost, 
    getImageKitAuth,
    getNeighborhoodFeed
};