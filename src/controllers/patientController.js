const pool = require('../config/db');
const fs = require('fs');
const db = require('../config/db');
const path = require('path');
// Ensure table exists
const ensureTable = async () => {
    const createTableQuery = `
    CREATE TABLE IF NOT EXISTS patients (
      id SERIAL PRIMARY KEY,
      patient_id INTEGER UNIQUE,
      name VARCHAR(255),
      age INTEGER,
      gender VARCHAR(50),
      date DATE,
      prescription TEXT,
      diagnosis TEXT,
      prescription_pdf BYTEA
    );
  `;

    try {
        await pool.query(createTableQuery);
        console.log("Table 'patients' is ready.");
    } catch (error) {
        console.error("Error ensuring table exists:", error);
    }
};

ensureTable();

// Create a new patient
exports.addPatient = async (req, res) => {
    const { patient_id, name, age, gender, date, prescription, diagnosis } = req.body;

    try {
        const query = `
      INSERT INTO patients (patient_id, name, age, gender, date, prescription, diagnosis)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *;
    `;
        const result = await pool.query(query, [patient_id, name, age, gender, date, prescription, diagnosis]);
        res.status(201).json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// List all patients
exports.listPatients = async (req, res) => {
    try {
        const result = await pool.query('SELECT id, patient_id, name, age, date FROM patients');
        res.status(200).json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// View patient details as PDF
// exports.viewPatientPDF = async (req, res) => {
//     const { id } = req.params;

//     try {
//         // Query the database to get the binary data of the PDF
//         const result = await pool.query('SELECT prescription_pdf FROM patients WHERE id = $1', [id]);

//         if (!result.rows.length) {
//             return res.status(404).json({ message: 'Patient not found' });
//         }

//         const pdfData = result.rows[0].prescription_pdf;

//         // Check if there is binary data for the PDF
//         if (!pdfData) {
//             return res.status(404).json({ message: 'PDF not found for this patient' });
//         }

//         // Set the response header to indicate that we're sending a PDF file
//         res.setHeader('Content-Type', 'application/pdf');

//         // Send the binary data as the response
//         res.send(pdfData);
//     } catch (error) {
//         console.error(error);
//         res.status(500).json({ error: error.message });
//     }
// };


exports.viewPatientPDF = async (req, res) => {
    const { id } = req.params;

    try {
        // Query the database to get the binary data of the PDF
        const result = await pool.query('SELECT prescription_pdf FROM patients WHERE id = $1', [id]);

        if (!result.rows.length) {
            return res.status(404).json({ message: 'Patient not found' });
        }

        const pdfData = result.rows[0].prescription_pdf;

        // Check if there is binary data for the PDF
        if (!pdfData) {
            return res.status(404).json({ message: 'PDF not found for this patient' });
        }

        // Ensure the PDF is sent as binary data
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'inline; filename="patient_prescription.pdf"');

        // Send the binary data as the response
        res.end(pdfData, 'binary');
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
};


// Search for a patient
exports.searchPatient = async (req, res) => {
    const { id, name } = req.query;  // Extract both 'id' and 'name' from query parameters

    try {
        let queryStr = 'SELECT id, patient_id, name, age, date FROM patients WHERE ';
        let queryParams = [];

        // Check if ID is provided and add the condition for it
        if (id) {
            queryStr += 'patient_id = $1 ';
            queryParams.push(id);  // Add patient_id to query parameters
        }

        // Check if name is provided and add the condition for it
        if (name) {
            if (queryParams.length > 0) queryStr += 'OR ';  // Add OR if there's already a condition in the query
            queryStr += 'name ILIKE $' + (queryParams.length + 1);
            queryParams.push(`%${name}%`);  // Add name with wildcards for partial match
        }

        // Execute the query with dynamic conditions
        const result = await pool.query(queryStr, queryParams);

        // Send response with the matching results or a message if no data found
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Patient not found' });
        }

        res.status(200).json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};


// Upload a prescription PDF
exports.uploadPrescription = async (req, res) => {
    const { id, name } = req.body;

    try {
        // Verify patient existence using parameterized query
        const query = 'SELECT * FROM patients WHERE id = $1 AND TRIM(LOWER(name)) = TRIM(LOWER($2))';
        const values = [id, name];
        const result = await db.query(query, values);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Patient not found' });
        }

        // Handle file upload
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        // Construct the file path
        const pdfPath = path.join('uploads', req.file.filename);

        // Update the patient record in the database
        const updateQuery = 'UPDATE patients SET prescription_pdf = $1 WHERE id = $2';
        await db.query(updateQuery, [pdfPath, id]);

        res.status(200).json({ message: 'Prescription uploaded successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
};


// Delete Patient 
exports.deletePatient = async (req, res) => {
    const { id } = req.params;

    try {
        // Verify if the patient exists using a parameterized query
        const query = 'SELECT * FROM patients WHERE id = $1';
        const values = [id];
        const result = await db.query(query, values);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Patient not found' });
        }

        // Get the path of the prescription PDF, if it exists
        const patient = result.rows[0];
        const prescriptionPath = patient.prescription_pdf;

        // Delete the patient's record from the database
        const deleteQuery = 'DELETE FROM patients WHERE id = $1';
        await db.query(deleteQuery, [id]);

        // Optionally delete the associated prescription file
        if (prescriptionPath) {
            const fullPath = path.resolve(prescriptionPath);
            fs.unlink(fullPath, (err) => {
                if (err) {
                    console.error('Error deleting prescription file:', err);
                }
            });
        }

        res.status(200).json({ message: 'Patient deleted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
