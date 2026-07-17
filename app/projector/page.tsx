"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { collection, onSnapshot, doc } from "firebase/firestore";
import { db } from "@/lib/firebaseClient";
import { calculateMaxAllowedBid, MAX_SQUAD_SIZE } from "@/lib/bidValidation";

interface Player {
  id: string;
  name: string;
  photoUrl?: string;
  role: string;
  basePrice: number;
  status: string;
  soldPrice?: number;
  soldToTeamId?: string;
  updatedAt?: { seconds: number; nanoseconds: number };
  stats?: {
    matches?: number;
    runs?: number;
    wickets?: number;
    average?: number;
  };
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

export default function ProjectorMode() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [auctionState, setAuctionState] = useState<AuctionState | null>(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  // Sold Animation Overlay state
  const [soldOverlay, setSoldOverlay] = useState<{
    type: "sold" | "unsold";
    playerName: string;
    teamName: string;
    price: number;
    photoUrl?: string;
  } | null>(null);


  useEffect(() => {
    const unsubPlayers = onSnapshot(collection(db, "players"), (snapshot) => {
      const pList: Player[] = [];
      snapshot.forEach((doc) => {
        pList.push({ id: doc.id, ...doc.data() } as Player);
      });
      setPlayers(pList);
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
        setAuctionState(docSnap.data() as AuctionState);
      }
    });

    return () => {
      unsubPlayers();
      unsubTeams();
      unsubState();
    };
  }, []);

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

  // Detect when a player is sold to trigger full-screen animation overlay
  useEffect(() => {
    if (!auctionState) return;

    // Check for recently updated sold or unsold players
    const finishedPlayers = players.filter((p) => p.status === "sold" || p.status === "unsold");
    if (finishedPlayers.length > 0) {
      const sortedFinished = [...finishedPlayers].sort((a, b) => {
        const aTime = a.updatedAt?.seconds || 0;
        const bTime = b.updatedAt?.seconds || 0;
        return bTime - aTime;
      });

      const latestFinished = sortedFinished[0];
      if (latestFinished) {
        const finishedSeconds = latestFinished.updatedAt?.seconds || 0;
        const nowSeconds = Math.floor(Date.now() / 1000);
        if (nowSeconds - finishedSeconds < 6) {
          const winningTeam = teams.find((t) => t.id === latestFinished.soldToTeamId);
          
          const stateTimer = setTimeout(() => {
            setSoldOverlay({
              type: latestFinished.status as "sold" | "unsold",
              playerName: latestFinished.name,
              teamName: winningTeam?.teamName || "Anonymous Team",
              price: latestFinished.soldPrice || latestFinished.basePrice,
              photoUrl: latestFinished.photoUrl,
            });
          }, 0);

          const hideTimer = setTimeout(() => {
            setSoldOverlay(null);
          }, 5000);

          return () => {
            clearTimeout(stateTimer);
            clearTimeout(hideTimer);
          };
        }
      }
    }
  }, [players, auctionState, teams]);

  const activePlayer = players.find((p) => p.id === auctionState?.currentPlayerId);
  const activeBidTeam = teams.find((t) => t.id === auctionState?.currentHighestTeamId);

  const queueIds = auctionState?.queue || [];
  const currentIndex = auctionState?.currentQueueIndex || 0;
  const upcomingQueue = queueIds
    .slice(currentIndex)
    .map((id) => players.find((p) => p.id === id))
    .filter((p): p is Player => p !== undefined);

  return (
    <div className="flex flex-col min-h-screen bg-[#070B13] text-slate-100 p-8 select-none font-sans overflow-hidden">
      {/* Dynamic Sold / Unsold Overlay */}
      {soldOverlay && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/95 animate-fade-in p-8 text-center">
          <div className={`absolute inset-0 bg-radial-gradient ${
            soldOverlay.type === "sold" ? "from-emerald-500/10" : "from-red-500/10"
          } to-transparent pointer-events-none`} />
          <div className="relative animate-scale-up flex flex-col items-center">
            <span className={`text-4xl sm:text-6xl font-black ${
              soldOverlay.type === "sold" ? "text-emerald-400" : "text-red-400"
            } uppercase tracking-widest mb-4 animate-bounce`}>
              🎉 {soldOverlay.type === "sold" ? "SOLD" : "UNSOLD"} 🎉
            </span>
            <div className={`relative h-44 w-44 sm:h-56 sm:w-56 overflow-hidden rounded-full border-4 ${
              soldOverlay.type === "sold" ? "border-emerald-500 shadow-[0_0_50px_rgba(16,185,129,0.3)]" : "border-red-500 shadow-[0_0_50px_rgba(239,68,68,0.3)]"
            } bg-slate-900 mb-6`}>
              {soldOverlay.photoUrl ? (
                <Image src={soldOverlay.photoUrl} alt={soldOverlay.playerName} fill className="object-cover" unoptimized />
              ) : (
                <span className="text-7xl flex items-center justify-center h-full">👤</span>
              )}
            </div>
            <h2 className="text-4xl sm:text-6xl font-black text-white uppercase tracking-wider mb-2">
              {soldOverlay.playerName}
            </h2>
            {soldOverlay.type === "sold" ? (
              <>
                <p className="text-xl sm:text-2xl text-slate-400 font-bold uppercase mb-4">
                  Secured by <span className="text-emerald-400">{soldOverlay.teamName}</span>
                </p>
                <div className="bg-emerald-500 text-slate-950 font-black text-3xl sm:text-5xl px-8 py-3.5 rounded-full shadow-lg tracking-wider">
                  {soldOverlay.price} PTS
                </div>
              </>
            ) : (
              <>
                <p className="text-xl sm:text-2xl text-slate-400 font-bold uppercase mb-4 text-red-400">
                  Returns to the Pool
                </p>
                <div className="bg-red-500 text-slate-950 font-black text-3xl sm:text-5xl px-8 py-3.5 rounded-full shadow-lg tracking-wider">
                  UNSOLD
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Main Grid Layout for Projector Display */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 flex-1">
        {/* Left Side: Active Bidding Arena (Projected Center Stage) */}
        <div className="lg:col-span-3 flex flex-col gap-8 justify-between">
          {/* Header Branding */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <h1 className="text-3xl font-black tracking-widest text-slate-200">
              EPL<span className="text-blue-500 font-medium">AUCTION</span>
            </h1>
            <div className="flex items-center gap-3">
              <span className="h-3 w-3 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-sm font-bold uppercase tracking-wider text-slate-400">
                Live Broadcast Mode
              </span>
            </div>
          </div>

          {/* Active Player Card Stage */}
          {activePlayer ? (
            <div className="flex-1 flex flex-col justify-center items-center py-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-12 w-full max-w-5xl items-center">
                {/* Stage headshot */}
                <div className="flex flex-col items-center justify-center">
                  <div className="relative h-64 w-64 sm:h-80 sm:w-80 overflow-hidden rounded-2xl border-2 border-slate-850 bg-slate-900/50 shadow-2xl flex items-center justify-center">
                    {activePlayer.photoUrl ? (
                      <Image
                        src={activePlayer.photoUrl}
                        alt={activePlayer.name}
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    ) : (
                      <span className="text-9xl">👤</span>
                    )}
                  </div>
                  <h2 className="text-3xl sm:text-5xl font-black text-slate-100 mt-6 tracking-wide text-center uppercase">
                    {activePlayer.name}
                  </h2>
                  <span className="mt-2 bg-blue-500/10 border border-blue-500/20 text-blue-400 font-bold px-4 py-1 rounded text-sm sm:text-base uppercase tracking-widest">
                    {activePlayer.role}
                  </span>
                </div>

                {/* Bidding logs & details */}
                <div className="flex flex-col gap-6 justify-center">
                  {timeLeft !== null && (
                    <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-2xl text-center relative overflow-hidden flex items-center justify-between px-6">
                      <div className="flex flex-col text-left">
                        <span className="text-[10px] text-amber-500 font-black uppercase tracking-widest animate-pulse">
                          ⏱️ Final Countdown
                        </span>
                        <span className="text-xs text-amber-400/80 font-medium">
                          Auto-selling to highest bidder in
                        </span>
                      </div>
                      <span className="text-4xl font-black text-amber-400">
                        {timeLeft}s
                      </span>
                    </div>
                  )}
                  <div className="bg-[#121927] border border-slate-800 p-6 rounded-2xl text-center">
                    <span className="text-xs text-slate-500 font-black uppercase tracking-widest block mb-1">
                      Current Highest Bid
                    </span>
                    <span className="text-5xl sm:text-7xl font-black text-yellow-400 tracking-wider">
                      {auctionState?.currentHighestBid || activePlayer.basePrice} <span className="text-xl sm:text-2xl text-slate-400">PTS</span>
                    </span>
                  </div>

                  <div className="bg-[#121927]/60 border border-slate-850 p-6 rounded-2xl text-center">
                    <span className="text-xs text-slate-500 font-black uppercase tracking-widest block mb-1">
                      Highest Bidder
                    </span>
                    <span className="text-2xl sm:text-4xl font-extrabold text-slate-200 tracking-wide block">
                      {activeBidTeam ? activeBidTeam.teamName : "NO BIDS PLACED"}
                    </span>
                    {activeBidTeam && (
                      <span className="text-xs text-slate-400 font-semibold block mt-1 uppercase">
                        Owner: {activeBidTeam.ownerName}
                      </span>
                    )}
                  </div>

                  {/* Player Stats Grid */}
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div className="bg-slate-900/50 p-4 border border-slate-850 rounded-xl">
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Base Price</span>
                      <span className="text-lg font-black text-slate-200">{activePlayer.basePrice} pts</span>
                    </div>
                    <div className="bg-slate-900/50 p-4 border border-slate-850 rounded-xl">
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Matches</span>
                      <span className="text-lg font-black text-slate-200">{activePlayer.stats?.matches ?? "-"}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center">
              <span className="text-7xl mb-4">📺</span>
              <h2 className="text-2xl sm:text-4xl font-black text-slate-400 uppercase tracking-widest">
                EPL Auction is Idle
              </h2>
              <p className="text-slate-550 text-sm mt-2">
                Waiting for the auction administrator to bring the next player to the stage.
              </p>
            </div>
          )}
        </div>

        {/* Right Side Sidebar: Live Budgets & Upcoming Queue */}
        <div className="flex flex-col gap-6 border-t lg:border-t-0 lg:border-l border-slate-800 lg:pl-6 pt-6 lg:pt-0 justify-between">
          {/* Teams Live Budgets */}
          <div className="flex flex-col gap-4">
            <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest border-b border-slate-800 pb-2">
              Franchise Ledgers
            </h3>
            <div className="flex flex-col gap-3 max-h-[350px] overflow-y-auto pr-1">
              {teams.map((t) => {
                const maxBid = calculateMaxAllowedBid(t.walletRemaining, t.playersBoughtCount);
                const isFull = t.playersBoughtCount >= MAX_SQUAD_SIZE;
                const isWinner = t.id === auctionState?.currentHighestTeamId;
                return (
                  <div
                    key={t.id}
                    className={`p-3.5 rounded-xl border transition-all ${
                      isWinner
                        ? "border-emerald-500 bg-emerald-500/5"
                        : "border-slate-850 bg-slate-900/30"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-slate-200 text-sm truncate max-w-[130px]">
                        {t.teamName}
                      </span>
                      <span className="text-xs bg-slate-800 px-2 py-0.5 rounded text-slate-400 font-bold">
                        {t.playersBoughtCount}/8
                      </span>
                    </div>
                    <div className="mt-2 flex justify-between items-center text-xs">
                      <div>
                        <span className="text-[9px] text-slate-500 block uppercase font-bold">Wallet</span>
                        <span className="font-bold text-slate-300">{t.walletRemaining} pts</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[9px] text-slate-500 block uppercase font-bold">Max Bid</span>
                        {isFull ? (
                          <span className="text-[10px] text-slate-500 font-bold block mt-0.5">Full</span>
                        ) : (
                          <span className="font-bold text-blue-400">{maxBid} pts</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Upcoming player sidebar queue */}
          <div className="flex flex-col gap-3">
            <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest border-b border-slate-800 pb-2">
              Queue Sequence
            </h3>
            <div className="flex flex-col gap-2 max-h-[200px] overflow-y-auto pr-1">
              {upcomingQueue.length > 0 ? (
                upcomingQueue.slice(0, 4).map((p, index) => (
                  <div
                    key={p.id}
                    className="flex items-center gap-3 p-2 bg-slate-900/10 border border-slate-850 rounded-lg text-xs"
                  >
                    <span className="text-slate-550 font-bold">#{index + 1}</span>
                    <span className="font-bold text-slate-350 truncate">{p.name}</span>
                    <span className="ml-auto text-[10px] bg-slate-800/80 px-1.5 py-0.5 rounded text-slate-400 font-semibold">
                      {p.role}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-550 text-center py-4">No upcoming players.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
