const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const dotenv = require('dotenv');


dotenv.config();

const connectDB = require('./config/DB.JS');
const errorHandler = require('./middleware/errorHandler');


const authRoutes = require('./routes/authRoutes');


const app = express();

connectDB();

app.use(helmet());

app.use(cors({
    origin: process.env.NODE_ENV === 'production'
        ? 'https://your-frontend-domain.vercel.app'
        : 'http://localhost:3000',
    credentials: true,
}));


const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: {
        success: false,
        message: 'Too many requests from this IP'
    },

});

app.use('/api', limiter);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false }));

if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
}

app.use('/api/auth', authRoutes);



app.get('/', (req, res) => {
    res.json({
        success: true,
        message: '🚀 Nexus API is running',
        version: '1.0.0',
    });
});


app.use('/{*any}', (req, res) => {
    res.status(404).json({
        success: false,
        message: `Route ${req.originalUrl} not found`,
    });
});


app.use(errorHandler);


const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT} in ${process.env.NODE_ENV} mode`);
});