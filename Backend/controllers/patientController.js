import Patient from '../models/PatientModel.js';
import { syncPatientIntakeToDrive } from '../services/googleDriveService.js';

// 1. Create a new patient record and sync to Google Drive
export const createPatient = async (req, res) => {
  try {
    const { ipNo, name, age, date, gender, fileName, fileSize, fileData } = req.body;

    // Validate request inputs
    if (!ipNo || !name || !age || !date || !gender || !fileName || !fileSize || !fileData) {
      return res.status(400).json({ error: 'Missing required clinical registration parameters.' });
    }

    // Trigger Google Drive Folder creation & File sync in background
    const syncResult = await syncPatientIntakeToDrive({ ipNo, name, age, date, gender, fileName, fileSize, fileData });

    let driveFileId = undefined;
    let driveFileUrl = undefined;
    let driveReportFileId = undefined;
    let driveReportFileUrl = undefined;

    if (syncResult) {
      driveFileId = syncResult.driveFileId;
      driveFileUrl = syncResult.driveFileUrl;
      driveReportFileId = syncResult.driveReportFileId;
      driveReportFileUrl = syncResult.driveReportFileUrl;
    }

    const newPatient = new Patient({
      ipNo,
      name,
      age: Number(age),
      date,
      gender,
      fileName,
      fileSize,
      fileData,
      driveFileId,
      driveFileUrl,
      driveReportFileId,
      driveReportFileUrl
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
    const deletedRecord = await Patient.findByIdAndDelete(id);

    if (!deletedRecord) {
      return res.status(404).json({ error: 'Record not found in diagnostics database.' });
    }

    console.log(`[PATIENT CONTROLLER] Deleted record ID: ${id}`);
    res.json({ success: true, message: 'Record purged from archive.' });
  } catch (error) {
    console.error('[PATIENT CONTROLLER] Error deleting patient:', error);
    res.status(500).json({ error: error.message || 'Failed to delete record.' });
  }
};