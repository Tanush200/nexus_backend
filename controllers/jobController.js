const Job = require('../models/Job');

exports.getJobs = async (req, res) => {
    try {
        const jobs = await Job.find().sort({ createdAt: -1 })
            .populate('postedBy', 'name profilePicture headline')
            .populate('applicants.user', 'name profilePicture headline');
        res.status(200).json({ success: true, count: jobs.length, data: jobs });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

exports.getJob = async (req, res) => {
    try {
        const job = await Job.findById(req.params.id)
            .populate('postedBy', 'name profilePicture headline')
            .populate('applicants.user', 'name profilePicture headline');
        if (!job) {
            return res.status(404).json({ success: false, message: 'Job not found' });
        }
        res.status(200).json({ success: true, data: job });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

exports.createJob = async (req, res) => {
    try {
        req.body.postedBy = req.user._id;
        const job = await Job.create(req.body);
        res.status(201).json({ success: true, data: job });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

exports.applyJob = async (req, res) => {
    try {
        const job = await Job.findById(req.params.id);
        if (!job) {
            return res.status(404).json({ success: false, message: 'Job not found' });
        }
        
        // Check if already applied
        const isApplied = job.applicants.some(applicant => applicant.user.toString() === req.user._id.toString());
        if (isApplied) {
            return res.status(400).json({ success: false, message: 'Already applied to this job' });
        }
        
        job.applicants.push({ user: req.user._id });
        await job.save();
        
        res.status(200).json({ success: true, message: 'Successfully applied to job' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};
