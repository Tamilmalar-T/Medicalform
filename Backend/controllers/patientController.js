import Patient from '../models/PatientModel.js';
import { syncPatientIntakeToDrive, syncPatientRegistryToDrive, deletePatientFilesFromDrive, rebuildPatientRegistryForDate } from '../services/googleDriveService.js';

// 1. Create a new patient record and sync to Google Drive
export const createPatient = async (req, res) => {
  try {
    const { ipNo, name, age, date, gender, recordType, fileName, fileSize, fileData } = req.body;

    // Validate request inputs
    if (!ipNo || !name || !age || !date || !gender || !recordType || !fileName || !fileSize || !fileData) {
      return res.status(400).json({ error: 'Missing required clinical registration parameters.' });
    }

    // Trigger Google Drive Folder creation & File sync in background
    const syncResult = await syncPatientIntakeToDrive({ ipNo, name, age, date, gender, recordType, fileName, fileSize, fileData });

    let driveFileId = undefined;
    let driveFileUrl = undefined;
    let driveReportFileId = undefined;
    let driveReportFileUrl = undefined;
    let monthFolderId = undefined;
    let month = undefined;
    let year = undefined;

    if (syncResult) {
      driveFileId = syncResult.driveFileId;
      driveFileUrl = syncResult.driveFileUrl;
      driveReportFileId = syncResult.driveReportFileId;
      driveReportFileUrl = syncResult.driveReportFileUrl;
      monthFolderId = syncResult.monthFolderId;
      month = syncResult.month;
      year = syncResult.year;
    }

    const newPatient = new Patient({
      ipNo,
      name,
      age: Number(age),
      date,
      gender,
      recordType,
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

    // Update HTML Master Registry in Google Drive in background
    setImmediate(async () => {
      try {
        if (monthFolderId && month && year) {
          const allPatients = await Patient.find().sort({ createdAt: -1 });
          const filteredPatients = allPatients.filter(p => {
             if (!p.date) return false;
             const d = new Date(p.date);
             if (isNaN(d.getTime())) return false;
             
             const pYear = d.getFullYear().toString();
             const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
             const pMonth = monthNames[d.getMonth()];
             
             return pYear === year && pMonth === month;
          });
          
          await syncPatientRegistryToDrive(filteredPatients, monthFolderId, month, year);
        }
      } catch (err) {
        console.error('[PATIENT CONTROLLER] Failed to sync registry:', err.message);
      }
    });
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
    
    // Find the record first to get Drive IDs and date
    const recordToDelete = await Patient.findById(id);
    if (!recordToDelete) {
      return res.status(404).json({ error: 'Record not found in diagnostics database.' });
    }

    const { driveFileId, driveReportFileId, date } = recordToDelete;

    // Delete from MongoDB
    await Patient.findByIdAndDelete(id);

    console.log(`[PATIENT CONTROLLER] Deleted record ID: ${id}`);
    res.json({ success: true, message: 'Record purged from archive.' });

    // Background task: Delete from Drive and update Registry
    setImmediate(async () => {
      try {
        // 1. Delete files from Google Drive
        await deletePatientFilesFromDrive(driveFileId, driveReportFileId);

        // 2. Rebuild Registry for that specific month
        if (date) {
          const d = new Date(date);
          if (!isNaN(d.getTime())) {
             const year = d.getFullYear().toString();
             const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
             const month = monthNames[d.getMonth()];

             const allPatients = await Patient.find().sort({ createdAt: -1 });
             const filteredPatients = allPatients.filter(p => {
               if (!p.date) return false;
               const pd = new Date(p.date);
               if (isNaN(pd.getTime())) return false;
               return pd.getFullYear().toString() === year && monthNames[pd.getMonth()] === month;
             });

             await rebuildPatientRegistryForDate(date, filteredPatients);
          }
        }
      } catch (err) {
        console.error('[PATIENT CONTROLLER] Failed background delete sync:', err.message);
      }
    });

  } catch (error) {
    console.error('[PATIENT CONTROLLER] Error deleting patient:', error);
    res.status(500).json({ error: error.message || 'Failed to delete record.' });
  }
};

const onDeleteRecord = async (id) => {
  try {
    await axios.delete(`http://localhost:5000/patients/${id}`);

    setRecords((prev) =>
      prev.filter((record) => record.id !== id)
    );
  } catch (error) {
    console.log(error);
  }
};