import fs from 'fs';
import readline from 'readline';
import { google } from 'googleapis';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// If modifying these scopes, delete token.json.
const SCOPES = ['https://www.googleapis.com/auth/drive.file'];
const TOKEN_PATH = path.join(__dirname, 'token.json');
const CREDENTIALS_PATH = path.join(__dirname, 'oauth_credentials.json');

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 */
function getNewToken(oAuth2Client, callback) {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
  });
  console.log('\n=============================================');
  console.log('Authorize this app by visiting this url:\n');
  console.log(authUrl);
  console.log('\n=============================================');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  rl.question('Enter the code from that page here: ', (code) => {
    rl.close();
    oAuth2Client.getToken(code, (err, token) => {
      if (err) {
        console.error('Error retrieving access token', err);
        return;
      }
      oAuth2Client.setCredentials(token);
      // Store the token to disk for later program executions
      fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
        if (err) return console.error(err);
        console.log('\n✅ Token stored to', TOKEN_PATH);
        console.log('You are now ready to use Google Drive OAuth!\n');
      });
      callback(oAuth2Client);
    });
  });
}

// Load client secrets from a local file.
fs.readFile(CREDENTIALS_PATH, (err, content) => {
  if (err) {
    console.error('Error loading client secret file. Make sure you placed oauth_credentials.json in the services folder!');
    console.error('Error:', err.message);
    process.exit(1);
  }
  
  // Authorize a client with credentials, then call the Google Drive API.
  const credentials = JSON.parse(content);
  const {client_secret, client_id, redirect_uris} = credentials.installed || credentials.web;
  
  if (!client_secret || !client_id) {
     console.error("Invalid credentials file. Please make sure you downloaded an OAuth 2.0 Client ID.");
     process.exit(1);
  }
  
  const oAuth2Client = new google.auth.OAuth2(
      client_id, client_secret, redirect_uris[0] || 'urn:ietf:wg:oauth:2.0:oob');

  // Check if we have previously stored a token.
  fs.readFile(TOKEN_PATH, (err, token) => {
    if (err) {
      return getNewToken(oAuth2Client, () => {});
    }
    console.log("✅ Token already exists at", TOKEN_PATH);
  });
});
