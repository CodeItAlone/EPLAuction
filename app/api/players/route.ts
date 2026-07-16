import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { verifyAdmin } from "@/lib/authHelper";
import { FieldValue } from "firebase-admin/firestore";

interface PlayerUpdateInput {
  name?: string;
  photoUrl?: string;
  role?: string;
  stats?: Record<string, unknown>;
  basePrice?: number;
  status?: string;
  soldPrice?: number | null;
  soldToTeamId?: string | null;
  updatedAt: FieldValue;
}

export async function GET() {
  try {
    const snapshot = await adminDb.collection("players").orderBy("name", "asc").get();
    const players = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    return NextResponse.json({ players });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await verifyAdmin(req);
    const body = await req.json();
    const { name, photoUrl, role, stats, basePrice } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Player name is required" }, { status: 400 });
    }

    if (!role || !["Batsman", "Bowler", "All-rounder", "Wicket-Keeper"].includes(role)) {
      return NextResponse.json({ error: "Invalid or missing player role" }, { status: 400 });
    }

    const price = typeof basePrice === "number" ? basePrice : 30;
    if (price < 30) {
      return NextResponse.json({ error: "Base price must be at least the tournament minimum (30)" }, { status: 400 });
    }

    // Check for duplicate name
    const duplicateSnap = await adminDb
      .collection("players")
      .where("name", "==", name.trim())
      .get();
    if (!duplicateSnap.empty) {
      return NextResponse.json({ error: "A player with this name already exists" }, { status: 400 });
    }

    const newPlayer = {
      name: name.trim(),
      photoUrl: photoUrl || "",
      role,
      stats: stats || {},
      basePrice: price,
      status: "pool",
      soldPrice: null,
      soldToTeamId: null,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    const docRef = await adminDb.collection("players").add(newPlayer);
    return NextResponse.json({ id: docRef.id, message: "Player created successfully" });
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
    const { id, name, photoUrl, role, stats, basePrice, status, soldPrice, soldToTeamId } = body;

    if (!id) {
      return NextResponse.json({ error: "Missing player ID" }, { status: 400 });
    }

    const playerRef = adminDb.collection("players").doc(id);
    const playerSnap = await playerRef.get();
    if (!playerSnap.exists) {
      return NextResponse.json({ error: "Player not found" }, { status: 404 });
    }

    const existingPlayer = playerSnap.data()!;

    // 1. Enforce sold player locks
    if (existingPlayer.status === "sold") {
      if (basePrice !== undefined && basePrice !== existingPlayer.basePrice) {
        return NextResponse.json({ error: "Cannot modify base price after player has been sold" }, { status: 400 });
      }
      if (soldPrice !== undefined && soldPrice !== existingPlayer.soldPrice) {
        return NextResponse.json({ error: "Cannot modify final price after player has been sold" }, { status: 400 });
      }
      if (soldToTeamId !== undefined && soldToTeamId !== existingPlayer.soldToTeamId) {
        return NextResponse.json({ error: "Cannot modify assigned team after player has been sold" }, { status: 400 });
      }
    }

    const updateData: PlayerUpdateInput = {
      updatedAt: FieldValue.serverTimestamp(),
    };

    // 2. Validate and edit Name
    if (name !== undefined) {
      if (!name || !name.trim()) {
        return NextResponse.json({ error: "Player name cannot be empty" }, { status: 400 });
      }
      // Check for duplicate name (excluding this player)
      const duplicateSnap = await adminDb
        .collection("players")
        .where("name", "==", name.trim())
        .get();
      const hasDuplicate = duplicateSnap.docs.some((doc) => doc.id !== id);
      if (hasDuplicate) {
        return NextResponse.json({ error: "A player with this name already exists" }, { status: 400 });
      }
      updateData.name = name.trim();
    }

    // 3. Validate Role
    if (role !== undefined) {
      if (!["Batsman", "Bowler", "All-rounder", "Wicket-Keeper"].includes(role)) {
        return NextResponse.json({ error: "Invalid player role" }, { status: 400 });
      }
      updateData.role = role;
    }

    // 4. Validate Base Price
    if (basePrice !== undefined) {
      if (typeof basePrice !== "number" || basePrice < 30) {
        return NextResponse.json({ error: "Base price must be a number and at least the tournament minimum (30)" }, { status: 400 });
      }
      updateData.basePrice = basePrice;
    }

    if (photoUrl !== undefined) updateData.photoUrl = photoUrl;
    if (stats !== undefined) updateData.stats = stats;
    if (status !== undefined) updateData.status = status;
    if (soldPrice !== undefined) updateData.soldPrice = soldPrice;
    if (soldToTeamId !== undefined) updateData.soldToTeamId = soldToTeamId;

    await playerRef.update(updateData as unknown as Record<string, unknown>);
    return NextResponse.json({ message: "Player updated successfully" });
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
      return NextResponse.json({ error: "Missing player ID parameter" }, { status: 400 });
    }

    await adminDb.collection("players").doc(id).delete();
    return NextResponse.json({ message: "Player deleted successfully" });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    const isAuthError = msg.includes("Unauthorized");
    return NextResponse.json({ error: msg }, { status: isAuthError ? 401 : 500 });
  }
}
