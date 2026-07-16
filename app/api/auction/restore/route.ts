import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";

export async function POST(req: Request) {
  try {
    const { verifyAdmin } = await import("@/lib/authHelper");
    await verifyAdmin(req);
    const body = await req.json();
    const { playerId } = body;

    if (!playerId) {
      return NextResponse.json({ error: "Missing player ID" }, { status: 400 });
    }

    // 1. Check for winning bids for this player outside the transaction
    const bidsRef = adminDb.collection("bids");
    const bidSnap = await bidsRef
      .where("playerId", "==", playerId)
      .where("isWinningBid", "==", true)
      .limit(1)
      .get();

    const winningBidDocRef = !bidSnap.empty ? bidSnap.docs[0].ref : null;
    const winningBidData = !bidSnap.empty ? bidSnap.docs[0].data() : null;

    // 2. Execute transactional updates
    const result = await adminDb.runTransaction(async (transaction) => {
      const playerRef = adminDb.collection("players").doc(playerId);
      const stateRef = adminDb.collection("auctionState").doc("current");

      const playerSnap = await transaction.get(playerRef);
      const stateSnap = await transaction.get(stateRef);

      if (!playerSnap.exists) {
        throw new Error("Player not found");
      }

      const player = playerSnap.data()!;
      const state = stateSnap.exists ? stateSnap.data()! : {};

      // If player is sold, refund the team
      if (player.status === "sold" && player.soldToTeamId) {
        const teamRef = adminDb.collection("teams").doc(player.soldToTeamId);
        const teamSnap = await transaction.get(teamRef);
        
        if (teamSnap.exists) {
          const team = teamSnap.data()!;
          const refundAmount = player.soldPrice || winningBidData?.bidAmount || player.basePrice || 30;
          
          transaction.update(teamRef, {
            walletRemaining: team.walletRemaining + refundAmount,
            playersBoughtCount: Math.max(0, team.playersBoughtCount - 1),
            playerIds: FieldValue.arrayRemove(playerId),
          });
        }
      }

      // Revert player details
      transaction.update(playerRef, {
        status: "pool",
        soldPrice: null,
        soldToTeamId: null,
        updatedAt: FieldValue.serverTimestamp(),
      });

      // Delete winning bid document if it exists
      if (winningBidDocRef) {
        transaction.delete(winningBidDocRef);
      }

      // Adjust queue sequence
      const queue: string[] = state.queue ? [...state.queue] : [];
      let currentQueueIndex = state.currentQueueIndex ?? 0;

      const pIdx = queue.indexOf(playerId);
      if (pIdx !== -1) {
        // Player is currently in the queue
        if (pIdx < currentQueueIndex) {
          // Completed portion -> remove from completed, decrement index, append to upcoming end
          queue.splice(pIdx, 1);
          currentQueueIndex = Math.max(0, currentQueueIndex - 1);
          queue.push(playerId);
        }
        // If pIdx >= currentQueueIndex, they are already in upcoming queue. Nothing to change.
      } else {
        // Not in queue -> append to upcoming end
        queue.push(playerId);
      }

      transaction.update(stateRef, {
        queue,
        currentQueueIndex,
        updatedAt: FieldValue.serverTimestamp(),
      });

      return { success: true, message: "Player restored to upcoming queue successfully" };
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
