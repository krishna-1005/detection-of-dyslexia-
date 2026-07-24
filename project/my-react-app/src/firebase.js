// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyD8A110peg2Y-b2QUvTX7wHz-_Jkb-VB9s",
  authDomain: "dyslexia-detection-c3786.firebaseapp.com",
  projectId: "dyslexia-detection-c3786",
  storageBucket: "dyslexia-detection-c3786.firebasestorage.app",
  messagingSenderId: "839441836652",
  appId: "1:839441836652:web:d269a63ea420c7cef38649",
  measurementId: "G-EKK0P8QPDN"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;
export const auth = getAuth(app);
export default app;