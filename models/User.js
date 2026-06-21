const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');


const userSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'Name is required'],
            trim: true,
            minlength: [2, 'Name must be at least 2 characters'],
            maxlength: [50, 'Name cannot exceed 50 characters'],
        },
        email: {
            type: String,
            required: [true, 'Email is required'],
            unique: true,
            lowercase: true,
            trim: true,
            match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email'],
        },
        password: {
            type: String,
            required: [true, 'Password is required'],
            minlength: [6, 'Password must be at least 6 characters'],
            select: false,
        },
        headline: {
            type: String,
            default: '',
            maxlength: [220, 'Headline too long'],
        },
        about: {
            type: String,
            default: '',
            maxlength: [2600, 'About section too long'],
        },
        location: {
            type: String,
            default: '',
        },
        profilePicture: {
            type: String,
            default: '',
        },
        coverImage: {
            type: String,
            default: '',
        },
        skills: [
            {
                type: String,
                trim: true,
            },
        ],
        experience: [
            {
                title: { type: String, required: true },
                company: { type: String, required: true },
                location: { type: String, default: '' },
                startDate: { type: Date, required: true },
                endDate: { type: Date },
                current: { type: Boolean, default: false },
                description: { type: String, default: '' },
            },
        ],
        education: [
            {
                school: { type: String, required: true },
                degree: { type: String, required: true },
                field: { type: String, default: '' },
                startYear: { type: Number },
                endYear: { type: Number },
                grade: { type: String, default: '' },
            },
        ],
        connections: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User',
            },
        ],
        connectionCount: {
            type: Number,
            default: 0,
        },
        isProfileComplete: {
            type: Boolean,
            default: false,
        },
        isVerified: {
            type: Boolean,
            default: false,
        },
        verifiedWorkEmail: {
            type: String,
            default: '',
        },
        verifiedCompany: {
            type: String,
            default: '',
        },
        githubUsername: {
            type: String,
            default: '',
        },
        githubVerified: {
            type: Boolean,
            default: false,
        },
        githubCommits: {
            type: Number,
            default: 0,
        },
        figmaUsername: {
            type: String,
            default: '',
        },
        figmaVerified: {
            type: Boolean,
            default: false,
        },
        verificationCode: {
            type: String,
            default: '',
        },
        verificationCodeExpires: {
            type: Date,
        },
    },
    {

        timestamps: true,
    }
);

userSchema.pre('save', async function () {
    if (!this.isModified('password')) return;
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});



userSchema.methods.comparePassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
}

const User = mongoose.model('User', userSchema);

module.exports = User;