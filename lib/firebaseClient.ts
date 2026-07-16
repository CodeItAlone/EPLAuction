import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getFirestore, Firestore } from "firebase/firestore";
import { getAuth, Auth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "",
};

let app: FirebaseApp;

if (getApps().length > 0) {
  app = getApp();
} else {
  // Warn if initialized in browser without variables, but allow soft setup during SSR/Build
  if (typeof window !== "undefined" && !firebaseConfig.apiKey) {
    console.warn(
      "Firebase Client SDK Warning: Public environment variables (NEXT_PUBLIC_FIREBASE_API_KEY) are missing. Authentication and database features will fail."
    );
  }
  app = initializeApp(firebaseConfig);
}

const db: Firestore = getFirestore(app);
const auth: Auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

export { app, db, auth, googleProvider };
