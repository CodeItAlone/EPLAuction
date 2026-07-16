import { getApps, initializeApp, cert, getApp, App } from "firebase-admin/app";
import { getFirestore, Firestore } from "firebase-admin/firestore";

const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY;

// Check if we are running in Firebase emulator mode
const isEmulator = !!process.env.FIRESTORE_EMULATOR_HOST || !!process.env.FIREBASE_AUTH_EMULATOR_HOST;

let app: App;


if (getApps().length > 0) {
  app = getApp();
} else {
  if (isEmulator) {
    if (!projectId) {
      throw new Error(
        "Firebase Admin Initialization Error: FIREBASE_PROJECT_ID or NEXT_PUBLIC_FIREBASE_PROJECT_ID must be set when running with emulators."
      );
    }
    app = initializeApp({ projectId });
  } else {
    // Production / Live Firebase Project - require full credentials
    if (!projectId || !clientEmail || !privateKey) {
      const missingVars: string[] = [];
      if (!projectId) missingVars.push("FIREBASE_PROJECT_ID (or NEXT_PUBLIC_FIREBASE_PROJECT_ID)");
      if (!clientEmail) missingVars.push("FIREBASE_CLIENT_EMAIL");
      if (!privateKey) missingVars.push("FIREBASE_PRIVATE_KEY");

      throw new Error(
        `Firebase Admin SDK Initialization Failed: Missing required environment variables: [${missingVars.join(
          ", "
        )}]. Proper credentials must be configured for production.`
      );
    }

    app = initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey: privateKey.replace(/\\n/g, "\n"),
      }),
    });
  }
}

const adminDb: Firestore = getFirestore(app);

export { adminDb, app as adminApp };

