import nodemailer from 'nodemailer';

/**
 * Creates the Nodemailer transporter using credentials from .env
 */
const createTransporter = () => {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER, // e.g., tamilmalar520d@gmail.com
      pass: process.env.GMAIL_APP_PASSWORD, // The 16-character app password
    },
  });
};

/**
 * Sends a patient intake email with the diagnostic file attached
 * 
 * @param {object} patientData Core patient data
 */
export const sendPatientIntakeEmail = async (patientData) => {
  const { ipNo, name, age, date, gender, recordType, fileName, fileSize, fileData } = patientData;
  
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    console.warn('[EMAIL SERVICE] Gmail credentials not configured in .env. Skipping email backup.');
    return false;
  }

  try {
    const transporter = createTransporter();

    // Parse the base64 file data
    // fileData format: "data:application/pdf;base64,JVBERi..."
    const mimeTypeMatch = fileData.match(/^data:(.+?);base64,/);
    const base64Content = fileData.split(';base64,').pop();
    const fileBuffer = Buffer.from(base64Content, 'base64');

    // Create a beautiful HTML email body
    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
        <div style="background: linear-gradient(135deg, #4f46e5 0%, #8b5cf6 100%); padding: 24px; text-align: center; color: white;">
          <h1 style="margin: 0; font-size: 24px;">New Patient Record</h1>
          <p style="margin: 8px 0 0 0; opacity: 0.9;">MedFlow Clinical Portal</p>
        </div>
        
        <div style="padding: 32px 24px;">
          <h2 style="margin-top: 0; color: #0f172a; border-bottom: 2px solid #f1f5f9; padding-bottom: 8px;">Patient Details</h2>
          
          <table style="width: 100%; border-collapse: collapse; margin-top: 16px;">
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-weight: 600; width: 40%;">Name:</td>
              <td style="padding: 8px 0; color: #0f172a; font-weight: bold;">${name}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Age:</td>
              <td style="padding: 8px 0; color: #0f172a;">${age} Years</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Gender:</td>
              <td style="padding: 8px 0; color: #0f172a;">${gender}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Category:</td>
              <td style="padding: 8px 0; color: #0f172a;">
                <span style="background: #f1f5f9; padding: 4px 8px; border-radius: 6px; font-size: 14px;">${recordType || 'N/A'}</span>
              </td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Intake Date:</td>
              <td style="padding: 8px 0; color: #0f172a;">${date}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Workstation IP:</td>
              <td style="padding: 8px 0; color: #0f172a;"><code style="background: #f1f5f9; padding: 2px 6px; border-radius: 4px;">${ipNo}</code></td>
            </tr>
          </table>

          <div style="margin-top: 32px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px;">
            <h3 style="margin-top: 0; color: #334155; font-size: 16px;">Attached Diagnostic File</h3>
            <p style="margin: 0; color: #475569; font-size: 14px;">
              <strong>File Name:</strong> ${fileName}<br/>
              <strong>Size:</strong> ${fileSize}
            </p>
          </div>
        </div>
        
        <div style="background: #f8fafc; padding: 16px; text-align: center; border-top: 1px solid #e2e8f0; color: #94a3b8; font-size: 12px;">
          Securely generated and dispatched by MedFlow Pro servers.
        </div>
      </div>
    `;

    console.log(`[EMAIL SERVICE] Sending record for ${name} to ${process.env.GMAIL_USER}...`);
    
    // Send email with defined transport object
    const info = await transporter.sendMail({
      from: `"MedFlow System" <${process.env.GMAIL_USER}>`,
      to: process.env.GMAIL_USER, // Email it to themselves
      subject: `New MedFlow Record: ${name} (${recordType})`,
      html: htmlBody,
      attachments: [
        {
          filename: fileName,
          content: fileBuffer,
        }
      ]
    });

    console.log(`[EMAIL SERVICE] Email successfully sent! Message ID: ${info.messageId}`);
    return true;

  } catch (error) {
    console.error('[EMAIL SERVICE] Failed to send email:', error);
    return false;
  }
};
