import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";

export async function GET() {
  try {
    const doc = await adminDb.collection("auctionState").doc("current").get();
    if (!doc.exists) {
      return NextResponse.json({
        currentPlayerId: null,
        currentHighestBid: 0,
        currentHighestTeamId: null,
        status: "WAITING",
        currentQueueIndex: 0,
        queue: [],
        bidHistory: [],
      });
    }
    const data = doc.data() || {};
    // Ensure fallback properties for backward compatibility
    return NextResponse.json({
      currentPlayerId: data.currentPlayerId ?? null,
      currentHighestBid: data.currentHighestBid ?? 0,
      currentHighestTeamId: data.currentHighestTeamId ?? null,
      status: data.status ?? "WAITING",
      currentQueueIndex: data.currentQueueIndex ?? 0,
      queue: data.queue ?? [],
      bidHistory: data.bidHistory ?? [],
      ...data,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { verifyAdmin } = await import("@/lib/authHelper");
    await verifyAdmin(req);
    const body = await req.json();
    const {
      currentPlayerId,
      currentHighestBid,
      currentHighestTeamId,
      status,
      currentQueueIndex,
      queue,
      bidHistory,
      bidTimerExpiresAt,
    } = body;

    const updateData: Record<string, unknown> = {
      updatedAt: FieldValue.serverTimestamp(),
    };

    if (currentPlayerId !== undefined) updateData.currentPlayerId = currentPlayerId;
    if (currentHighestBid !== undefined) updateData.currentHighestBid = currentHighestBid;
    if (currentHighestTeamId !== undefined) updateData.currentHighestTeamId = currentHighestTeamId;
    if (status !== undefined) updateData.status = status;
    if (currentQueueIndex !== undefined) updateData.currentQueueIndex = currentQueueIndex;
    if (queue !== undefined) updateData.queue = queue;
    if (bidHistory !== undefined) updateData.bidHistory = bidHistory;
    if (bidTimerExpiresAt !== undefined) updateData.bidTimerExpiresAt = bidTimerExpiresAt;

    const stateRef = adminDb.collection("auctionState").doc("current");
    await stateRef.set(updateData, { merge: true });

    return NextResponse.json({ message: "Auction state updated successfully" });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    const isAuthError = msg.includes("Unauthorized");
    return NextResponse.json({ error: msg }, { status: isAuthError ? 401 : 500 });
  }
}
