import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { verifyAdmin } from "@/lib/authHelper";
import { FieldValue } from "firebase-admin/firestore";

interface TeamUpdateInput {
  teamName?: string;
  ownerName?: string;
  logoUrl?: string;
  startingWallet?: number;
  walletRemaining?: number;
}

export async function GET() {
  try {
    const snapshot = await adminDb.collection("teams").orderBy("teamName", "asc").get();
    const teams = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    return NextResponse.json({ teams });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await verifyAdmin(req);
    const body = await req.json();
    const { teamName, ownerName, logoUrl, startingWallet } = body;

    if (!teamName || !ownerName) {
      return NextResponse.json({ error: "Missing required fields: teamName, ownerName" }, { status: 400 });
    }

    const wallet = typeof startingWallet === "number" ? startingWallet : 1000;

    const newTeam = {
      teamName,
      ownerName,
      logoUrl: logoUrl || "",
      startingWallet: wallet,
      walletRemaining: wallet,
      playersBoughtCount: 0,
      playerIds: [],
      createdAt: FieldValue.serverTimestamp(),
    };

    const docRef = await adminDb.collection("teams").add(newTeam);
    return NextResponse.json({ id: docRef.id, message: "Team created successfully" });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    const isAuthError = msg.includes("Unauthorized");
    return NextResponse.json({ error: msg }, { status: isAuthError ? 401 : 500 });
  }
}

export async function PUT(req: Request) {
  try {
    await verifyAdmin(req);
    const body = await req.json();
    const { id, teamName, ownerName, logoUrl, startingWallet } = body;

    if (!id) {
      return NextResponse.json({ error: "Missing team ID" }, { status: 400 });
    }

    const updateData: TeamUpdateInput = {};

    if (teamName !== undefined) updateData.teamName = teamName;
    if (ownerName !== undefined) updateData.ownerName = ownerName;
    if (logoUrl !== undefined) updateData.logoUrl = logoUrl;
    if (startingWallet !== undefined) {
      const teamRef = adminDb.collection("teams").doc(id);
      const teamSnap = await teamRef.get();
      if (teamSnap.exists) {
        const teamData = teamSnap.data()!;
        const currentSpent = teamData.startingWallet - teamData.walletRemaining;
        updateData.startingWallet = startingWallet;
        updateData.walletRemaining = startingWallet - currentSpent;
      }
    }

    await adminDb.collection("teams").doc(id).update(updateData as unknown as Record<string, unknown>);
    return NextResponse.json({ message: "Team updated successfully" });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    const isAuthError = msg.includes("Unauthorized");
    return NextResponse.json({ error: msg }, { status: isAuthError ? 401 : 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    await verifyAdmin(req);
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Missing team ID parameter" }, { status: 400 });
    }

    await adminDb.collection("teams").doc(id).delete();
    return NextResponse.json({ message: "Team deleted successfully" });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    const isAuthError = msg.includes("Unauthorized");
    return NextResponse.json({ error: msg }, { status: isAuthError ? 401 : 500 });
  }
}
