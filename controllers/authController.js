const User = require("../models/User");
const generateToken = require("../utils/generateToken");
const { validationResult } = require('express-validator');


const register = async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array(),
            });
        }

        const { name, email, password } = req.body;
        const existingUser = await User.findOne({ email }).select("+password");

        if (existingUser) {
            return res.status(400).json({
                success: false,
                error: "User already exists",
            });
        }

        const user = await User.create({ name, email, password });

        const token = generateToken(user._id);

        res.status(201).json({
            success: true,
            message: 'Account created successfully',
            token,
            user: {
                _id: user._id,
                name: user.name,
                email: user.email,
                headline: user.headline,
                profilePicture: user.profilePicture,
                connectionCount: user.connectionCount,
            },
        });
    } catch (error) {
        console.error('REGISTER ERROR:', error.name, '|', error.message);
        next(error);
    }
};




const login = async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        const { email, password } = req.body;

        const user = await User.findOne({ email }).select('+password');

        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Invalid Email or Password"
            });
        }

        const isPasswordMatch = await user.comparePassword(password);

        if (!isPasswordMatch) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password',
            });
        }

        const token = generateToken(user._id);

        res.status(200).json({
            success: true,
            message: 'Login successful',
            token,
            user: {
                _id: user._id,
                name: user.name,
                email: user.email,
                headline: user.headline,
                profilePicture: user.profilePicture,
                connectionCount: user.connectionCount,
            }
        })

    } catch (error) {
        next(error);
    }
}



const getMe = async (req, res, next) => {
    try {
        const user = await User.findById(req.user._id);
        res.status(200).json({
            success: true,
            user,
        });
    } catch (error) {
        next(error);
    }
};


module.exports = { register, login, getMe };

