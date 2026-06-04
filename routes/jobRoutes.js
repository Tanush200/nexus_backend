const express = require('express');
const { getJobs, getJob, createJob, applyJob } = require('../controllers/jobController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.route('/')
    .get(protect, getJobs)
    .post(protect, createJob);

router.route('/:id')
    .get(protect, getJob);

router.route('/:id/apply')
    .post(protect, applyJob);

module.exports = router;
