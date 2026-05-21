import Patient from '../models/PatientModel.js';
import { sendPatientIntakeEmail } from '../services/emailService.js';
import { syncPatientIntakeToDrive, deletePatientFilesFromDrive } from '../services/googleDriveService.js';

// 1. Create a new patient record and send email backup
export const createPatient = async (req, res) => {
  try {
    const { ipNo, name, age, date, gender, recordType, fileName, fileSize, fileData } = req.body;

    // Validate request inputs
    if (!ipNo || !name || !age || !date || !gender || !recordType || !fileName || !fileSize || !fileData) {
      return res.status(400).json({ error: 'Missing required clinical registration parameters.' });
    }

    // Trigger Gmail Email Backup in background
    setImmediate(async () => {
      await sendPatientIntakeEmail({ ipNo, name, age, date, gender, recordType, fileName, fileSize, fileData });
    });

    // Trigger Google Drive Folder creation & File sync in background
    setImmediate(async () => {
      await syncPatientIntakeToDrive({ ipNo, name, age, date, gender, recordType, fileName, fileSize, fileData });
    });

    const newPatient = new Patient({
      ipNo,
      name,
      age: Number(age),
      date,
      gender,
      recordType,
      fileName,
      fileSize,
      fileData
    });

    const savedRecord = await newPatient.save();
    console.log(`[PATIENT CONTROLLER] Patient logged: ${name} [${savedRecord.id}]`);
    res.status(201).json(savedRecord);

  } catch (error) {
    console.error('[PATIENT CONTROLLER] Error creating patient:', error);
    res.status(500).json({ error: error.message || 'Failed to create patient record.' });
  }
};

// 2. Fetch all patient records
export const getPatients = async (req, res) => {
  try {
    const patients = await Patient.find().sort({ createdAt: -1 });
    res.json(patients);
  } catch (error) {
    console.error('[PATIENT CONTROLLER] Error getting patients:', error);
    res.status(500).json({ error: error.message || 'Failed to retrieve patients.' });
  }
};

// 3. Purge patient record from database
export const deletePatient = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Delete from MongoDB
    const deletedPatient = await Patient.findByIdAndDelete(id);
    if (!deletedPatient) {
      return res.status(404).json({ error: 'Record not found in diagnostics database.' });
    }

    console.log(`[PATIENT CONTROLLER] Deleted record ID: ${id}`);
    res.json({ success: true, message: 'Record purged from archive.' });

    // Background task: Delete from Drive
    setImmediate(async () => {
      try {
        await deletePatientFilesFromDrive(deletedPatient.driveFileId, deletedPatient.driveReportFileId);
      } catch (err) {
        console.error('[PATIENT CONTROLLER] Failed background delete sync:', err.message);
      }
    });

  } catch (error) {
    console.error('[PATIENT CONTROLLER] Error deleting patient:', error);
    res.status(500).json({ error: error.message || 'Failed to delete record.' });
  }
};