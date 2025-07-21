
// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getFirestore, Firestore } from "firebase/firestore";
import { getAuth, Auth } from "firebase/auth";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: "tks-prepify.firebaseapp.com",
  projectId: "tks-prepify",
  storageBucket: "tks-prepify.appspot.com",
  messagingSenderId: "1078973522515",
  appId: "1:1078973522515:web:b96cc234f376a94e9cdca6",
  measurementId: "G-8QFLNX27DF"
};

// --- Safer Firebase Initialization ---
let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;

const isFirebaseConfigured = !!firebaseConfig.apiKey;

if (isFirebaseConfigured) {
  try {
    app = getApps().length ? getApp() : initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
  } catch (e) {
      console.error("Firebase initialization error:", e);
  }
} else {
    console.warn("*****************************************************************");
    console.warn("WARNING: Firebase API Key is missing from your .env file.");
    console.warn("Firebase features will be disabled. Please add NEXT_PUBLIC_FIREBASE_API_KEY.");
    console.warn("*****************************************************************");
}

export { app, db, auth, isFirebaseConfigured };
