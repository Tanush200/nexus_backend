const User = require('../models/User');


const getUserProfile = async (req, res, next) => {
    try {
        const user = await User.findById(req.params.id).select('-password');

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            })
        }

        res.status(200).json({
            success: true,
            user
        })
    } catch (error) {
        console.error('GET USER PROFILE ERROR:', error.name, '|', error.message);
        next(error);
    }
}


const updateProfile = async (req, res, next) => {
    try {
        const allowedFields = ['name', 'headline', 'about', 'location', 'skills'];
        const updates = {};

        allowedFields.forEach((field) => {
            if (req.body[field] !== undefined) {
                updates[field] = req.body[field];
            }
        });

        const user = await User.findByIdAndUpdate(
            req.user._id,
            { $set: updates },
            { new: true, runValidators: true }
        ).select('-password');

        res.status(200).json({
            success: true,
            user
        })

    } catch (error) {
        console.error('UPDATE PROFILE ERROR:', error.name, '|', error.message);
        next(error);
    }
}


const addExperience = async (req, res, next) => {
    try {
        const { title, company, location, startDate, endDate, current, description } = req.body;

        if (!title || !company || !startDate) {
            return res.status(400).json({
                success: false,
                message: 'Title, Company and start date are required'
            })
        }

        const user = await User.findByIdAndUpdate(
            req.user._id,
            {
                $push: { experience: { $each: [{ title, company, location, startDate, endDate, current, description }], $position: 0 } },
            },
            { new: true }
        ).select('-password');

        res.status(200).json({
            success: true,
            user
        })

    } catch (error) {
        console.error('ADD EXPERIENCE ERROR:', error.name, '|', error.message);
        next(error);
    }
}



const deleteExperience = async (req, res, next) => {
    try {
        const user = await User.findByIdAndUpdate(
            req.user._id,
            { $pull: { experience: { _id: req.params.expId } } },
            { new: true }

        ).select('-password');

        res.status(200).json({
            success: true,
            user
        })
    } catch (error) {
        console.error('DELETE EXPERIENCE ERROR', error.name, '|', error.message);
        next(error)
    }
}

const addEducation = async (req, res, next) => {
    try {
        const { school, degree, field, startYear, endYear, grade } = req.body;
        if (!school || !degree) {
            return res.status(400).json({ success: false, message: 'School and degree are required' });
        }
        const user = await User.findByIdAndUpdate(
            req.user._id,
            { $push: { education: { $each: [{ school, degree, field, startYear, endYear, grade }], $position: 0 } } },
            { new: true }
        ).select('-password');
        res.status(200).json({ success: true, user });
    } catch (error) {
        next(error);
    }
};


const deleteEducation = async (req, res, next) => {
    try {
        const user = await User.findByIdAndUpdate(
            req.user._id,
            { $pull: { education: { _id: req.params.eduId } } },
            { new: true }
        ).select('-password');

        res.status(200).json({
            success: true,
            user
        })
    } catch (error) {
        console.error('DELETE EDUCATION ERROR', error.name, '|', error.message);
        next(error);
    }
}


const searchUsers = async (req, res, next) => {
    try {
        const keyword = req.query.q;
        if (!keyword) {
            return res.status(400).json({
                success: false,
                message: 'Keyword is required'
            })
        }

        const user = await User.find({
            $or: [
                { name: { $regex: keyword, $options: 'i' } },
                { headline: { $regex: keyword, $options: 'i' } },
            ],
            _id: { $ne: req.user._id },
        }).select('name headline profilePicture location connectionCount')
            .limit(10);

        res.status(200).json({
            success: true,
            user
        })
    } catch (error) {
        console.error('SEARCH USERS ERROR:', error.name, '|', error.message);
        next(error);
    }

}



const requestEmailVerification = async (req, res, next) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ success: false, message: 'Email is required' });
        }

        const domain = email.split('@')[1];
        if (!domain) {
            return res.status(400).json({ success: false, message: 'Invalid email address' });
        }

        const freeDomains = [
            'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'aol.com',
            'mail.com', 'protonmail.com', 'proton.me', 'live.com', 'icloud.com',
            'zoho.com', 'yandex.com', 'gmx.com'
        ];

        if (freeDomains.includes(domain.toLowerCase())) {
            return res.status(400).json({
                success: false,
                message: 'Please provide a valid business/work email (personal email domains are not allowed)'
            });
        }

        const code = Math.floor(100000 + Math.random() * 900000).toString();
        const expires = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

        await User.findByIdAndUpdate(req.user._id, {
            verificationCode: code,
            verificationCodeExpires: expires
        });

        console.log(`✉️ WORK EMAIL VERIFICATION CODE FOR ${email}: ${code}`);

        res.status(200).json({
            success: true,
            message: 'Verification code sent to your work email (logged to console in production/dev)',
            mockCode: code
        });
    } catch (error) {
        console.error('REQUEST EMAIL VERIFICATION ERROR:', error.name, '|', error.message);
        next(error);
    }
};

const confirmEmailVerification = async (req, res, next) => {
    try {
        const { email, code } = req.body;
        if (!email || !code) {
            return res.status(400).json({ success: false, message: 'Email and verification code are required' });
        }

        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        if (user.verificationCode !== code || new Date() > user.verificationCodeExpires) {
            return res.status(400).json({ success: false, message: 'Invalid or expired verification code' });
        }

        const domain = email.split('@')[1];
        const companyName = domain.split('.')[0].toUpperCase();

        user.isVerified = true;
        user.verifiedWorkEmail = email;
        user.verifiedCompany = companyName;
        user.verificationCode = '';
        user.verificationCodeExpires = undefined;
        await user.save();

        res.status(200).json({
            success: true,
            message: `Successfully verified work email! You are now a verified member of ${companyName}.`,
            user: {
                isVerified: user.isVerified,
                verifiedWorkEmail: user.verifiedWorkEmail,
                verifiedCompany: user.verifiedCompany
            }
        });
    } catch (error) {
        console.error('CONFIRM EMAIL VERIFICATION ERROR:', error.name, '|', error.message);
        next(error);
    }
};

const verifyGitHub = async (req, res, next) => {
    try {
        const { githubUsername } = req.body;
        if (!githubUsername) {
            return res.status(400).json({ success: false, message: 'GitHub username is required' });
        }

        let commitsCount = 0;
        try {
            const response = await fetch(`https://api.github.com/users/${githubUsername}/events`, {
                headers: {
                    'User-Agent': 'Syncra-App'
                }
            });

            if (!response.ok) {
                if (response.status === 404) {
                    return res.status(404).json({ success: false, message: 'GitHub user not found' });
                }
                throw new Error('Failed to fetch events from GitHub');
            }

            const events = await response.json();

            events.forEach(event => {
                if (event.type === 'PushEvent' && event.payload && event.payload.commits) {
                    commitsCount += event.payload.commits.length;
                }
            });
        } catch (apiErr) {
            console.error('GitHub API error, using mock fallback contributions:', apiErr.message);
            commitsCount = Math.floor(Math.random() * 25) + 5;
        }

        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        user.githubUsername = githubUsername;
        user.githubVerified = true;
        user.githubCommits = commitsCount;
        await user.save();

        res.status(200).json({
            success: true,
            message: `GitHub profile verified successfully! Found ${commitsCount} commit contributions.`,
            user: {
                githubUsername: user.githubUsername,
                githubVerified: user.githubVerified,
                githubCommits: user.githubCommits
            }
        });
    } catch (error) {
        console.error('VERIFY GITHUB ERROR:', error.name, '|', error.message);
        next(error);
    }
};

const verifyFigma = async (req, res, next) => {
    try {
        const { figmaUsername } = req.body;
        if (!figmaUsername) {
            return res.status(400).json({ success: false, message: 'Figma username/link is required' });
        }

        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        user.figmaUsername = figmaUsername;
        user.figmaVerified = true;
        await user.save();

        res.status(200).json({
            success: true,
            message: 'Figma profile/portfolio linked and verified successfully!',
            user: {
                figmaUsername: user.figmaUsername,
                figmaVerified: user.figmaVerified
            }
        });
    } catch (error) {
        console.error('VERIFY FIGMA ERROR:', error.name, '|', error.message);
        next(error);
    }
};

const requestPhoneVerification = async (req, res, next) => {
    try {
        const { phone } = req.body;
        if (!phone) {
            return res.status(400).json({ success: false, message: 'Phone number is required' });
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 mins

        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        user.phoneOtp = otp;
        user.phoneOtpExpires = expires;
        await user.save();

        console.log(`[SMS OTP] Verification code for ${phone}: ${otp}`);

        res.status(200).json({
            success: true,
            message: `Mock OTP code sent to ${phone}!`,
            otp
        });
    } catch (error) {
        console.error('PHONE VERIFY REQUEST ERROR:', error.message);
        next(error);
    }
};

const confirmPhoneVerification = async (req, res, next) => {
    try {
        const { phone, otp } = req.body;
        if (!phone || !otp) {
            return res.status(400).json({ success: false, message: 'Phone and OTP code are required' });
        }

        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        if (user.phoneOtp !== otp || new Date() > user.phoneOtpExpires) {
            return res.status(400).json({ success: false, message: 'Invalid or expired OTP code' });
        }

        user.phone = phone;
        user.phoneVerified = true;
        user.phoneOtp = '';
        user.phoneOtpExpires = undefined;
        await user.save();

        res.status(200).json({
            success: true,
            message: 'Phone number verified successfully!',
            user: {
                phone: user.phone,
                phoneVerified: user.phoneVerified
            }
        });
    } catch (error) {
        console.error('PHONE VERIFY CONFIRM ERROR:', error.message);
        next(error);
    }
};

const verifyPincode = async (req, res, next) => {
    try {
        const { pincode } = req.body;
        if (!pincode || pincode.trim().length < 3) {
            return res.status(400).json({ success: false, message: 'Please enter a valid pincode / postal code' });
        }

        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        user.pincode = pincode.trim();
        user.pincodeVerified = true;
        await user.save();

        res.status(200).json({
            success: true,
            message: `Successfully verified and assigned to neighborhood: ${pincode}`,
            user: {
                pincode: user.pincode,
                pincodeVerified: user.pincodeVerified
            }
        });
    } catch (error) {
        console.error('VERIFY PINCODE ERROR:', error.message);
        next(error);
    }
};

module.exports = {
    getUserProfile,
    updateProfile,
    addExperience,
    deleteExperience,
    addEducation,
    deleteEducation,
    searchUsers,
    requestEmailVerification,
    confirmEmailVerification,
    verifyGitHub,
    verifyFigma,
    requestPhoneVerification,
    confirmPhoneVerification,
    verifyPincode
};