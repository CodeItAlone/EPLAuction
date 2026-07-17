"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot, doc } from "firebase/firestore";
import { db } from "@/lib/firebaseClient";
import { calculateMaxAllowedBid } from "@/lib/bidValidation";
import PlayerCard from "@/components/PlayerCard";
import TeamCard from "@/components/TeamCard";
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
  soldPrice: number | null;
  soldToTeamId: string | null;
}

interface Team {
  id: string;
  teamName: string;
  ownerName: string;
  logoUrl?: string;
  startingWallet: number;
  walletRemaining: number;
  playersBoughtCount: number;
  playerIds: string[];
}

interface AuctionState {
  currentPlayerId: string | null;
  currentHighestBid: number;
  currentHighestTeamId: string | null;
  status: "idle" | "in-progress" | "paused" | "completed";
  bidTimerExpiresAt?: number | null;
}

export default function Dashboard() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [auctionState, setAuctionState] = useState<AuctionState | null>(null);
  const [activeTab, setActiveTab] = useState<"players" | "teams" | "live">("live");
  const [playerFilter, setPlayerFilter] = useState<"all" | "pool" | "sold" | "unsold">("all");
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  // Subscribe to real-time collections
  useEffect(() => {
    const unsubPlayers = onSnapshot(collection(db, "players"), (snapshot) => {
      const pList: Player[] = [];
      snapshot.forEach((doc) => {
        pList.push({ id: doc.id, ...doc.data() } as Player);
      });
      // Sort alphabetically by default
      pList.sort((a, b) => a.name.localeCompare(b.name));
      setPlayers(pList);
    });

    const unsubTeams = onSnapshot(collection(db, "teams"), (snapshot) => {
      const tList: Team[] = [];
      snapshot.forEach((doc) => {
        tList.push({ id: doc.id, ...doc.data() } as Team);
      });
      // Sort alphabetically by team name
      tList.sort((a, b) => a.teamName.localeCompare(b.teamName));
      setTeams(tList);
      if (tList.length > 0 && !selectedTeamId) {
        setSelectedTeamId(tList[0].id);
      }
    });

    const unsubState = onSnapshot(doc(db, "auctionState", "current"), (docSnap) => {
      if (docSnap.exists()) {
        setAuctionState(docSnap.data() as AuctionState);
      } else {
        setAuctionState({
          currentPlayerId: null,
          currentHighestBid: 0,
          currentHighestTeamId: null,
          status: "idle",
        });
      }
    });

    return () => {
      unsubPlayers();
      unsubTeams();
      unsubState();
    };
  }, [selectedTeamId]);

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

  // Find current active player
  const activePlayer = players.find((p) => p.id === auctionState?.currentPlayerId);
  const activeBidTeam = teams.find((t) => t.id === auctionState?.currentHighestTeamId);

  // Filtered player lists
  const filteredPlayers = players.filter((p) => {
    if (playerFilter === "all") return true;
    return p.status === playerFilter;
  });

  const getTeamName = (id: string | null) => {
    if (!id) return "";
    return teams.find((t) => t.id === id)?.teamName || "";
  };

  const getTeamLogo = (id: string | null) => {
    if (!id) return "";
    return teams.find((t) => t.id === id)?.logoUrl || "";
  };

  // Roster for selected team tab
  const selectedTeam = teams.find((t) => t.id === selectedTeamId);
  const teamRoster = players.filter((p) => p.soldToTeamId === selectedTeamId);

  return (
    <div className="mx-auto w-full max-w-7xl px-6 py-8 text-slate-100 flex-1 flex flex-col">
      {/* Realtime Live Bid Banner at the top if in progress */}
      {auctionState?.status === "in-progress" && activePlayer && (
        <div className="mb-6 rounded-xl border border-blue-500/40 bg-gradient-to-r from-blue-900/30 to-[#0B0F19] p-4 flex flex-col md:flex-row items-center justify-between gap-4 animate-pulse">
          <div className="flex items-center gap-3">
            <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-blue-500">
              <span className="h-2 w-2 rounded-full bg-blue-400 animate-ping" />
            </span>
            <span className="text-sm font-extrabold uppercase tracking-widest text-blue-400">
              Live Auction In Progress
            </span>
          </div>
          <div className="text-center md:text-right">
            <span className="text-slate-300 text-sm font-semibold">
              Currently Bidding: <span className="text-white font-extrabold">{activePlayer.name}</span> ({activePlayer.role})
            </span>
            {auctionState.currentHighestBid > 0 && (
              <span className="ml-4 text-emerald-400 text-sm font-extrabold">
                Current Bid: {auctionState.currentHighestBid} pts by {activeBidTeam?.teamName || "Anonymous"}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Main Tabs */}
      <div className="flex border-b border-slate-800 mb-6">
        <button
          onClick={() => setActiveTab("live")}
          className={`px-6 py-3 font-bold border-b-2 transition-all ${
            activeTab === "live"
              ? "border-blue-500 text-blue-500"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          📺 Live Auction View
        </button>
        <button
          onClick={() => setActiveTab("players")}
          className={`px-6 py-3 font-bold border-b-2 transition-all ${
            activeTab === "players"
              ? "border-blue-500 text-blue-500"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          🏃 Player Pool ({players.length})
        </button>
        <button
          onClick={() => setActiveTab("teams")}
          className={`px-6 py-3 font-bold border-b-2 transition-all ${
            activeTab === "teams"
              ? "border-blue-500 text-blue-500"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          🛡️ Teams & Rosters
        </button>
      </div>

      {/* Tab Contents */}
      <div className="flex-1 flex flex-col">
        {/* 1. Live Auction Tab */}
        {activeTab === "live" && (
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Player Under Hammer */}
            <div className="lg:col-span-2 flex flex-col justify-center">
              {auctionState?.status === "in-progress" && activePlayer ? (
                <div className="rounded-2xl border border-slate-800 bg-[#1E293B] p-8 text-center shadow-xl max-w-xl mx-auto w-full relative">
                  <div className="absolute top-4 right-4 rounded-full bg-blue-500/10 border border-blue-500/20 px-3 py-1 text-xs font-semibold text-blue-400">
                    {activePlayer.role}
                  </div>

                  <div className="mx-auto mb-6 relative h-36 w-36 overflow-hidden rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center">
                    {activePlayer.photoUrl ? (
                      <Image
                        src={activePlayer.photoUrl}
                        alt={activePlayer.name}
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    ) : (
                      <span className="text-6xl">👤</span>
                    )}
                  </div>

                  <h2 className="text-3xl font-black text-slate-100">{activePlayer.name}</h2>
                  <p className="text-slate-400 text-sm mt-1 uppercase font-bold tracking-wider">
                    Base Price: {activePlayer.basePrice} points
                  </p>

                  {timeLeft !== null && (
                    <div className="mt-4 bg-amber-500/10 border border-amber-500/20 p-3 rounded-xl flex items-center justify-between px-6">
                      <span className="text-[10px] text-amber-500 font-black uppercase tracking-widest animate-pulse">
                        ⏱️ Live Bid Timer
                      </span>
                      <span className="text-xl font-black text-amber-400">
                        {timeLeft}s
                      </span>
                    </div>
                  )}

                  {/* Active Bid Display */}
                  <div className="mt-8 rounded-xl bg-slate-900/60 p-6 border border-slate-800">
                    <span className="text-xs text-slate-500 font-bold uppercase tracking-widest block">
                      Current Bid Status
                    </span>
                    {auctionState.currentHighestBid > 0 ? (
                      <div className="mt-2">
                        <span className="text-4xl font-black text-emerald-400">
                          {auctionState.currentHighestBid} pts
                        </span>
                        <p className="text-sm font-semibold text-slate-300 mt-1">
                          Held by {activeBidTeam?.teamName}
                        </p>
                      </div>
                    ) : (
                      <div className="mt-2">
                        <span className="text-2xl font-bold text-slate-400">No Bids Yet</span>
                        <p className="text-xs text-slate-500 mt-1">Waiting for opening bid</p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-slate-800 bg-[#1E293B]/40 p-12 text-center max-w-xl mx-auto w-full">
                  <span className="text-5xl block mb-4">💤</span>
                  <h3 className="text-xl font-bold text-slate-300">Auction is Currently Idle</h3>
                  <p className="text-slate-500 text-sm mt-2">
                    The admin has not activated a player under the hammer. Watch this screen for live real-time updates!
                  </p>
                </div>
              )}
            </div>

            {/* Sidebar: Live Team Wallets & Standings */}
            <div className="flex flex-col gap-4">
              <h3 className="text-lg font-bold text-slate-300 uppercase tracking-wider mb-2">
                Teams Wallet Overview
              </h3>
              {teams.map((t) => (
                <TeamCard key={t.id} team={t} highlighted={t.id === auctionState?.currentHighestTeamId} />
              ))}
            </div>
          </div>
        )}

        {/* 2. Players Pool Tab */}
        {activeTab === "players" && (
          <div className="flex flex-col flex-1">
            {/* Filter buttons */}
            <div className="flex flex-wrap gap-2 mb-6">
              {(["all", "pool", "sold", "unsold"] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setPlayerFilter(filter)}
                  className={`rounded-lg px-4 py-2 text-sm font-semibold capitalize border transition-all ${
                    playerFilter === filter
                      ? "bg-blue-600 border-blue-500 text-white shadow"
                      : "bg-slate-800/40 border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white"
                  }`}
                >
                  {filter === "pool" ? "Available" : filter} ({
                    filter === "all" ? players.length : players.filter((p) => p.status === filter).length
                  })
                </button>
              ))}
            </div>

            {filteredPlayers.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredPlayers.map((p) => (
                  <PlayerCard
                    key={p.id}
                    player={p}
                    teamName={getTeamName(p.soldToTeamId)}
                    teamLogo={getTeamLogo(p.soldToTeamId)}
                  />
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-slate-800 bg-[#1E293B]/40 p-12 text-center flex-1 flex flex-col items-center justify-center">
                <p className="text-slate-500 text-lg">No players found matching selection.</p>
              </div>
            )}
          </div>
        )}

        {/* 3. Teams & Rosters Tab */}
        {activeTab === "teams" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 flex-1">
            {/* Left Sidebar: Team List */}
            <div className="flex flex-col gap-4">
              <h3 className="text-lg font-bold text-slate-300 uppercase tracking-wider mb-2">
                Select Team
              </h3>
              {teams.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setSelectedTeamId(t.id)}
                  className={`text-left w-full transition-all focus:outline-none ${
                    selectedTeamId === t.id ? "ring-2 ring-blue-500 rounded-xl" : ""
                  }`}
                >
                  <TeamCard team={t} highlighted={selectedTeamId === t.id} />
                </button>
              ))}
            </div>

            {/* Right Panel: Roster Details */}
            <div className="lg:col-span-2 rounded-2xl border border-slate-800 bg-[#1E293B] p-6">
              {selectedTeam ? (
                <div>
                  <div className="flex items-center gap-4 border-b border-slate-800 pb-4 mb-6">
                    <div className="relative h-12 w-12 overflow-hidden rounded-full bg-slate-900 flex items-center justify-center border border-slate-700">
                      {selectedTeam.logoUrl ? (
                        <Image src={selectedTeam.logoUrl} alt={selectedTeam.teamName} fill className="object-cover" unoptimized />
                      ) : (
                        <span className="text-lg font-bold">{selectedTeam.teamName.substring(0, 2).toUpperCase()}</span>
                      )}
                    </div>
                    <div>
                      <h3 className="text-xl font-extrabold text-slate-100">{selectedTeam.teamName}</h3>
                      <p className="text-sm text-slate-400">Roster Details & Spent Log</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6 text-center">
                    <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-850">
                      <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider">Squad Count</span>
                      <span className="text-lg font-black text-slate-200">{selectedTeam.playersBoughtCount} / 8</span>
                    </div>
                    <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-850">
                      <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider">Wallet Balance</span>
                      <span className="text-lg font-black text-emerald-400">{selectedTeam.walletRemaining} pts</span>
                    </div>
                    <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-850">
                      <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider">Points Spent</span>
                      <span className="text-lg font-black text-slate-200">{selectedTeam.startingWallet - selectedTeam.walletRemaining} pts</span>
                    </div>
                    <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-850">
                      <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider">Next Max Bid</span>
                      <span className="text-lg font-black text-blue-400">
                        {calculateMaxAllowedBid(selectedTeam.walletRemaining, selectedTeam.playersBoughtCount)} pts
                      </span>
                    </div>
                  </div>

                  <h4 className="text-base font-bold text-slate-300 uppercase tracking-wider mb-4">
                    Secured Roster ({teamRoster.length})
                  </h4>

                  {teamRoster.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {teamRoster.map((p) => (
                        <div key={p.id} className="flex items-center gap-3 bg-slate-900/40 p-3 rounded-lg border border-slate-800/60 justify-between">
                          <div className="flex items-center gap-3">
                            <div className="relative h-10 w-10 overflow-hidden rounded bg-slate-800 flex items-center justify-center">
                              {p.photoUrl ? (
                                <Image src={p.photoUrl} alt={p.name} fill className="object-cover" unoptimized />
                              ) : (
                                <span className="text-xl">👤</span>
                              )}
                            </div>
                            <div>
                              <p className="font-bold text-slate-200 text-sm line-clamp-1">{p.name}</p>
                              <p className="text-xs text-slate-500 font-semibold">{p.role}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="font-black text-emerald-400 text-sm block">{p.soldPrice} pts</span>
                            <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Winning Bid</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-lg border border-dashed border-slate-800 bg-slate-900/10 p-8 text-center">
                      <p className="text-slate-500 text-sm">No players have been secured by this team yet.</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center p-12">
                  <p className="text-slate-500">Select a team from the left sidebar to inspect their roster.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
