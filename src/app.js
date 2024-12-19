const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors'); // Import the cors middleware
const patientRoutes = require('./routes/patientRoutes'); // Ensure the path is correct

const app = express();

// Enable CORS for all routes
app.use(cors());

// Parse incoming JSON requests
app.use(bodyParser.json());

// Define your routes
app.use('/api', patientRoutes); // Ensure patientRoutes is a valid router object

module.exports = app;
