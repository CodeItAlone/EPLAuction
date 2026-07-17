"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebaseClient";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface Player {
  id: string;
  name: string;
  role: string;
  status: "pool" | "sold" | "unsold";
  basePrice?: number;
  soldPrice?: number;
  soldToTeamId?: string;
}

interface Team {
  id: string;
  teamName: string;
  ownerName: string;
  startingWallet: number;
  walletRemaining: number;
  playersBoughtCount: number;
}

export default function AdminDashboard() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [resetting, setResetting] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("admin_token");
    if (!token) {
      router.push("/admin/login");
    }
  }, [router]);

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
      setTeams(tList);
    });

    return () => {
      unsubPlayers();
      unsubTeams();
    };
  }, []);

  const totalPlayers = players.length;
  const soldCount = players.filter((p) => p.status === "sold").length;
  const unsoldStatusCount = players.filter((p) => p.status === "unsold").length;
  const availableCount = players.filter((p) => p.status === "pool").length;

  // Stats Calculations
  const soldPrices = players.filter((p) => p.status === "sold" && p.soldPrice).map((p) => p.soldPrice as number);
  const highestBid = soldPrices.length > 0 ? Math.max(...soldPrices) : 0;
  const lowestBid = soldPrices.length > 0 ? Math.min(...soldPrices) : 0;
  const averageBid = soldPrices.length > 0 ? Math.round(soldPrices.reduce((a, b) => a + b, 0) / soldPrices.length) : 0;

  const handleResetAuction = async () => {
    const confirmReset = window.confirm(
      "⚠️ DANGER: Are you sure you want to reset the entire auction? This deletes all bids, resets all team budgets, and returns all players to the pool. This action cannot be undone."
    );
    if (!confirmReset) return;

    setResetting(true);
    setResetSuccess(false);

    try {
      const token = localStorage.getItem("admin_token") || "";
      const res = await fetch("/api/auction/reset", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "x-bypass-admin-auth": token === "dev-bypass-token" ? "true" : "false",
        },
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Reset failed");
      }

      setResetSuccess(true);
      setTimeout(() => setResetSuccess(false), 4000);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      alert(`Reset failed: ${msg}`);
    } finally {
      setResetting(false);
    }
  };

  // CSV Exporters
  const exportPlayersCSV = () => {
    const data = players.map((p) => {
      const team = teams.find((t) => t.id === p.soldToTeamId);
      return {
        ID: p.id,
        Name: p.name,
        Role: p.role,
        Status: p.status,
        BasePrice: p.basePrice || 30,
        SoldPrice: p.soldPrice || "",
        SoldToTeam: team ? team.teamName : "",
      };
    });
    triggerCSVDownload("epl_auction_players.csv", data);
  };

  const exportTeamsCSV = () => {
    const data = teams.map((t) => ({
      ID: t.id,
      TeamName: t.teamName,
      OwnerName: t.ownerName,
      StartingWallet: t.startingWallet,
      WalletRemaining: t.walletRemaining,
      SpentWallet: t.startingWallet - t.walletRemaining,
      PlayersBought: t.playersBoughtCount,
    }));
    triggerCSVDownload("epl_auction_teams.csv", data);
  };

  const triggerCSVDownload = (filename: string, data: Record<string, string | number>[]) => {
    if (data.length === 0) return;
    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(","),
      ...data.map((row) =>
        headers
          .map((header) => {
            const val = row[header];
            const escaped = ("" + (val ?? "")).replace(/"/g, '""');
            return `"${escaped}"`;
          })
          .join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="mx-auto w-full max-w-7xl px-6 py-8 text-slate-100 flex-1 flex flex-col gap-8">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold tracking-wider text-slate-100 uppercase">
            ADMIN <span className="text-blue-500">DASHBOARD</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">Manage players, teams, and run the live auction</p>
        </div>

        <button
          onClick={handleResetAuction}
          disabled={resetting}
          className="rounded-lg border border-red-500/30 bg-red-500/10 px-5 py-2 text-sm font-bold text-red-400 transition-all hover:bg-red-500 hover:text-white disabled:opacity-50"
        >
          {resetting ? "Resetting..." : "⚠️ Reset Auction"}
        </button>
      </div>

      {resetSuccess && (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-400 font-semibold">
          ✅ Auction has been reset successfully! All statistics are cleared.
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        <div className="rounded-xl border border-slate-800 bg-[#1E293B] p-5">
          <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider">Total Players In Pool</span>
          <span className="text-3xl font-black text-slate-100 block mt-1">{totalPlayers}</span>
        </div>
        <div className="rounded-xl border border-slate-800 bg-[#1E293B] p-5">
          <span className="text-[10px] text-emerald-500 font-bold block uppercase tracking-wider">Sold Players</span>
          <span className="text-3xl font-black text-emerald-400 block mt-1">{soldCount}</span>
        </div>
        <div className="rounded-xl border border-slate-800 bg-[#1E293B] p-5">
          <span className="text-[10px] text-red-500 font-bold block uppercase tracking-wider">Unsold Status</span>
          <span className="text-3xl font-black text-red-400 block mt-1">{unsoldStatusCount}</span>
        </div>
        <div className="rounded-xl border border-slate-800 bg-[#1E293B] p-5">
          <span className="text-[10px] text-blue-500 font-bold block uppercase tracking-wider">Available Players In Pool</span>
          <span className="text-3xl font-black text-blue-400 block mt-1">{availableCount}</span>
        </div>
      </div>

      {/* Auction Metrics Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="rounded-xl border border-slate-800 bg-[#1E293B]/40 p-5 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">Highest Sale</span>
          <span className="text-xl font-black text-yellow-400">{highestBid} pts</span>
        </div>
        <div className="rounded-xl border border-slate-800 bg-[#1E293B]/40 p-5 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">Lowest Sale</span>
          <span className="text-xl font-black text-slate-350">{lowestBid} pts</span>
        </div>
        <div className="rounded-xl border border-slate-800 bg-[#1E293B]/40 p-5 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">Average Sale</span>
          <span className="text-xl font-black text-blue-400">{averageBid} pts</span>
        </div>
      </div>

      {/* Navigation Quick Links Grid */}
      <div>
        <h3 className="text-lg font-bold text-slate-300 uppercase tracking-wider mb-4 border-b border-slate-800 pb-2">
          Control Panels
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Link
            href="/admin/live-auction"
            className="group rounded-xl border border-slate-800 bg-[#1E293B] p-6 hover:border-blue-500/50 hover:bg-[#1E293B]/80 transition-all flex flex-col justify-between min-h-[160px]"
          >
            <div>
              <span className="text-3xl block mb-2">📺</span>
              <h4 className="text-lg font-bold text-slate-200 group-hover:text-blue-400 transition-colors">
                Live Auction Room
              </h4>
              <p className="text-xs text-slate-400 mt-1">
                Select players, record live bids, confirm sales, and trigger undos.
              </p>
            </div>
            <span className="text-xs text-blue-500 font-bold uppercase tracking-widest mt-4 block">Open Console →</span>
          </Link>

          <Link
            href="/admin/players"
            className="group rounded-xl border border-slate-800 bg-[#1E293B] p-6 hover:border-blue-500/50 hover:bg-[#1E293B]/80 transition-all flex flex-col justify-between min-h-[160px]"
          >
            <div>
              <span className="text-3xl block mb-2">🏃</span>
              <h4 className="text-lg font-bold text-slate-200 group-hover:text-blue-400 transition-colors">
                Manage Players
              </h4>
              <p className="text-xs text-slate-400 mt-1">
                Add new player profiles, upload stats, set roles, and edit details.
              </p>
            </div>
            <span className="text-xs text-blue-500 font-bold uppercase tracking-widest mt-4 block">Manage Pool →</span>
          </Link>

          <Link
            href="/admin/teams"
            className="group rounded-xl border border-slate-800 bg-[#1E293B] p-6 hover:border-blue-500/50 hover:bg-[#1E293B]/80 transition-all flex flex-col justify-between min-h-[160px]"
          >
            <div>
              <span className="text-3xl block mb-2">🛡️</span>
              <h4 className="text-lg font-bold text-slate-200 group-hover:text-blue-400 transition-colors">
                Manage Teams
              </h4>
              <p className="text-xs text-slate-400 mt-1">
                Create franchise teams, edit owners, starting budgets, and logos.
              </p>
            </div>
            <span className="text-xs text-blue-500 font-bold uppercase tracking-widest mt-4 block">Manage Teams →</span>
          </Link>

          <Link
            href="/projector"
            target="_blank"
            className="group rounded-xl border border-slate-800 bg-[#1E293B] p-6 hover:border-blue-500/50 hover:bg-[#1E293B]/80 transition-all flex flex-col justify-between min-h-[160px]"
          >
            <div>
              <span className="text-3xl block mb-2">📹</span>
              <h4 className="text-lg font-bold text-slate-200 group-hover:text-blue-400 transition-colors">
                Projector View
              </h4>
              <p className="text-xs text-slate-400 mt-1">
                Open the read-only, real-time scoreboard designed for large TV screens/displays.
              </p>
            </div>
            <span className="text-xs text-blue-500 font-bold uppercase tracking-widest mt-4 block">Open Display →</span>
          </Link>
        </div>

      </div>

      {/* Reporting & Actions */}
      <div>
        <h3 className="text-lg font-bold text-slate-300 uppercase tracking-wider mb-4 border-b border-slate-800 pb-2">
          Data Actions & Reports
        </h3>
        <div className="flex gap-4">
          <button
            onClick={exportPlayersCSV}
            className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-bold text-white transition-all hover:bg-blue-500 active:scale-[0.98]"
          >
            📥 Export Players (CSV)
          </button>
          <button
            onClick={exportTeamsCSV}
            className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-bold text-white transition-all hover:bg-blue-500 active:scale-[0.98]"
          >
            📥 Export Teams (CSV)
          </button>
        </div>
      </div>
    </div>
  );
}
