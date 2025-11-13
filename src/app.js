const express = require('express');
const cors = require('cors');

// Import routes
const authRoutes = require('./modules/auth/auth-routes');
const stockOpnameRoutes = require('./modules/stock-opname/stock-opname-routes');
const profileRoutes = require('./modules/profile/profile-routes');
const categoriesRoutes = require('./modules/categories/categories-routes');
const familiesRoutes = require('./modules/families/families-routes');
const warehouseRoutes = require('./modules/warehouses/warehouses-routes');
const app = express();

// Middleware
app.use(express.json()); 
app.use(cors());

// Routes dengan prefix
app.use('/api/auth', authRoutes);
app.use('/api/stock-opname', stockOpnameRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/categories', categoriesRoutes);
app.use('/api/families', familiesRoutes);
app.use('/api/warehouses', warehouseRoutes);

module.exports = app;
