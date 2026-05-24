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


module.exports = {
    getUserProfile,
    updateProfile,
    addExperience,
    deleteExperience,
    addEducation,
    deleteEducation,
    searchUsers,
};