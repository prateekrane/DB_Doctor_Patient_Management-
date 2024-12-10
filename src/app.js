const express = require('express');
const bodyParser = require('body-parser');
const patientRoutes = require('./routes/patientRoutes'); // Ensure the path is correct

const app = express();

app.use(bodyParser.json());
app.use('/api', patientRoutes); // Ensure patientRoutes is a valid router object

module.exports = app;
