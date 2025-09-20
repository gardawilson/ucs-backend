const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

// Import routes (pakai path relatif)
const authRoutes = require('./modules/auth/auth-routes');
const stockOpnameRoutes = require('./modules/stock-opname/stock-opname-routes');
const profileRoutes = require('./modules/profile/profile-routes');

const app = express();

// Middleware
app.use(express.json());
app.use(cors());
app.use(bodyParser.json());

// Routes
app.use('/api', authRoutes);
app.use('/api', stockOpnameRoutes);
app.use('/api', profileRoutes);

module.exports = app;
