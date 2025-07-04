// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: "tks-prepify.firebaseapp.com",
  projectId: "tks-prepify",
  storageBucket: "tks-prepify.firebasestorage.app",
  messagingSenderId: "1078973522515",
  appId: "1:1078973522515:web:b96cc234f376a94e9cdca6",
  measurementId: "G-8QFLNX27DF"
};

// Initialize Firebase
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);


export { app, db, auth };
