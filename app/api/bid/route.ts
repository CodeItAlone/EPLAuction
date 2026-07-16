import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { verifyAdmin } from "@/lib/authHelper";
import { calculateMaxAllowedBid, BASE_PRICE, MAX_SQUAD_SIZE } from "@/lib/bidValidation";
import { FieldValue } from "firebase-admin/firestore";

export async function POST(req: Request) {
  try {
    const adminUid = await verifyAdmin(req);
    const body = await req.json();
    const { playerId, teamId, bidAmount } = body;

    if (!playerId || !teamId || typeof bidAmount !== "number") {
      return NextResponse.json(
        { error: "Missing required fields: playerId, teamId, bidAmount" },
        { status: 400 }
      );
    }

    // Run within a firestore transaction for absolute consistency
    const result = await adminDb.runTransaction(async (transaction) => {
      const playerRef = adminDb.collection("players").doc(playerId);
      const teamRef = adminDb.collection("teams").doc(teamId);
      const stateRef = adminDb.collection("auctionState").doc("current");

      const playerSnap = await transaction.get(playerRef);
      const teamSnap = await transaction.get(teamRef);

      if (!playerSnap.exists) {
        throw new Error("Player not found");
      }
      if (!teamSnap.exists) {
        throw new Error("Team not found");
      }

      const player = playerSnap.data()!;
      const team = teamSnap.data()!;

      // Enforce player status check
      if (player.status !== "pool") {
        throw new Error(`Player is not in the pool. Current status: ${player.status}`);
      }

      // Enforce squad limit check
      if (team.playersBoughtCount >= MAX_SQUAD_SIZE) {
        throw new Error(`Squad is already complete (${MAX_SQUAD_SIZE}/${MAX_SQUAD_SIZE} players)`);
      }

      // Enforce base price validation
      if (bidAmount < BASE_PRICE) {
        throw new Error(`Bid amount must be at least the base price of ${BASE_PRICE}`);
      }

      // Enforce maximum allowed bid (reserve constraint validation)
      const maxAllowedBid = calculateMaxAllowedBid(team.walletRemaining, team.playersBoughtCount);
      if (bidAmount > maxAllowedBid) {
        const slotsAfterThis = MAX_SQUAD_SIZE - team.playersBoughtCount - 1;
        const reserveRequired = slotsAfterThis * BASE_PRICE;
        throw new Error(
          `Bid exceeds the maximum allowed bid of ${maxAllowedBid} (reserve requirement: ${reserveRequired} points for ${slotsAfterThis} remaining slots)`
        );
      }

      // Perform updates
      transaction.update(playerRef, {
        status: "sold",
        soldPrice: bidAmount,
        soldToTeamId: teamId,
        updatedAt: FieldValue.serverTimestamp(),
      });

      transaction.update(teamRef, {
        walletRemaining: team.walletRemaining - bidAmount,
        playersBoughtCount: team.playersBoughtCount + 1,
        playerIds: FieldValue.arrayUnion(playerId),
      });

      // Write log to bids collection
      const bidLogRef = adminDb.collection("bids").doc();
      transaction.set(bidLogRef, {
        playerId,
        teamId,
        bidAmount,
        isWinningBid: true,
        placedBy: adminUid,
        timestamp: FieldValue.serverTimestamp(),
      });

      // Reset live auctionState to idle/complete
      transaction.set(stateRef, {
        currentPlayerId: null,
        currentHighestBid: 0,
        currentHighestTeamId: null,
        status: "idle",
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });

      return { success: true, bidAmount, teamName: team.teamName };
    });

    return NextResponse.json(result);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    const isAuthError = msg.includes("Unauthorized");
    const isValidationError = msg.includes("exceeds") || 
                            msg.includes("below") || 
                            msg.includes("complete") || 
                            msg.includes("squad") || 
                            msg.includes("wallet") ||
                            msg.includes("base price");
    
    return NextResponse.json(
      { error: msg },
      { status: isAuthError ? 401 : isValidationError ? 400 : 500 }
    );
  }
}
