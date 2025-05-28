// src/lib/firebase/firebase.config.ts
import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore'; // Import Firestore

// Use environment variables for Firebase config
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Initialize Firebase
let app: FirebaseApp;
if (!getApps().length) {
  try {
    if (!firebaseConfig.apiKey || !firebaseConfig.authDomain || !firebaseConfig.projectId) {
        throw new Error("Missing essential Firebase configuration values (apiKey, authDomain, projectId). Check your .env file.");
    }
    app = initializeApp(firebaseConfig);
  } catch (error: any) {
    console.error("Firebase initialization error:", error.message);
    if (error.message.includes('invalid-api-key')) {
         console.error("Please ensure NEXT_PUBLIC_FIREBASE_API_KEY in your .env file is correct.");
    }
    throw new Error(`Failed to initialize Firebase. ${error.message}`);
  }
} else {
  app = getApps()[0];
}

let auth: Auth;
let db: Firestore; // Declare Firestore instance

try {
    auth = getAuth(app);
    db = getFirestore(app); // Initialize Firestore
} catch (error: any) {
    console.error("Firebase services initialization error:", error.message);
    if (error.code === 'auth/configuration-not-found') {
        console.error("Firebase Authentication configuration not found. Ensure Authentication is enabled and configured correctly in your Firebase project console (https://console.firebase.google.com/). Check if the Email/Password sign-in provider is enabled for your project: ", firebaseConfig.projectId);
    }
    if (error.message.includes('firestore')) {
        console.error("Firestore initialization error. Ensure Firestore is enabled and configured in your Firebase project console.");
    }
    throw new Error(`Failed to initialize Firebase services. ${error.message}`);
}

export { app, auth, db }; // Export Firestore instance
