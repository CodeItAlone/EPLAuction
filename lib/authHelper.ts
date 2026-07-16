import { adminAuth, adminDb } from "./firebaseAdmin";

/**
 * Helper to verify if the request is made by an authenticated administrator.
 * Extracts the Bearer token from the Authorization header, verifies it,
 * and checks if the email is in the authorized admins collection and is active.
 */
export async function verifyAdmin(req: Request): Promise<string> {
  const isEmulator = !!process.env.FIRESTORE_EMULATOR_HOST || !!process.env.FIREBASE_AUTH_EMULATOR_HOST;
  const isDev = process.env.NODE_ENV === "development";
  const bypassHeader = req.headers.get("x-bypass-admin-auth");

  if ((isDev || isEmulator) && bypassHeader === "true") {
    return "dev-admin-uid";
  }

  const authHeader = req.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new Error("Unauthorized: Missing or invalid Authorization header");
  }

  const idToken = authHeader.substring(7); // Remove "Bearer "
  try {
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    const email = decodedToken.email;

    if (!email) {
      throw new Error("Unauthorized: No email address associated with this token");
    }

    // Query Firestore admins collection for matching active email
    const adminQuery = await adminDb
      .collection("admins")
      .where("email", "==", email)
      .where("active", "==", true)
      .limit(1)
      .get();

    if (adminQuery.empty) {
      throw new Error("Unauthorized: User email is not configured as an active administrator");
    }

    return decodedToken.uid;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Unauthorized: ${message}`);
  }
}
