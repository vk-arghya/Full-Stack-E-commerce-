import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getStorage } from 'firebase-admin/storage';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const serviceAccountPath = path.join(__dirname, '..', 'firebase-service-account.json');

let serviceAccountProjectId = '';

function buildCredential() {
  if (fs.existsSync(serviceAccountPath)) {
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
    if (!serviceAccount.project_id || !serviceAccount.client_email || !serviceAccount.private_key) {
      throw new Error('firebase-service-account.json must contain project_id, client_email and private_key');
    }
    serviceAccountProjectId = serviceAccount.project_id;
    return admin.credential.cert(serviceAccount);
  }
  const privateKey = (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n');
  if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_CLIENT_EMAIL || !privateKey) {
    throw new Error('Firebase Admin credentials missing. Put firebase-service-account.json in backend/ or configure FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY.');
  }
  serviceAccountProjectId = process.env.FIREBASE_PROJECT_ID;
  return admin.credential.cert({ projectId: process.env.FIREBASE_PROJECT_ID, clientEmail: process.env.FIREBASE_CLIENT_EMAIL, privateKey });
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: buildCredential(),
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET || `${serviceAccountProjectId}.firebasestorage.app`,
  });
}
export const adminDb = admin.firestore();
export const adminAuth = admin.auth();
export const adminStorage = getStorage();
