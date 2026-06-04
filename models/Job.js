const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Please add a job title'],
        trim: true,
    },
    company: {
        type: String,
        required: [true, 'Please add a company name'],
    },
    location: {
        type: String,
        required: [true, 'Please add a location'],
    },
    description: {
        type: String,
        required: [true, 'Please add a job description'],
    },
    requirements: {
        type: [String],
        default: [],
    },
    salary: {
        type: String,
    },
    jobType: {
        type: String,
        enum: ['Full-time', 'Part-time', 'Contract', 'Internship'],
        default: 'Full-time'
    },
    workplaceType: {
        type: String,
        enum: ['On-site', 'Hybrid', 'Remote'],
        default: 'On-site'
    },
    postedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    applicants: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        appliedAt: {
            type: Date,
            default: Date.now
        }
    }]
}, {
    timestamps: true
});

module.exports = mongoose.model('Job', jobSchema);
