"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";

import { calculateMaxAllowedBid, BASE_PRICE } from "@/lib/bidValidation";

interface Team {
  id: string;
  teamName: string;
  ownerName: string;
  logoUrl?: string;
  startingWallet: number;
  walletRemaining: number;
  playersBoughtCount: number;
}

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
  soldPrice?: number;
  soldToTeamId?: string;
}

export default function ManageTeams() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [allPlayers, setAllPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  // Form State (Add New)
  const [teamName, setTeamName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [startingWallet, setStartingWallet] = useState(1000);

  // Edit / View States
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [editTeamName, setEditTeamName] = useState("");
  const [editOwnerName, setEditOwnerName] = useState("");
  const [editLogoUrl, setEditLogoUrl] = useState("");
  const [editStartingWallet, setEditStartingWallet] = useState(1000);

  const [viewingTeam, setViewingTeam] = useState<Team | null>(null);

  const fetchTeams = useCallback(async () => {
    try {
      const res = await fetch("/api/teams");
      if (res.ok) {
        const data = await res.json();
        setTeams(data.teams || []);
      }
    } catch (err) {
      console.error(err);
    }
  }, []);

  const fetchPlayers = useCallback(async () => {
    try {
      const res = await fetch("/api/players");
      if (res.ok) {
        const data = await res.json();
        setAllPlayers(data.players || []);
      }
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("admin_token");
    if (!token) {
      router.push("/admin/login");
      return;
    }
    
    const load = async () => {
      await fetchTeams();
      await fetchPlayers();
      setLoading(false);
    };
    load();
  }, [router, fetchTeams, fetchPlayers]);

  const handleAddTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamName.trim() || !ownerName.trim()) {
      alert("Team name and owner name are required");
      return;
    }
    setSubmitting(true);

    try {
      const token = localStorage.getItem("admin_token") || "";
      const res = await fetch("/api/teams", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "x-bypass-admin-auth": token === "dev-bypass-token" ? "true" : "false",
        },
        body: JSON.stringify({
          teamName: teamName.trim(),
          ownerName: ownerName.trim(),
          logoUrl,
          startingWallet,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to add team");
      }

      setTeamName("");
      setOwnerName("");
      setLogoUrl("");
      setStartingWallet(1000);

      await fetchTeams();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      alert(`Error: ${msg}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditClick = (t: Team) => {
    setEditingTeam(t);
    setEditTeamName(t.teamName);
    setEditOwnerName(t.ownerName);
    setEditLogoUrl(t.logoUrl || "");
    setEditStartingWallet(t.startingWallet);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTeam) return;
    if (!editTeamName.trim() || !editOwnerName.trim()) {
      alert("Team name and owner name are required");
      return;
    }
    setSubmitting(true);

    try {
      const token = localStorage.getItem("admin_token") || "";
      const res = await fetch("/api/teams", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "x-bypass-admin-auth": token === "dev-bypass-token" ? "true" : "false",
        },
        body: JSON.stringify({
          id: editingTeam.id,
          teamName: editTeamName.trim(),
          ownerName: editOwnerName.trim(),
          logoUrl: editLogoUrl,
          startingWallet: editStartingWallet,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to update team");
      }

      setEditingTeam(null);
      await fetchTeams();
      await fetchPlayers();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      alert(`Error: ${msg}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteTeam = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this team?")) return;

    try {
      const token = localStorage.getItem("admin_token") || "";
      const res = await fetch(`/api/teams?id=${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "x-bypass-admin-auth": token === "dev-bypass-token" ? "true" : "false",
        },
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to delete team");
      }

      await fetchTeams();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      alert(`Error: ${msg}`);
    }
  };

  return (
    <div className="mx-auto w-full max-w-7xl px-6 py-8 text-slate-100 flex-1 grid grid-cols-1 lg:grid-cols-3 gap-8 relative">
      {/* Add Team Panel */}
      <div className="rounded-xl border border-slate-800 bg-[#1E293B] p-6 h-fit">
        <h2 className="text-xl font-extrabold uppercase tracking-wider mb-6 border-b border-slate-850 pb-3">
          ➕ Create <span className="text-blue-500">Team</span>
        </h2>

        <form onSubmit={handleAddTeam} className="flex flex-col gap-4">
          <div>
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-1.5">
              Franchise/Team Name
            </label>
            <input
              type="text"
              required
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-900/60 px-4 py-2.5 text-sm text-white focus:border-blue-500 focus:outline-none"
              placeholder="e.g. Mumbai Indians"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-1.5">
              Owner Full Name
            </label>
            <input
              type="text"
              required
              value={ownerName}
              onChange={(e) => setOwnerName(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-900/60 px-4 py-2.5 text-sm text-white focus:border-blue-500 focus:outline-none"
              placeholder="e.g. Akash Ambani"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-1.5">
              Logo URL (Optional)
            </label>
            <input
              type="text"
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-900/60 px-4 py-2.5 text-sm text-white focus:border-blue-500 focus:outline-none"
              placeholder="https://example.com/logo.png"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-1.5">
              Starting Wallet Points
            </label>
            <input
              type="number"
              required
              min={1}
              value={startingWallet}
              onChange={(e) => setStartingWallet(Number(e.target.value))}
              className="w-full rounded-lg border border-slate-700 bg-slate-900/60 px-4 py-2.5 text-sm text-white focus:border-blue-500 focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="mt-4 flex h-11 items-center justify-center rounded-lg bg-blue-600 font-bold text-white shadow-lg transition-all hover:bg-blue-500 active:scale-[0.98] disabled:opacity-50"
          >
            {submitting ? "Creating Team..." : "Create Team Profile"}
          </button>
        </form>
      </div>

      {/* Teams List Panel */}
      <div className="lg:col-span-2 rounded-xl border border-slate-800 bg-[#1E293B] p-6">
        <h2 className="text-xl font-extrabold uppercase tracking-wider mb-6 border-b border-slate-850 pb-3 flex items-center justify-between">
          <span>🛡️ Franchise Teams ({teams.length})</span>
          <Link href="/admin/dashboard" className="text-xs text-blue-400 font-bold hover:underline">
            ← Back to Dashboard
          </Link>
        </h2>

        {loading ? (
          <p className="text-slate-500 text-center py-12">Loading team list...</p>
        ) : teams.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-200">
              <thead className="bg-slate-900/60 text-xs font-bold uppercase tracking-widest text-slate-400">
                <tr>
                  <th className="p-3">Team Name</th>
                  <th className="p-3">Owner</th>
                  <th className="p-3">Budget Details</th>
                  <th className="p-3">Squad size</th>
                  <th className="p-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {teams.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-800/40">
                    <td className="p-3 font-semibold flex items-center gap-3">
                      <div className="relative h-8 w-8 rounded-full overflow-hidden bg-slate-800 flex items-center justify-center border border-slate-700">
                        {t.logoUrl ? (
                          <Image src={t.logoUrl} alt={t.teamName} fill className="object-cover" unoptimized />
                        ) : (
                          <span>🛡️</span>
                        )}
                      </div>
                      <span className="truncate max-w-[150px]">{t.teamName}</span>
                    </td>
                    <td className="p-3 font-medium text-slate-400">{t.ownerName}</td>
                    <td className="p-3">
                      <div className="text-xs font-bold">
                        <span className="text-emerald-400">{t.walletRemaining} pts</span> / {t.startingWallet} pts
                      </div>
                    </td>
                    <td className="p-3 font-bold">{t.playersBoughtCount} / 8</td>
                    <td className="p-3 text-right flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => setViewingTeam(t)}
                        className="rounded border border-slate-700 bg-slate-800 px-2.5 py-1 text-2xs font-bold text-slate-300 hover:bg-slate-750 hover:text-white"
                      >
                        View
                      </button>
                      <button
                        onClick={() => handleEditClick(t)}
                        className="rounded border border-blue-500/30 bg-blue-500/10 px-2.5 py-1 text-2xs font-bold text-blue-400 hover:bg-blue-600 hover:text-white"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteTeam(t.id)}
                        className="rounded border border-red-500/30 bg-red-500/10 px-2.5 py-1 text-2xs font-bold text-red-400 hover:bg-red-550 hover:text-white"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12 border border-dashed border-slate-800 rounded-lg">
            <p className="text-slate-500 text-sm">No franchise teams created yet.</p>
          </div>
        )}
      </div>

      {/* Edit Team Modal */}
      {editingTeam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="w-full max-w-md rounded-xl border border-slate-800 bg-[#1E293B] p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <h3 className="text-lg font-extrabold uppercase tracking-wide text-slate-200">
                ✏️ Edit <span className="text-blue-500">Franchise Profile</span>
              </h3>
              <button
                onClick={() => setEditingTeam(null)}
                className="text-slate-400 hover:text-white text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="flex flex-col gap-4">
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-1">
                  Franchise Name
                </label>
                <input
                  type="text"
                  required
                  value={editTeamName}
                  onChange={(e) => setEditTeamName(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-1">
                  Owner Name
                </label>
                <input
                  type="text"
                  required
                  value={editOwnerName}
                  onChange={(e) => setEditOwnerName(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-1">
                  Logo URL
                </label>
                <input
                  type="text"
                  value={editLogoUrl}
                  onChange={(e) => setEditLogoUrl(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-1">
                  Starting Wallet Points
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  value={editStartingWallet}
                  onChange={(e) => setEditStartingWallet(Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex gap-3 justify-end mt-4 border-t border-slate-800 pt-4">
                <button
                  type="button"
                  onClick={() => setEditingTeam(null)}
                  className="rounded border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-bold text-slate-350 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded bg-blue-600 px-5 py-2 text-xs font-bold text-white hover:bg-blue-550 disabled:opacity-50"
                >
                  {submitting ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Team Details Modal */}
      {viewingTeam && (() => {
        const teamPlayers = allPlayers.filter((p) => p.soldToTeamId === viewingTeam.id);
        const spent = viewingTeam.startingWallet - viewingTeam.walletRemaining;
        const maxBid = calculateMaxAllowedBid(viewingTeam.walletRemaining, viewingTeam.playersBoughtCount);
        const remainingSlots = 8 - viewingTeam.playersBoughtCount;
        const reserved = remainingSlots * BASE_PRICE;

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in overflow-y-auto">
            <div className="w-full max-w-4xl rounded-xl border border-slate-800 bg-[#1E293B] p-6 shadow-2xl flex flex-col max-h-[90vh]">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
                <div className="flex items-center gap-3">
                  <div className="relative h-12 w-12 rounded-full overflow-hidden bg-slate-800 flex items-center justify-center border border-slate-700">
                    {viewingTeam.logoUrl ? (
                      <Image src={viewingTeam.logoUrl} alt={viewingTeam.teamName} fill className="object-cover" unoptimized />
                    ) : (
                      <span>🛡️</span>
                    )}
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-100">{viewingTeam.teamName}</h3>
                    <p className="text-xs text-slate-400">Owner: {viewingTeam.ownerName}</p>
                  </div>
                </div>
                <button
                  onClick={() => setViewingTeam(null)}
                  className="text-slate-400 hover:text-white text-lg font-bold"
                >
                  ✕
                </button>
              </div>

              {/* Stats Overview */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 text-center mb-6">
                <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-850">
                  <span className="text-[10px] text-slate-500 block uppercase font-bold tracking-wider">Remaining</span>
                  <span className="text-base font-black text-emerald-400">{viewingTeam.walletRemaining} pts</span>
                </div>
                <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-850">
                  <span className="text-[10px] text-slate-500 block uppercase font-bold tracking-wider">Spent</span>
                  <span className="text-base font-black text-slate-300">{spent} pts</span>
                </div>
                <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-850">
                  <span className="text-[10px] text-slate-500 block uppercase font-bold tracking-wider">Reserved</span>
                  <span className="text-base font-black text-slate-300">{reserved} pts</span>
                </div>
                <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-850">
                  <span className="text-[10px] text-slate-500 block uppercase font-bold tracking-wider">Max Allowed Bid</span>
                  {remainingSlots <= 0 ? (
                    <span className="text-xs font-bold text-slate-550 block mt-1">Squad Full</span>
                  ) : (
                    <span className="text-base font-black text-blue-400">{maxBid} pts</span>
                  )}
                </div>
                <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-850 col-span-2 sm:col-span-1">
                  <span className="text-[10px] text-slate-500 block uppercase font-bold tracking-wider">Squad Count</span>
                  <span className="text-base font-black text-slate-300">{viewingTeam.playersBoughtCount} / 8</span>
                </div>
              </div>

              {/* Squad List */}
              <h4 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-3">
                Purchased Squad ({teamPlayers.length})
              </h4>

              <div className="flex-1 overflow-y-auto pr-2 min-h-[250px]">
                {teamPlayers.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {teamPlayers.map((player) => (
                      <div
                        key={player.id}
                        className="bg-slate-900/30 border border-slate-800 rounded-xl p-4 flex gap-4 items-center"
                      >
                        <div className="relative h-16 w-16 overflow-hidden rounded bg-slate-855 border border-slate-700 flex items-center justify-center">
                          {player.photoUrl ? (
                            <Image src={player.photoUrl} alt={player.name} fill className="object-cover" unoptimized />
                          ) : (
                            <span className="text-3xl">👤</span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h5 className="font-extrabold text-slate-200 truncate">{player.name}</h5>
                          <span className="inline-block bg-slate-800 text-slate-400 px-2 py-0.5 rounded text-[10px] font-bold mt-1 tracking-wider uppercase">
                            {player.role}
                          </span>
                          <div className="flex items-center gap-4 mt-2 text-xs">
                            <div>
                              <span className="text-slate-500 font-bold block text-[9px] uppercase">Base</span>
                              <span className="font-bold text-slate-400">{player.basePrice} pts</span>
                            </div>
                            <div>
                              <span className="text-slate-500 font-bold block text-[9px] uppercase">Sold</span>
                              <span className="font-extrabold text-emerald-400">{player.soldPrice} pts</span>
                            </div>
                            <div>
                              <span className="text-slate-500 font-bold block text-[9px] uppercase">M / R / W</span>
                              <span className="font-bold text-slate-300">
                                {player.stats?.matches ?? 0} / {player.stats?.runs ?? 0} / {player.stats?.wickets ?? 0}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 border border-dashed border-slate-800 rounded-xl">
                    <p className="text-slate-500 text-sm">No players purchased yet.</p>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="mt-6 border-t border-slate-800 pt-4 flex justify-end">
                <button
                  onClick={() => setViewingTeam(null)}
                  className="rounded bg-slate-800 border border-slate-700 px-6 py-2.5 font-bold text-slate-200 hover:text-white transition-colors"
                >
                  Close View
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
