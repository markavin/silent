const express = require('express');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const axios = require('axios');
const bodyParser = require('body-parser');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ 
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/bmp'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only JPEG, PNG, and BMP are allowed.'));
        }
    }
});

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

// Set EJS as template engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Routes
app.get('/', (req, res) => {
    res.render('index', { 
        title: 'SILENT - Sign Language Recognition',
        apiUrl: API_BASE_URL
    });
});

// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        service: 'SILENT Frontend',
        timestamp: new Date().toISOString(),
        port: PORT
    });
});

// API proxy endpoints
app.get('/api/health', async (req, res) => {
    try {
        const response = await axios.get(`${API_BASE_URL}/health`);
        res.json(response.data);
    } catch (error) {
        res.status(500).json({
            error: 'Backend API not available',
            message: error.message
        });
    }
});

app.get('/api/models', async (req, res) => {
    try {
        const response = await axios.get(`${API_BASE_URL}/models`);
        res.json(response.data);
    } catch (error) {
        res.status(500).json({
            error: 'Failed to get model info',
            message: error.message
        });
    }
});

// Prediction endpoint
app.post('/api/predict', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: 'No image file provided'
            });
        }

        const { dataset_type } = req.body;

        // Create form data for backend API
        const FormData = require('form-data');
        const formData = new FormData();
        
        formData.append('image', req.file.buffer, {
            filename: req.file.originalname,
            contentType: req.file.mimetype
        });
        
        if (dataset_type) {
            formData.append('dataset_type', dataset_type);
        }

        // Send to backend API
        const response = await axios.post(`${API_BASE_URL}/predict`, formData, {
            headers: {
                ...formData.getHeaders(),
                'Content-Length': formData.getLengthSync()
            },
            timeout: 30000 // 30 second timeout
        });

        res.json(response.data);

    } catch (error) {
        console.error('Prediction error:', error.message);
        
        if (error.response) {
            res.status(error.response.status).json(error.response.data);
        } else {
            res.status(500).json({
                success: false,
                error: 'Failed to process prediction',
                message: error.message
            });
        }
    }
});

// Batch prediction endpoint
app.post('/api/predict/batch', upload.array('images', 10), async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'No image files provided'
            });
        }

        const { dataset_type } = req.body;

        // Create form data for backend API
        const FormData = require('form-data');
        const formData = new FormData();
        
        // Add all files
        req.files.forEach(file => {
            formData.append('images', file.buffer, {
                filename: file.originalname,
                contentType: file.mimetype
            });
        });
        
        if (dataset_type) {
            formData.append('dataset_type', dataset_type);
        }

        // Send to backend API
        const response = await axios.post(`${API_BASE_URL}/predict/batch`, formData, {
            headers: {
                ...formData.getHeaders(),
                'Content-Length': formData.getLengthSync()
            },
            timeout: 60000 // 60 second timeout for batch
        });

        res.json(response.data);

    } catch (error) {
        console.error('Batch prediction error:', error.message);
        
        if (error.response) {
            res.status(error.response.status).json(error.response.data);
        } else {
            res.status(500).json({
                success: false,
                error: 'Failed to process batch prediction',
                message: error.message
            });
        }
    }
});

// Load model endpoint
app.post('/api/load_model/:dataset_type', async (req, res) => {
    try {
        const { dataset_type } = req.params;
        
        const response = await axios.post(`${API_BASE_URL}/load_model/${dataset_type}`);
        res.json(response.data);

    } catch (error) {
        console.error('Load model error:', error.message);
        
        if (error.response) {
            res.status(error.response.status).json(error.response.data);
        } else {
            res.status(500).json({
                success: false,
                error: 'Failed to load model',
                message: error.message
            });
        }
    }
});

// Error handling middleware
app.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                success: false,
                error: 'File too large. Maximum size is 10MB.'
            });
        }
    }
    
    console.error('Server error:', error);
    res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: 'Endpoint not found'
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 SILENT Frontend Server running on http://localhost:${PORT}`);
    console.log(`🔧 Backend API: ${API_BASE_URL}`);
    console.log(`📁 Static files: ${path.join(__dirname, 'public')}`);
    console.log(`📄 Templates: ${path.join(__dirname, 'views')}`);
});