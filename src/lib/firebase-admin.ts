
'use server';

import * as admin from 'firebase-admin';

// These credentials should be stored securely, e.g., in environment variables
const serviceAccountValue = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
const serviceAccount = serviceAccountValue ? JSON.parse(serviceAccountValue) : null;

if (!admin.apps.length && serviceAccount) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
  } catch (error) {
    console.error('Firebase Admin initialization error', error);
  }
}

const adminAuth = admin.apps.length ? admin.auth() : null;

export { admin, adminAuth };
