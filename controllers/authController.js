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


const googleLogin = async (req, res, next) => {
    try {
        const { idToken } = req.body;
        if (!idToken) {
            return res.status(400).json({ success: false, message: "ID Token is required" });
        }

        let payload;
        if (idToken.startsWith("mock-google-token-")) {
            // Simulated login for development testing
            try {
                const base64Data = idToken.replace("mock-google-token-", "");
                const jsonStr = Buffer.from(base64Data, 'base64').toString('utf-8');
                payload = JSON.parse(jsonStr);
            } catch (err) {
                return res.status(400).json({ success: false, message: "Invalid mock Google token format" });
            }
        } else {
            // Verify with Google tokeninfo endpoint
            const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`);
            payload = await response.json();
            if (payload.error || !payload.email) {
                return res.status(400).json({
                    success: false,
                    message: payload.error_description || "Invalid Google ID Token",
                });
            }
        }

        // Check if user exists
        let user = await User.findOne({ email: payload.email });

        if (!user) {
            // Generate a random password for Google-registered users
            const randomPassword = Math.random().toString(36).slice(-10) + Math.random().toString(36).slice(-10);
            user = await User.create({
                name: payload.name || payload.given_name || "Google User",
                email: payload.email,
                password: randomPassword,
                profilePicture: payload.picture || "",
                headline: "Verified Professional",
            });
        }

        const token = generateToken(user._id);

        res.status(200).json({
            success: true,
            message: 'Google login successful',
            token,
            user: {
                _id: user._id,
                name: user.name,
                email: user.email,
                headline: user.headline,
                profilePicture: user.profilePicture,
                connectionCount: user.connectionCount,
            }
        });
    } catch (error) {
        console.error('GOOGLE LOGIN ERROR:', error);
        next(error);
    }
};


module.exports = { register, login, getMe, googleLogin };

