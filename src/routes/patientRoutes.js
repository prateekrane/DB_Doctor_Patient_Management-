const express = require('express');
const upload = require('../middleware/upload');
const {
    addPatient,
    listPatients,
    viewPatientPDF,
    searchPatient,
    uploadPrescription,
} = require('../controllers/patientController');

const router = express.Router();

router.post('/patients', addPatient);
router.get('/patients', listPatients);
router.get('/patients/:id/pdf', viewPatientPDF);
router.get('/patients/search', searchPatient);
router.post('/patients/upload', upload.single('prescription'), uploadPrescription);

module.exports = router; // Ensure the router is exported
