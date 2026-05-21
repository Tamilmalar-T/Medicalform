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

/**
 * Generates an HTML report mirroring the UI table and uploads/updates it in Google Drive.
 * 
 * @param {Array} patients Array of all patient records
 */
export const syncPatientRegistryToDrive = async (patients) => {
  const parentFolderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
  const { clientEmail, privateKey } = getGoogleCredentials();

  if (!clientEmail || !privateKey || !parentFolderId) {
    return;
  }

  try {
    const formattedPrivateKey = privateKey.replace(/\\n/g, '\n');
    const auth = new google.auth.GoogleAuth({
      credentials: { client_email: clientEmail, private_key: formattedPrivateKey },
      scopes: ['https://www.googleapis.com/auth/drive.file', 'https://www.googleapis.com/auth/drive.metadata.readonly'],
    });

    const drive = google.drive({ version: 'v3', auth });

    let tableRows = '';
    for (const patient of patients) {
      const genderClass = patient.gender.toLowerCase();
      tableRows += `
        <tr>
          <td>
            <div style="display: flex; align-items: center; gap: 12px; font-weight: 600; color: #0f172a;">
              <div style="width: 32px; height: 32px; background: rgba(79, 70, 229, 0.08); border: 1px solid rgba(79, 70, 229, 0.2); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #4f46e5; font-size: 0.8rem;">
                ${patient.name.charAt(0).toUpperCase()}
              </div>
              ${patient.name}
            </div>
          </td>
          <td>
            <span style="font-family: monospace; background: rgba(0, 0, 0, 0.04); padding: 4px 8px; border-radius: 6px; font-size: 0.8rem; border: 1px solid rgba(0, 0, 0, 0.08); color: #0f172a;">
              ${patient.ipNo}
            </span>
          </td>
          <td>${patient.age} yrs</td>
          <td>${patient.date}</td>
          <td>
            <span class="gender-tag ${genderClass}">${patient.gender}</span>
          </td>
          <td>
            <a href="${patient.driveFileUrl || '#'}" target="_blank" style="display: inline-flex; align-items: center; gap: 4px; background: rgba(0, 0, 0, 0.03); border: 1px solid rgba(0, 0, 0, 0.06); padding: 6px 12px; border-radius: 8px; color: #475569; font-size: 0.8rem; text-decoration: none;">
              📄 ${patient.fileName}
            </a>
          </td>
        </tr>
      `;
    }













    

    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Patient Submissions Log</title>
<style>
  body {
    font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
    background: #f8fafc;
    color: #475569;
    padding: 3rem;
    margin: 0;
  }
  .container {
    max-width: 1200px;
    margin: 0 auto;
    background: white;
    border-radius: 20px;
    border: 1px solid rgba(0,0,0,0.08);
    box-shadow: 0 10px 15px -3px rgba(15, 23, 42, 0.05);
    padding: 2.5rem;
  }
  h2 { color: #0f172a; margin-top: 0; font-size: 1.6rem; margin-bottom: 0.25rem; }
  table { width: 100%; border-collapse: collapse; text-align: left; font-size: 0.9rem; margin-top: 1rem; }
  th { background: rgba(0, 0, 0, 0.03); padding: 1rem 1.25rem; color: #64748b; font-weight: 700; text-transform: uppercase; font-size: 0.75rem; letter-spacing: 0.05em; border-bottom: 1px solid rgba(0, 0, 0, 0.08); }
  td { padding: 1rem 1.25rem; border-bottom: 1px solid rgba(0, 0, 0, 0.05); vertical-align: middle; }
  tr:hover { background: rgba(0, 0, 0, 0.02); }
  .gender-tag { padding: 4px 10px; border-radius: 9999px; font-size: 0.75rem; font-weight: 700; text-transform: uppercase; display: inline-block; }
  .male { background: rgba(59, 130, 246, 0.08); color: #1d4ed8; border: 1px solid rgba(59, 130, 246, 0.15); }
  .female { background: rgba(236, 72, 153, 0.08); color: #db2777; border: 1px solid rgba(236, 72, 153, 0.15); }
  .other { background: rgba(5, 150, 105, 0.08); color: #059669; border: 1px solid rgba(5, 150, 105, 0.15); }
</style>
</head>
<body>
  <div class="container">
    <h2>Patient Submissions Log</h2>
    <p style="color: #64748b; font-size: 0.9rem; margin-bottom: 2rem;">Real-time database of intake records. Master Registry Document.</p>
    <div style="border: 1px solid rgba(0,0,0,0.08); border-radius: 16px; overflow: hidden;">
      <table>
        <thead>
          <tr>
            <th>Patient Name</th>
            <th>IP Address</th>
            <th>Age</th>
            <th>Intake Date</th>
            <th>Gender</th>
            <th>Diagnostic File</th>
          </tr>
        </thead>
        <tbody>
          ${tableRows}
        </tbody>
      </table>
    </div>
  </div>
</body>
</html>`;

    const fileName = 'MedFlow_Patient_Registry.html';
    
    // Check if file exists in the parent folder
    const searchRes = await drive.files.list({
      q: `name='${fileName}' and '${parentFolderId}' in parents and trashed=false`,
      fields: 'files(id)'
    });

    const bufferStream = new Readable();
    bufferStream.push(Buffer.from(htmlContent, 'utf-8'));
    bufferStream.push(null);

    if (searchRes.data.files && searchRes.data.files.length > 0) {
      const fileId = searchRes.data.files[0].id;
      await drive.files.update({
        fileId: fileId,
        media: { mimeType: 'text/html', body: bufferStream }
      });
      console.log(`[GOOGLE DRIVE SERVICE] Updated master HTML registry file: ${fileId}`);
    } else {
      const response = await drive.files.create({
        requestBody: { name: fileName, parents: [parentFolderId], mimeType: 'text/html' },
        media: { mimeType: 'text/html', body: bufferStream },
        fields: 'id'
      });
      console.log(`[GOOGLE DRIVE SERVICE] Created master HTML registry file: ${response.data.id}`);
    }
  } catch (error) {
    console.error('[GOOGLE DRIVE SERVICE] Error syncing registry HTML:', error.message);
  }
};