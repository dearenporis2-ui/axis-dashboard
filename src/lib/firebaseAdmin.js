const { initializeApp, cert, applicationDefault, getApps } = require('firebase-admin/app');
const fs = require('fs');

const KEY_PATH =
  process.env.GOOGLE_APPLICATION_CREDENTIALS ||
  'C:/Users/Dearen Porice/Desktop/AXIS/Secrets/axis-dashboard-c9901-firebase-adminsdk-fbsvc-9f20592d94.json';

if (!getApps().length) {
  initializeApp({
    credential: fs.existsSync(KEY_PATH)
      ? cert(JSON.parse(fs.readFileSync(KEY_PATH, 'utf8')))
      : applicationDefault(),
    projectId: process.env.FIREBASE_PROJECT_ID || 'axis-dashboard-c9901'
  });
}

module.exports = {};