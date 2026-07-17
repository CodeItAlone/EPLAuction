"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot, doc } from "firebase/firestore";
import { db } from "@/lib/firebaseClient";
import { calculateMaxAllowedBid, validateBid, BASE_PRICE } from "@/lib/bidValidation";
import { useRouter } from "next/navigation";
import Image from "next/image";

interface Player {
  id: string;
  name: string;
  photoUrl?: string;
  role: "Batsman" | "Bowler" | "All-rounder" | "Wicket-Keeper";
  stats?: {
    matches?: number;
    runs?: number;
    wickets?: number;
    average?: number;
  };
  basePrice: number;
  status: "pool" | "sold" | "unsold";
  soldPrice?: number | null;
  soldToTeamId?: string | null;
}

interface Team {
  id: string;
  teamName: string;
  ownerName: string;
  logoUrl?: string;
  startingWallet: number;
  walletRemaining: number;
  playersBoughtCount: number;
}

interface AuctionState {
  currentPlayerId: string | null;
  currentHighestBid: number;
  currentHighestTeamId: string | null;
  status: string;
  queue?: string[];
  currentQueueIndex?: number;
  bidTimerExpiresAt?: number | null;
}

export default function LiveAuctionControl() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [auctionState, setAuctionState] = useState<AuctionState | null>(null);
  const [, setLoading] = useState(true);
  const router = useRouter();

  // Bidding inputs
  const [selectedBidTeamId, setSelectedBidTeamId] = useState("");
  const [proposedBid, setProposedBid] = useState(BASE_PRICE);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [activeQueueTab, setActiveQueueTab] = useState<"upcoming" | "completed" | "unqueued">("upcoming");
  const [searchQuery, setSearchQuery] = useState("");
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("admin_token");
    if (!token) {
      router.push("/admin/login");
      return;
    }

    const unsubPlayers = onSnapshot(collection(db, "players"), (snapshot) => {
      const pList: Player[] = [];
      snapshot.forEach((doc) => {
        pList.push({ id: doc.id, ...doc.data() } as Player);
      });
      setPlayers(pList);
      setLoading(false);
    });

    const unsubTeams = onSnapshot(collection(db, "teams"), (snapshot) => {
      const tList: Team[] = [];
      snapshot.forEach((doc) => {
        tList.push({ id: doc.id, ...doc.data() } as Team);
      });
      tList.sort((a, b) => a.teamName.localeCompare(b.teamName));
      setTeams(tList);
    });

    const unsubState = onSnapshot(doc(db, "auctionState", "current"), (docSnap) => {
      if (docSnap.exists()) {
        const state = docSnap.data() as AuctionState;
        setAuctionState(state);
        
        if (state.currentPlayerId) {
          const nextBidVal = state.currentHighestTeamId
            ? state.currentHighestBid + 10
            : state.currentHighestBid;
          setProposedBid(nextBidVal);
        }
      }
    });

    return () => {
      unsubPlayers();
      unsubTeams();
      unsubState();
    };
  }, [router]);

  // Auto-initialize queue if it is empty and players are loaded
  useEffect(() => {
    if (players.length > 0 && auctionState && (!auctionState.queue || auctionState.queue.length === 0)) {
      const initialQueue = players.filter(p => p.status === "pool").map(p => p.id);
      if (initialQueue.length > 0) {
        const token = localStorage.getItem("admin_token") || "";
        fetch("/api/auction/state", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            "x-bypass-admin-auth": token === "dev-bypass-token" ? "true" : "false",
          },
          body: JSON.stringify({ queue: initialQueue, currentQueueIndex: 0 }),
        }).catch(err => console.error("Auto queue init failed:", err));
      }
    }
  }, [players, auctionState]);

  const activePlayer = players.find((p) => p.id === auctionState?.currentPlayerId);

  const showStatus = (type: "success" | "error", text: string) => {
    setStatusMessage({ type, text });
    setTimeout(() => setStatusMessage(null), 4000);
  };

  const updateQueueState = async (newQueue: string[], newIndex: number) => {
    try {
      const token = localStorage.getItem("admin_token") || "";
      const res = await fetch("/api/auction/state", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "x-bypass-admin-auth": token === "dev-bypass-token" ? "true" : "false",
        },
        body: JSON.stringify({ queue: newQueue, currentQueueIndex: newIndex }),
      });
      if (!res.ok) {
        throw new Error("Failed to update queue");
      }
    } catch (err) {
      console.error(err);
      showStatus("error", "Failed to update queue");
    }
  };

  const handleMoveUp = (index: number) => {
    const queue = auctionState?.queue ?? [];
    const currentIndex = auctionState?.currentQueueIndex ?? 0;
    if (index <= currentIndex) return;
    const newQueue = [...queue];
    const temp = newQueue[index];
    newQueue[index] = newQueue[index - 1];
    newQueue[index - 1] = temp;
    updateQueueState(newQueue, currentIndex);
  };

  const handleMoveDown = (index: number) => {
    const queue = auctionState?.queue ?? [];
    const currentIndex = auctionState?.currentQueueIndex ?? 0;
    if (index >= queue.length - 1 || index < currentIndex) return;
    const newQueue = [...queue];
    const temp = newQueue[index];
    newQueue[index] = newQueue[index + 1];
    newQueue[index + 1] = temp;
    updateQueueState(newQueue, currentIndex);
  };

  const handleSkipPlayer = () => {
    const queue = auctionState?.queue ?? [];
    const index = auctionState?.currentQueueIndex ?? 0;
    if (index < queue.length) {
      updateQueueState(queue, index + 1);
      showStatus("success", "Active player slot skipped.");
    } else {
      showStatus("error", "End of queue reached.");
    }
  };

  const handleLoadNextPlayer = async () => {
    const queue = auctionState?.queue ?? [];
    const index = auctionState?.currentQueueIndex ?? 0;
    if (index >= queue.length) {
      showStatus("error", "All queued players have been auctioned!");
      return;
    }
    const nextPlayerId = queue[index];
    await handleSelectPlayer(nextPlayerId);
    await updateQueueState(queue, index + 1);
  };

  const handleRemovePlayerFromQueue = (playerId: string) => {
    const queue = auctionState?.queue ?? [];
    const index = auctionState?.currentQueueIndex ?? 0;
    const newQueue = queue.filter(id => id !== playerId);
    const queueIndex = queue.indexOf(playerId);
    const newIndex = queueIndex < index ? Math.max(0, index - 1) : index;
    updateQueueState(newQueue, newIndex);
    showStatus("success", "Player removed from queue sequence.");
  };

  const handleRestorePlayerToQueue = async (playerId: string) => {
    try {
      const token = localStorage.getItem("admin_token") || "";
      const res = await fetch("/api/auction/restore", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "x-bypass-admin-auth": token === "dev-bypass-token" ? "true" : "false",
        },
        body: JSON.stringify({ playerId }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to restore player");
      }

      showStatus("success", "Player successfully restored to upcoming queue.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      showStatus("error", msg);
    }
  };


  const handleSelectPlayer = async (playerId: string) => {
    try {
      const token = localStorage.getItem("admin_token") || "";
      const player = players.find((p) => p.id === playerId)!;

      const res = await fetch("/api/auction/state", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "x-bypass-admin-auth": token === "dev-bypass-token" ? "true" : "false",
        },
        body: JSON.stringify({
          currentPlayerId: playerId,
          currentHighestBid: player.basePrice || 30,
          currentHighestTeamId: null,
          status: "in-progress",
          bidTimerExpiresAt: null,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to set player");
      }

      setProposedBid(player.basePrice || 30);
      setSelectedBidTeamId("");
      showStatus("success", `Pulled up ${player.name} under the hammer!`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      showStatus("error", msg);
    }
  };

  const handleUpdateBid = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePlayer || !selectedBidTeamId) return;

    const team = teams.find((t) => t.id === selectedBidTeamId)!;
    const validation = validateBid(
      proposedBid,
      team.walletRemaining,
      team.playersBoughtCount,
      auctionState?.currentHighestBid || 0
    );

    if (!validation.isValid) {
      showStatus("error", validation.reason || "Invalid bid");
      return;
    }

    try {
      const token = localStorage.getItem("admin_token") || "";
      const res = await fetch("/api/auction/state", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "x-bypass-admin-auth": token === "dev-bypass-token" ? "true" : "false",
        },
        body: JSON.stringify({
          currentHighestBid: proposedBid,
          currentHighestTeamId: selectedBidTeamId,
          bidTimerExpiresAt: Date.now() + 30000,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to update bid");
      }

      showStatus("success", `Highest bid updated to ${proposedBid} pts!`);
      setProposedBid(proposedBid + 10);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      showStatus("error", msg);
    }
  };

  const handleConfirmSold = async () => {
    if (!activePlayer) return;

    const finalTeamId = auctionState?.currentHighestTeamId || selectedBidTeamId;
    const finalBidAmount = auctionState?.currentHighestTeamId 
      ? auctionState?.currentHighestBid 
      : activePlayer.basePrice;

    if (!finalTeamId || !finalBidAmount) {
      showStatus("error", "Cannot confirm sale: No team has been selected or bid recorded");
      return;
    }

    try {
      const token = localStorage.getItem("admin_token") || "";
      const res = await fetch("/api/bid", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "x-bypass-admin-auth": token === "dev-bypass-token" ? "true" : "false",
        },
        body: JSON.stringify({
          playerId: activePlayer.id,
          teamId: finalTeamId,
          bidAmount: finalBidAmount,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to sell player");
      }

      showStatus("success", `SOLD! ${activePlayer.name} has been sold!`);
      setSelectedBidTeamId("");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      showStatus("error", msg);
    }
  };

  const handleMarkUnsold = async () => {
    if (!activePlayer) return;

    try {
      const token = localStorage.getItem("admin_token") || "";
      const playerUpdateRes = await fetch("/api/players", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "x-bypass-admin-auth": token === "dev-bypass-token" ? "true" : "false",
        },
        body: JSON.stringify({
          id: activePlayer.id,
          status: "pool",
          soldPrice: null,
          soldToTeamId: null,
        }),
      });

      if (!playerUpdateRes.ok) {
        const err = await playerUpdateRes.json();
        throw new Error(err.error || "Failed to update player status");
      }

      await fetch("/api/auction/state", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "x-bypass-admin-auth": token === "dev-bypass-token" ? "true" : "false",
        },
        body: JSON.stringify({
          currentPlayerId: null,
          currentHighestBid: 0,
          currentHighestTeamId: null,
          status: "idle",
        }),
      });

      showStatus("success", `${activePlayer.name} marked as UNSOLD`);
      setSelectedBidTeamId("");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      showStatus("error", msg);
    }
  };

  const handleUndoSale = async () => {
    try {
      const token = localStorage.getItem("admin_token") || "";
      const res = await fetch("/api/bid/undo", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "x-bypass-admin-auth": token === "dev-bypass-token" ? "true" : "false",
        },
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Undo failed");
      }

      showStatus("success", "Sale successfully reversed! Player returned to pool.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      showStatus("error", msg);
    }
  };

  // Sync timeLeft with auctionState.bidTimerExpiresAt
  useEffect(() => {
    if (!auctionState?.bidTimerExpiresAt) {
      setTimeLeft(null);
      return;
    }

    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((auctionState.bidTimerExpiresAt! - Date.now()) / 1000));
      setTimeLeft(remaining);

      if (remaining === 0) {
        clearInterval(interval);
      }
    }, 500);

    const remaining = Math.max(0, Math.ceil((auctionState.bidTimerExpiresAt - Date.now()) / 1000));
    setTimeLeft(remaining);

    return () => clearInterval(interval);
  }, [auctionState?.bidTimerExpiresAt]);

  // Auto-sell when countdown hits 0
  useEffect(() => {
    if (timeLeft === 0 && activePlayer && auctionState?.currentHighestTeamId) {
      handleConfirmSold();
    }
  }, [timeLeft, activePlayer, auctionState?.currentHighestTeamId]);

  const queueIds = auctionState?.queue || [];
  const currentIndex = auctionState?.currentQueueIndex || 0;

  // Stably sort players by creation time or name to get permanent registration numbers
  const sortedPlayersForReg = [...players].sort((a, b) => {
    const timeA = (a as any).createdAt?.seconds || 0;
    const timeB = (b as any).createdAt?.seconds || 0;
    if (timeA !== timeB) return timeA - timeB;
    return a.name.localeCompare(b.name);
  });

  const getRegNo = (playerId: string) => {
    return sortedPlayersForReg.findIndex((p) => p.id === playerId) + 1;
  };

  const upcomingQueue = queueIds
    .slice(currentIndex)
    .map((id: string) => players.find(p => p.id === id))
    .filter((p: Player | undefined): p is Player => p !== undefined);

  const completedQueue = players.filter(p => p.status === "sold");

  const unqueuedPool = players.filter(p => 
    p.status === "pool" && 
    p.id !== activePlayer?.id && 
    !queueIds.slice(currentIndex).includes(p.id)
  );

  const handleHoistToNext = async (playerId: string) => {
    const queue = auctionState?.queue ?? [];
    const index = auctionState?.currentQueueIndex ?? 0;

    const oldIndex = queue.indexOf(playerId);
    let newQueue = queue.filter((id) => id !== playerId);
    
    // If the player was in the completed part (before current index),
    // removing them shifts all subsequent items left by 1.
    // So the new upcoming insertion index should be index - 1.
    const insertionIndex = (oldIndex !== -1 && oldIndex < index) ? Math.max(0, index - 1) : index;

    newQueue.splice(insertionIndex, 0, playerId);

    await updateQueueState(newQueue, insertionIndex);
    showStatus("success", "Player moved to the next slot in the queue.");
  };

  const regNum = parseInt(searchQuery, 10);
  const isValidSearch = !isNaN(regNum) && regNum >= 1 && regNum <= players.length;
  const isOutOfBounds = searchQuery.trim() !== "" && (isNaN(regNum) || regNum < 1 || regNum > players.length);

  const searchResults = isValidSearch && sortedPlayersForReg[regNum - 1]
    ? (() => {
        const p = sortedPlayersForReg[regNum - 1];
        let section: "upcoming" | "completed" | "unqueued" | "hammer" = "unqueued";
        let queuePosition = -1;

        if (p.id === activePlayer?.id) {
          section = "hammer";
        } else if (p.status === "sold") {
          section = "completed";
        } else {
          const qIdx = queueIds.indexOf(p.id);
          if (qIdx !== -1 && qIdx >= currentIndex) {
            section = "upcoming";
            queuePosition = qIdx - currentIndex + 1;
          }
        }

        return [{ player: p, section, queuePosition }];
      })()
    : [];

  return (
    <div className="mx-auto w-full max-w-7xl px-6 py-8 text-slate-100 flex-1 grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 flex flex-col gap-6">
        <div className="rounded-xl border border-slate-800 bg-[#1E293B] p-6">
          <h2 className="text-xl font-extrabold uppercase tracking-wider mb-6 border-b border-slate-850 pb-3 flex items-center justify-between">
            <span>📺 Live Auction Hammer</span>
            <button
              onClick={handleUndoSale}
              className="rounded bg-slate-800 border border-slate-700 px-3 py-1.5 text-xs font-bold hover:bg-slate-750 transition-colors"
            >
              ↩️ Undo Last Sale
            </button>
          </h2>

          {statusMessage && (
            <div
              className={`mb-4 rounded-lg border p-3 text-sm font-semibold ${
                statusMessage.type === "success"
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                  : "border-red-500/30 bg-red-500/10 text-red-400"
              }`}
            >
              {statusMessage.text}
            </div>
          )}

          {activePlayer ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-slate-900/40 p-5 rounded-xl border border-slate-800/80 text-center">
                <div className="mx-auto mb-4 relative h-28 w-28 overflow-hidden rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center">
                  {activePlayer.photoUrl ? (
                    <Image src={activePlayer.photoUrl} alt={activePlayer.name} fill className="object-cover" unoptimized />
                  ) : (
                    <span className="text-5xl">👤</span>
                  )}
                </div>
                <h3 className="text-2xl font-black text-slate-100">{activePlayer.name}</h3>
                <span className="inline-block mt-1 bg-blue-500/10 border border-blue-500/20 px-2.5 py-0.5 rounded text-xs font-bold text-blue-400">
                  {activePlayer.role}
                </span>

                <div className="mt-4 grid grid-cols-2 gap-2 text-center text-xs bg-slate-900 p-3 rounded">
                  <div>
                    <span className="text-[10px] text-slate-500 block uppercase font-bold">Base Price</span>
                    <span className="text-sm font-bold text-slate-300">{activePlayer.basePrice} pts</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block uppercase font-bold">Matches</span>
                    <span className="text-sm font-bold text-slate-300">{activePlayer.stats?.matches ?? "-"}</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col justify-between">
                <div>
                  {timeLeft !== null && (
                    <div className="mb-4 flex items-center justify-between bg-amber-500/10 border border-amber-500/20 p-3 rounded-lg">
                      <span className="text-xs font-bold text-amber-400 uppercase tracking-widest animate-pulse">⏱️ Live Bid Timer</span>
                      <span className="text-2xl font-black text-amber-400">{timeLeft}s</span>
                    </div>
                  )}
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Record Live Bid</h4>
                  
                  <form onSubmit={handleUpdateBid} className="flex flex-col gap-4">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                        Bidding Team
                      </label>
                      <select
                        required
                        value={selectedBidTeamId}
                        onChange={(e) => setSelectedBidTeamId(e.target.value)}
                        className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-white focus:border-blue-500 focus:outline-none"
                      >
                        <option value="">-- Choose Team --</option>
                        {teams.map((t) => {
                          const maxBid = calculateMaxAllowedBid(t.walletRemaining, t.playersBoughtCount);
                          const isEligible = t.playersBoughtCount < 8 && maxBid >= BASE_PRICE;
                          return (
                            <option key={t.id} value={t.id} disabled={!isEligible}>
                              {t.teamName} ({t.walletRemaining} pts left - Max bid: {maxBid} pts) {!isEligible ? "[INELIGIBLE]" : ""}
                            </option>
                          );
                        })}
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                        Bid Amount (Points)
                      </label>
                      <input
                        type="number"
                        required
                        min={BASE_PRICE}
                        step={10}
                        value={proposedBid}
                        onChange={(e) => setProposedBid(Number(e.target.value))}
                        className="w-full rounded-lg border border-slate-700 bg-slate-900/60 px-4 py-2.5 text-sm text-white focus:border-blue-500 focus:outline-none"
                      />
                    </div>

                    <button
                      type="submit"
                      className="rounded bg-blue-600 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-blue-500"
                    >
                      Update Highest Bid
                    </button>
                  </form>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-6 border-t border-slate-800/80 pt-4">
                  <button
                    onClick={handleConfirmSold}
                    className="rounded bg-emerald-600 px-4 py-3 text-sm font-black text-white hover:bg-emerald-500 transition-colors uppercase tracking-wider"
                  >
                    Confirm Sold
                  </button>
                  <button
                    onClick={handleMarkUnsold}
                    className="rounded bg-red-600 px-4 py-3 text-sm font-black text-white hover:bg-red-500 transition-colors uppercase tracking-wider"
                  >
                    Mark Unsold
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 border border-dashed border-slate-800 rounded-lg">
              <span className="text-4xl block mb-2">📥</span>
              <p className="text-slate-500 text-sm">No player is currently under the hammer.</p>
              <p className="text-slate-600 text-xs mt-1">Select an available player from the pool below to begin bidding.</p>
            </div>
          )}
        </div>

        <div className="rounded-xl border border-slate-800 bg-[#1E293B] p-6">
          <div className="flex flex-col border-b border-slate-800 pb-3 mb-4 gap-3">
            <h3 className="text-lg font-bold text-slate-355 uppercase tracking-wider">
              Auction Queue Dashboard
            </h3>
            <div className="relative w-full">
              <input
                type="number"
                min={1}
                max={players.length}
                placeholder={`🔍 Search by registration number (1–${players.length})...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm text-white placeholder-slate-400 focus:border-blue-500 focus:outline-none"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-sm"
                >
                  ✕
                </button>
              )}
            </div>
            {isOutOfBounds && (
              <p className="text-red-400 text-xs font-semibold">
                ⚠️ Invalid registration number. Range is 1 to {players.length}
              </p>
            )}
          </div>

          {!searchQuery && (
            <div className="flex border-b border-slate-800 pb-2 mb-4 justify-end">
              <div className="flex gap-2 text-xs font-bold">
                <button
                  onClick={() => setActiveQueueTab("upcoming")}
                  className={`px-3 py-1 rounded transition-colors ${
                    activeQueueTab === "upcoming" ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-400"
                  }`}
                >
                  Upcoming ({upcomingQueue.length})
                </button>
                <button
                  onClick={() => setActiveQueueTab("completed")}
                  className={`px-3 py-1 rounded transition-colors ${
                    activeQueueTab === "completed" ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-400"
                  }`}
                >
                  Completed ({completedQueue.length})
                </button>
                <button
                  onClick={() => setActiveQueueTab("unqueued")}
                  className={`px-3 py-1 rounded transition-colors ${
                    activeQueueTab === "unqueued" ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-400"
                  }`}
                >
                  Unqueued Pool ({unqueuedPool.length})
                </button>
              </div>
            </div>
          )}

          {searchQuery ? (
            <div className="flex flex-col gap-3 max-h-[300px] overflow-y-auto pr-2">
              {!isOutOfBounds && searchResults.length > 0 ? (
                searchResults.map(({ player: p, section, queuePosition }) => {
                  const boughtTeam = p.soldToTeamId ? teams.find(t => t.id === p.soldToTeamId) : null;
                  return (
                    <div
                      key={p.id}
                      className="flex items-center justify-between p-3 bg-slate-900/40 rounded-lg border border-slate-800 hover:border-slate-700 transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <div className="relative h-10 w-10 overflow-hidden rounded bg-slate-800 flex items-center justify-center border border-slate-750">
                          {p.photoUrl ? (
                            <Image src={p.photoUrl} alt={p.name} fill className="object-cover" unoptimized />
                          ) : (
                            <span>👤</span>
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-bold text-slate-200 text-sm line-clamp-1">#{getRegNo(p.id)} {p.name}</p>
                            <span className="text-[10px] bg-slate-800 px-1.5 py-0.5 rounded text-slate-400 font-semibold">{p.role}</span>
                          </div>
                          <div className="flex flex-col gap-1 mt-1">
                            {section === "hammer" && (
                              <span className="text-[9px] bg-red-500/10 text-red-400 border border-red-500/20 px-1.5 py-0.5 rounded font-bold w-fit">
                                🔨 Under Hammer
                              </span>
                            )}
                            {section === "upcoming" && (
                              <span className="text-[9px] bg-blue-500/10 text-blue-400 border border-blue-500/20 px-1.5 py-0.5 rounded font-bold w-fit">
                                Upcoming (Position #{queuePosition})
                              </span>
                            )}
                            {section === "completed" && (
                              <div className="flex flex-col gap-1">
                                <span className={`text-[9px] border px-1.5 py-0.5 rounded font-bold w-fit ${
                                  p.status === "sold" 
                                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" 
                                    : "bg-red-500/10 text-red-400 border-red-500/20"
                                }`}>
                                  Completed ({p.status})
                                </span>
                                {p.status === "sold" && (
                                  <span className="text-[10px] font-semibold text-slate-400">
                                    Sold to <span className="text-slate-300 font-bold">{boughtTeam?.teamName || "unknown team"}</span> for <span className="text-emerald-400 font-bold">{p.soldPrice} pts</span>
                                  </span>
                                )}
                              </div>
                            )}
                            {section === "unqueued" && (
                              <span className="text-[9px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-1.5 py-0.5 rounded font-bold w-fit">
                                Unqueued Pool
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div>
                        {section === "upcoming" && queuePosition > 1 && (
                          <button
                            onClick={() => handleHoistToNext(p.id)}
                            className="rounded bg-blue-600/20 text-blue-400 border border-blue-500/20 px-3 py-1 text-xs font-bold hover:bg-blue-600 hover:text-white transition-all uppercase tracking-wider"
                          >
                            ⚡ Make Next
                          </button>
                        )}
                        {section === "unqueued" && (
                          <button
                            onClick={() => handleHoistToNext(p.id)}
                            className="rounded bg-emerald-600/20 text-emerald-400 border border-emerald-500/20 px-3 py-1 text-xs font-bold hover:bg-emerald-600 hover:text-white transition-all uppercase tracking-wider"
                          >
                            + Add to Next
                          </button>
                        )}
                        {section === "completed" && (
                          <button
                            onClick={() => handleHoistToNext(p.id)}
                            className="rounded bg-amber-600/20 text-amber-400 border border-amber-500/20 px-3 py-1 text-xs font-bold hover:bg-amber-600 hover:text-white transition-all uppercase tracking-wider"
                          >
                            ↩️ Restore to Next
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-slate-500 text-sm text-center py-6">
                  {isOutOfBounds ? "Please correct search query" : `No player registered at registration number ${searchQuery}`}
                </p>
              )}
            </div>
          ) : (
            <>
              {activeQueueTab === "upcoming" && (
                <div className="flex flex-col gap-3 max-h-[300px] overflow-y-auto pr-2">
                  {upcomingQueue.length > 0 ? (
                    upcomingQueue.map((p, index) => {
                      const globalIndex = currentIndex + index;
                      return (
                        <div
                          key={p.id}
                          className="flex items-center justify-between p-3 bg-slate-900/40 rounded-lg border border-slate-800 hover:border-slate-750 transition-all"
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-xs text-slate-500 font-bold w-4">#{index + 1}</span>
                            <div className="relative h-10 w-10 overflow-hidden rounded bg-slate-800 flex items-center justify-center border border-slate-750">
                              {p.photoUrl ? (
                                <Image src={p.photoUrl} alt={p.name} fill className="object-cover" unoptimized />
                              ) : (
                                <span>👤</span>
                              )}
                            </div>
                            <div>
                              <p className="font-bold text-slate-200 text-sm line-clamp-1">#{getRegNo(p.id)} {p.name}</p>
                              <span className="text-[10px] bg-slate-800 px-1.5 py-0.5 rounded text-slate-400 font-semibold">{p.role}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {index === 0 && (
                              <button
                                onClick={handleLoadNextPlayer}
                                className="rounded bg-emerald-600/20 text-emerald-400 border border-emerald-500/20 px-3 py-1 text-xs font-bold hover:bg-emerald-600 hover:text-white transition-all uppercase tracking-wider"
                              >
                                🔨 Load
                              </button>
                            )}
                            <button
                              disabled={index === 0}
                              onClick={() => handleMoveUp(globalIndex)}
                              className="p-1 text-slate-400 hover:text-slate-200 transition-colors disabled:opacity-30 disabled:hover:text-slate-400"
                            >
                              ▲
                            </button>
                            <button
                              disabled={globalIndex >= queueIds.length - 1}
                              onClick={() => handleMoveDown(globalIndex)}
                              className="p-1 text-slate-400 hover:text-slate-200 transition-colors disabled:opacity-30 disabled:hover:text-slate-400"
                            >
                              ▼
                            </button>
                            <button
                              onClick={() => handleRemovePlayerFromQueue(p.id)}
                              className="p-1 text-red-400 hover:text-red-300 transition-colors"
                              title="Remove from queue"
                            >
                              ❌
                            </button>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-6 text-slate-500 text-sm">
                      <p>Queue is currently empty.</p>
                      <button
                        onClick={handleSkipPlayer}
                        className="mt-2 text-xs text-blue-400 font-bold hover:underline"
                      >
                        Skip Active Slot
                      </button>
                    </div>
                  )}
                </div>
              )}

              {activeQueueTab === "completed" && (
                <div className="flex flex-col gap-3 max-h-[300px] overflow-y-auto pr-2">
                  {completedQueue.length > 0 ? (
                    completedQueue.map((p) => (
                      <div
                        key={p.id}
                        className="flex items-center justify-between p-3 bg-slate-900/20 rounded-lg border border-slate-855 hover:border-slate-800 transition-all"
                      >
                        <div className="flex items-center gap-3">
                          <div className="relative h-10 w-10 overflow-hidden rounded bg-slate-855 flex items-center justify-center border border-slate-800">
                            {p.photoUrl ? (
                              <Image src={p.photoUrl} alt={p.name} fill className="object-cover" unoptimized />
                            ) : (
                              <span>👤</span>
                            )}
                          </div>
                          <div>
                            <p className="font-bold text-slate-355 text-sm line-clamp-1">#{getRegNo(p.id)} {p.name}</p>
                            <span className="text-[10px] bg-slate-800 px-1.5 py-0.5 rounded text-slate-500 font-semibold uppercase">{p.status}</span>
                          </div>
                        </div>
                        <button
                          onClick={() => handleRestorePlayerToQueue(p.id)}
                          className="rounded bg-blue-600/10 text-blue-400 border border-blue-500/15 px-3 py-1 text-xs font-bold hover:bg-blue-600 hover:text-white transition-all"
                        >
                          Restore to Queue
                        </button>
                      </div>
                    ))
                  ) : (
                    <p className="text-slate-500 text-sm text-center py-6">No completed players yet.</p>
                  )}
                </div>
              )}

              {activeQueueTab === "unqueued" && (
                <div className="flex flex-col gap-3 max-h-[300px] overflow-y-auto pr-2">
                  {unqueuedPool.length > 0 ? (
                    unqueuedPool.map((p) => (
                      <div
                        key={p.id}
                        className="flex items-center justify-between p-3 bg-slate-900/40 rounded-lg border border-slate-800 hover:border-slate-700 transition-all"
                      >
                        <div className="flex items-center gap-3">
                          <div className="relative h-10 w-10 overflow-hidden rounded bg-slate-800 flex items-center justify-center border border-slate-755">
                            {p.photoUrl ? (
                              <Image src={p.photoUrl} alt={p.name} fill className="object-cover" unoptimized />
                            ) : (
                              <span>👤</span>
                            )}
                          </div>
                          <div>
                            <p className="font-bold text-slate-200 text-sm line-clamp-1">#{getRegNo(p.id)} {p.name}</p>
                            <span className="text-[10px] bg-slate-800 px-1.5 py-0.5 rounded text-slate-400 font-semibold">{p.role}</span>
                          </div>
                        </div>
                        <button
                          onClick={() => handleRestorePlayerToQueue(p.id)}
                          className="rounded bg-blue-600/20 text-blue-400 border border-blue-500/20 px-3 py-1 text-xs font-bold hover:bg-blue-600 hover:text-white transition-all"
                        >
                          + Add to Queue
                        </button>
                      </div>
                    ))
                  ) : (
                    <p className="text-slate-500 text-sm text-center py-6">No unqueued players available in pool.</p>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <h3 className="text-lg font-bold text-slate-300 uppercase tracking-wider border-b border-slate-880 pb-2 mb-2">
          Teams Live Budgets
        </h3>
        {teams.map((t) => {
          const maxBid = calculateMaxAllowedBid(t.walletRemaining, t.playersBoughtCount);
          const isFull = t.playersBoughtCount >= 8;
          const isHighestBidder = t.id === auctionState?.currentHighestTeamId;
          
          return (
            <div
              key={t.id}
              className={`rounded-xl border p-4 bg-[#1E293B] ${
                isHighestBidder
                  ? "border-emerald-500/50 ring-1 ring-emerald-500/30"
                  : "border-slate-800"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center font-bold text-slate-400">
                    {t.logoUrl ? (
                      <Image src={t.logoUrl} alt={t.teamName} width={32} height={32} className="object-cover rounded-full" unoptimized />
                    ) : (
                      t.teamName.substring(0, 2).toUpperCase()
                    )}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-200 line-clamp-1">{t.teamName}</h4>
                    <p className="text-[10px] text-slate-400">Owner: {t.ownerName}</p>
                  </div>
                </div>
                {isHighestBidder && (
                  <span className="text-[9px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded font-black uppercase tracking-wider animate-pulse">
                    Highest Bidder
                  </span>
                )}
              </div>

              <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs pt-2 border-t border-slate-850">
                <div>
                  <span className="text-[9px] text-slate-500 block uppercase font-bold">Wallet</span>
                  <span className="font-extrabold text-slate-200">{t.walletRemaining}</span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-500 block uppercase font-bold">Squad</span>
                  <span className="font-extrabold text-slate-200">{t.playersBoughtCount} / 8</span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-500 block uppercase font-bold">Max Allowed</span>
                  {isFull ? (
                    <span className="text-[10px] text-slate-500 font-bold block mt-0.5">8/8 Full</span>
                  ) : maxBid < BASE_PRICE ? (
                    <span className="text-[10px] text-red-400 font-bold block mt-0.5">Ineligible</span>
                  ) : (
                    <span className="font-extrabold text-blue-400">{maxBid}</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
