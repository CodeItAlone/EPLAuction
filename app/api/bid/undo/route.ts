import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { verifyAdmin } from "@/lib/authHelper";
import { FieldValue } from "firebase-admin/firestore";

export async function POST(req: Request) {
  try {
    await verifyAdmin(req);

    // 1. Find the most recent winning bid outside the transaction
    const bidsRef = adminDb.collection("bids");
    const recentBidSnap = await bidsRef
      .where("isWinningBid", "==", true)
      .orderBy("timestamp", "desc")
      .limit(1)
      .get();

    if (recentBidSnap.empty) {
      return NextResponse.json(
        { error: "No winning bids found to undo" },
        { status: 400 }
      );
    }

    const bidDoc = recentBidSnap.docs[0];
    const bidDocRef = bidDoc.ref;
    const { playerId, teamId, bidAmount } = bidDoc.data();

    // 2. Run updates within a transaction
    const result = await adminDb.runTransaction(async (transaction) => {
      const playerRef = adminDb.collection("players").doc(playerId);
      const teamRef = adminDb.collection("teams").doc(teamId);
      const stateRef = adminDb.collection("auctionState").doc("current");

      const playerSnap = await transaction.get(playerRef);
      const teamSnap = await transaction.get(teamRef);
      const stateSnap = await transaction.get(stateRef);

      if (!playerSnap.exists || !teamSnap.exists) {
        throw new Error("Referenced player or team not found");
      }

      const player = playerSnap.data()!;
      const team = teamSnap.data()!;
      const state = stateSnap.exists ? stateSnap.data()! : {};

      if (player.status !== "sold" || player.soldToTeamId !== teamId) {
        throw new Error("Player status has changed; cannot undo automatically");
      }

      // Revert player
      transaction.update(playerRef, {
        status: "pool",
        soldPrice: null,
        soldToTeamId: null,
        updatedAt: FieldValue.serverTimestamp(),
      });

      // Revert team
      transaction.update(teamRef, {
        walletRemaining: team.walletRemaining + bidAmount,
        playersBoughtCount: Math.max(0, team.playersBoughtCount - 1),
        playerIds: FieldValue.arrayRemove(playerId),
      });

      // Delete the bid log
      transaction.delete(bidDocRef);

      // Re-align queue index if player is in the queue sequence
      let currentQueueIndex = state.currentQueueIndex ?? 0;
      if (state.queue && Array.isArray(state.queue)) {
        const pIdx = state.queue.indexOf(playerId);
        if (pIdx !== -1) {
          // Player is at index pIdx, so make them the next in line (index pIdx) or keep as active
          currentQueueIndex = pIdx + 1;
        }
      }

      // Reset the auctionState to this player, ready to bid again
      transaction.set(stateRef, {
        currentPlayerId: playerId,
        currentHighestBid: player.basePrice || 30,
        currentHighestTeamId: null,
        status: "in-progress",
        currentQueueIndex,
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });

      return { success: true, undonePlayerId: playerId, undoneBidAmount: bidAmount };
    });

    return NextResponse.json(result);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    const isAuthError = msg.includes("Unauthorized");
    return NextResponse.json(
      { error: msg },
      { status: isAuthError ? 401 : 500 }
    );
  }
}
