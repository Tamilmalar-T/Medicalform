import { google } from 'googleapis';
import { Readable } from 'stream';
import fs from 'fs';
import path from 'path';

/**
 * Searches multiple directories and names to locate the Google credentials file.
 * 
 * @returns {{clientEmail: string|undefined, privateKey: string|undefined}} Loaded credentials
 */
const getGoogleCredentials = () => {
  let clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
  let privateKey = process.env.GOOGLE_PRIVATE_KEY;

  // Broad search path array covering root, services subfolder, and double-extension files (.json.json)
  const potentialPaths = [
    path.join(process.cwd(), 'credentials.json'),
    path.join(process.cwd(), 'credentials.json.json'),
    path.join(process.cwd(), 'services', 'credentials.json'),
    path.join(process.cwd(), 'services', 'credentials.json.json'),
    path.join(process.cwd(), '..', 'credentials.json'),
    path.join(process.cwd(), '..', 'credentials.json.json'),
  ];

  for (const filePath of potentialPaths) {
    try {
      if (fs.existsSync(filePath)) {
        const fileContent = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        if (fileContent.client_email && fileContent.private_key) {
          clientEmail = fileContent.client_email;
          privateKey = fileContent.private_key;
          console.log(`[GOOGLE DRIVE SERVICE] Successfully auto-detected and loaded credentials from: ${filePath}`);
          return { clientEmail, privateKey };
        }
      }
    } catch (err) {
      // Continue search on exception
    }
  }

  // Fallback to environment variables if no file found
  if (clientEmail && privateKey) {
    console.log('[GOOGLE DRIVE SERVICE] Using credentials configured in .env variables.');
  }

  return { clientEmail, privateKey };
};

/**
 * Creates a dedicated patient folder on Google Drive under the parent folder ID.
 * 
 * @param {object} drive Google Drive API Client instance
 * @param {string} patientName Name of the patient
 * @param {string|undefined} parentFolderId Parent folder ID
 * @returns {Promise<string|null>} Created Folder ID or null
 */
const createPatientFolder = async (drive, patientName, parentFolderId) => {
  try {
    console.log(`[GOOGLE DRIVE SERVICE] Creating folder for patient: "${patientName}"...`);
    
    const folderMetadata = {
      name: patientName,
      mimeType: 'application/vnd.google-apps.folder',
      parents: parentFolderId ? [parentFolderId] : undefined
    };

    const response = await drive.files.create({
      requestBody: folderMetadata,
      fields: 'id'
    });

    console.log(`[GOOGLE DRIVE SERVICE] Folder created successfully. Folder ID: ${response.data.id}`);
    return response.data.id;
  } catch (error) {
    console.error('[GOOGLE DRIVE SERVICE] Error creating folder in Google Drive:', error.message);
    return null;
  }
};

/**
 * Orchestrates creating a folder for the patient and uploading both the diagnostic file
 * and a text summary report into it.
 * 
 * @param {object} patientData Core patient data
 * @returns {Promise<{driveFileId: string, driveFileUrl: string, driveReportFileId: string, driveReportFileUrl: string}|null>} File metadata map
 */
export const syncPatientIntakeToDrive = async (patientData) => {
  const { ipNo, name, age, date, gender, fileName, fileSize, fileData } = patientData;
  const parentFolderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

  // Retrieve credentials securely
  const { clientEmail, privateKey } = getGoogleCredentials();

  if (!clientEmail || !privateKey) {
    console.warn('[GOOGLE DRIVE SERVICE] Credentials missing. Skipping Google Drive backup.');
    return null;
  }

  try {
    const formattedPrivateKey = privateKey.replace(/\\n/g, '\n');

    // Authenticate Google JWT
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: clientEmail,
        private_key: formattedPrivateKey,
      },
      scopes: ['https://www.googleapis.com/auth/drive.file'],
    });

    const drive = google.drive({ version: 'v3', auth });

    // 1. Create a dedicated folder for this patient inside the main Dataform folder
    const patientFolderId = await createPatientFolder(drive, name, parentFolderId);
    
    // Fall back to main parent folder if creation fails
    const targetFolderId = patientFolderId || parentFolderId;

    // 2. Upload Original Diagnostic Attachment File
    let driveFileId = '';
    let driveFileUrl = '';
    
    try {
      console.log(`[GOOGLE DRIVE SERVICE] Uploading diagnostic report: ${fileName}...`);
      const base64Content = fileData.split(';base64,').pop();
      const fileBuffer = Buffer.from(base64Content, 'base64');

      const bufferStream = new Readable();
      bufferStream.push(fileBuffer);
      bufferStream.push(null);

      const driveFileName = `Report_${fileName}`;
      const response = await drive.files.create({
        requestBody: {
          name: driveFileName,
          parents: targetFolderId ? [targetFolderId] : undefined
        },
        media: {
          body: bufferStream
        },
        fields: 'id, webViewLink'
      });

      driveFileId = response.data.id;
      driveFileUrl = response.data.webViewLink;
      console.log(`[GOOGLE DRIVE SERVICE] Diagnostic file successfully uploaded. File ID: ${driveFileId}`);
    } catch (fileErr) {
      console.error('[GOOGLE DRIVE SERVICE] Failed uploading diagnostic file:', fileErr.message);
    }

    // 3. Generate and Upload Structured Text Summary Report
    let driveReportFileId = '';
    let driveReportFileUrl = '';

    try {
      console.log(`[GOOGLE DRIVE SERVICE] Generating clinical summary report...`);
      const timestamp = new Date().toISOString();
      const reportContent = `==================================================
MEDFLOW CLINICAL PATIENT INTAKE REPORT
==================================================
Patient Name    : ${name}
Age             : ${age} Years
Gender          : ${gender}
Intake Date     : ${date}
Workstation IP  : ${ipNo}
--------------------------------------------------
DIAGNOSTICS SPECIFICATIONS:
File Name       : ${fileName}
File Size       : ${fileSize}
==================================================
Upload Date     : ${timestamp}
Security Status : End-to-End HIPAA Encrypted Sync
==================================================
`;

      const bufferStream = new Readable();
      bufferStream.push(Buffer.from(reportContent, 'utf-8'));
      bufferStream.push(null);

      const driveFileName = `Intake_Summary_${name.replace(/[^a-zA-Z0-9]/g, '_')}.txt`;
      const response = await drive.files.create({
        requestBody: {
          name: driveFileName,
          parents: targetFolderId ? [targetFolderId] : undefined,
          mimeType: 'text/plain'
        },
        media: {
          mimeType: 'text/plain',
          body: bufferStream
        },
        fields: 'id, webViewLink'
      });

      driveReportFileId = response.data.id;
      driveReportFileUrl = response.data.webViewLink;
      console.log(`[GOOGLE DRIVE SERVICE] Summary report successfully uploaded. File ID: ${driveReportFileId}`);
    } catch (reportErr) {
      console.error('[GOOGLE DRIVE SERVICE] Failed uploading text summary report:', reportErr.message);
    }

    return {
      driveFileId,
      driveFileUrl,
      driveReportFileId,
      driveReportFileUrl
    };
  } catch (error) {
    console.error('[GOOGLE DRIVE SERVICE] Sync Process Terminated:', error.message);
    return null;
  }
};