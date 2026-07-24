// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";

// Firebase configuration using environment variables with fallbacks for production builds
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY || "AIzaSyD8A110peg2Y-b2QUvTX7wHz-_Jkb-VB9s",
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || "dyslexia-detection-c3786.firebaseapp.com",
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID || "dyslexia-detection-c3786",
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET || "dyslexia-detection-c3786.firebasestorage.app",
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || "839441836652",
  appId: process.env.REACT_APP_FIREBASE_APP_ID || "1:839441836652:web:d269a63ea420c7cef38649",
  measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID || "G-EKK0P8QPDN"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export default app;