require('dotenv').config();
const http = require('http');
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');

const { connectDB } = require('./utils/db');
const { initSocket } = require('./utils/socket');
const { errorHandler } = require('./middleware/errorHandler');

// Route imports
const authRoutes = require('./routes/authRoutes');
const touristRoutes = require('./routes/touristRoutes');
const locationRoutes = require('./routes/locationRoutes');
const riskZoneRoutes = require('./routes/riskZoneRoutes');
const sosRoutes = require('./routes/sosRoutes');
const incidentRoutes = require('./routes/incidentRoutes');
const authorityRoutes = require('./routes/authorityRoutes');
const safetyRoutes = require('./routes/safetyRoutes');

const app = express();
const httpServer = http.createServer(app);

// Initialize Socket.IO
const io = initSocket(httpServer);

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

const fs = require('fs');
const frontendDist = path.join(__dirname, 'frontend', 'dist');

// Serve uploaded media, React frontend dist, and command center portal
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
}
app.use('/portal', express.static(path.join(__dirname, 'public')));

// Portal route: interactive developer / judge command center
app.get('/portal', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Dedicated health endpoints
app.get(['/health', '/api/health'], (req, res) => {
  res.status(200).json({
    status: 'ONLINE',
    service: 'Tourist Safety Platform Backend API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    features: {
      digitalTouristID: 'ACTIVE',
      geospatialGeofencing: 'ACTIVE',
      realTimeEmergencySOS: 'ACTIVE',
      aiIncidentClustering: 'ACTIVE',
      aiEmergencyTextClassifier: 'ACTIVE'
    },
    documentation: '/README.md'
  });
});

// Helper function to mount routes both with and without '/api' prefix
const mountRoute = (routePath, router) => {
  app.use(routePath, router);
  app.use(`/api${routePath}`, router);
};

// Mount Application Routes
mountRoute('/auth', authRoutes);
mountRoute('/tourist', touristRoutes);
mountRoute('/location', locationRoutes);
mountRoute('/risk-zones', riskZoneRoutes);
mountRoute('/sos', sosRoutes);
mountRoute('/incidents', incidentRoutes);
mountRoute('/authority', authorityRoutes);
mountRoute('/safety', safetyRoutes);

// Inter-service verification contract endpoint for Authority backend
const { verifyDigitalId } = require('./controllers/digitalIdController');
app.post(['/verify/scan', '/api/verify/scan'], verifyDigitalId);

// Admin risk zone management endpoint (Feature 5)
const { createRiskZone } = require('./controllers/riskZoneController');
const { optionalAuth } = require('./middleware/auth');
app.post(['/admin/risk-zones', '/api/admin/risk-zones'], optionalAuth, createRiskZone);

// Catch-all: SPA fallback for web app or 404 for API endpoints
app.use('*', (req, res) => {
  if (req.method === 'GET' && !req.originalUrl.startsWith('/api') && !req.originalUrl.startsWith('/uploads')) {
    const spaIndex = path.join(frontendDist, 'index.html');
    if (fs.existsSync(spaIndex)) {
      return res.sendFile(spaIndex);
    }
    return res.sendFile(path.join(__dirname, 'public', 'index.html'));
  }

  res.status(404).json({
    error: {
      message: `Route not found: ${req.method} ${req.originalUrl}`,
      code: 'ROUTE_NOT_FOUND'
    }
  });
});

// Centralized error handling middleware
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

const User = require('./models/User');

const startServer = async () => {
  try {
    await connectDB();

    // Auto-seed initial demo dataset if database is empty
    const userCount = await User.countDocuments();
    if (userCount === 0) {
      console.log('[Startup] Empty database detected. Auto-seeding realistic demo dataset...');
      const { populateData } = require('./seed');
      await populateData({ clearExisting: false });
    }

    httpServer.listen(PORT, () => {
      console.log('====================================================');
      console.log(`🚀 Tourist Safety Platform Backend Running on port ${PORT}`);
      console.log(`🌐 Base URL: http://localhost:${PORT}`);
      console.log(`⚡ WebSocket: ws://localhost:${PORT} (Socket.IO active)`);
      console.log(`🛡️  Role-Based Auth: Tourist & Authority`);
      console.log(`🧠 AI Risk & Urgency Engine: Operational`);
      console.log('====================================================');
    });
  } catch (error) {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  }
};

// Start server if run directly
if (require.main === module) {
  startServer();
}

module.exports = { app, httpServer, io };
