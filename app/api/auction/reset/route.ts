import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";

export async function POST(req: Request) {
  try {
    const { verifyAdmin } = await import("@/lib/authHelper");
    await verifyAdmin(req);

    const batch = adminDb.batch();

    // 1. Reset all players
    const playersSnap = await adminDb.collection("players").get();
    playersSnap.docs.forEach((doc) => {
      batch.update(doc.ref, {
        status: "pool",
        soldPrice: null,
        soldToTeamId: null,
        updatedAt: FieldValue.serverTimestamp(),
      });
    });

    // 2. Reset all teams
    const teamsSnap = await adminDb.collection("teams").get();
    teamsSnap.docs.forEach((doc) => {
      const data = doc.data();
      const startingWallet = typeof data.startingWallet === "number" ? data.startingWallet : 1000;
      batch.update(doc.ref, {
        walletRemaining: startingWallet,
        playersBoughtCount: 0,
        playerIds: [],
      });
    });

    // 3. Delete all bids
    const bidsSnap = await adminDb.collection("bids").get();
    bidsSnap.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });

    // 4. Reset auction state
    const stateRef = adminDb.collection("auctionState").doc("current");
    batch.set(stateRef, {
      currentPlayerId: null,
      currentHighestBid: 0,
      currentHighestTeamId: null,
      status: "idle",
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });

    // Commit batch
    await batch.commit();

    return NextResponse.json({ success: true, message: "Auction reset successfully" });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    const isAuthError = msg.includes("Unauthorized");
    return NextResponse.json(
      { error: msg },
      { status: isAuthError ? 401 : 500 }
    );
  }
}
