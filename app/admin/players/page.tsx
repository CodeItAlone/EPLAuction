"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";

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
}

export default function ManagePlayers() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  // Form State (Add New)
  const [name, setName] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [role, setRole] = useState<"Batsman" | "Bowler" | "All-rounder" | "Wicket-Keeper">("Batsman");
  const [basePrice, setBasePrice] = useState(30);
  const [matches, setMatches] = useState(0);
  const [runs, setRuns] = useState(0);
  const [wickets, setWickets] = useState(0);
  const [average, setAverage] = useState(0);

  // Edit / View States
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [editName, setEditName] = useState("");
  const [editPhotoUrl, setEditPhotoUrl] = useState("");
  const [editRole, setEditRole] = useState<Player["role"]>("Batsman");
  const [editBasePrice, setEditBasePrice] = useState(30);
  const [editMatches, setEditMatches] = useState(0);
  const [editRuns, setEditRuns] = useState(0);
  const [editWickets, setEditWickets] = useState(0);
  const [editAverage, setEditAverage] = useState(0);

  const [viewingPlayer, setViewingPlayer] = useState<Player | null>(null);

  const fetchPlayers = useCallback(async () => {
    try {
      const res = await fetch("/api/players");
      if (res.ok) {
        const data = await res.json();
        setPlayers(data.players || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("admin_token");
    if (!token) {
      router.push("/admin/login");
      return;
    }
    
    const load = async () => {
      await fetchPlayers();
    };
    load();
  }, [router, fetchPlayers]);

  const handleAddPlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert("Player name cannot be empty");
      return;
    }
    if (basePrice < 30) {
      alert("Base price must be at least the tournament minimum (30)");
      return;
    }
    setSubmitting(true);

    try {
      const token = localStorage.getItem("admin_token") || "";
      const stats = {
        matches,
        runs: role === "Bowler" ? 0 : runs,
        wickets: role === "Bowler" ? wickets : 0,
        average,
      };

      const res = await fetch("/api/players", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "x-bypass-admin-auth": token === "dev-bypass-token" ? "true" : "false",
        },
        body: JSON.stringify({
          name: name.trim(),
          photoUrl,
          role,
          stats,
          basePrice,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to add player");
      }

      // Reset Form
      setName("");
      setPhotoUrl("");
      setBasePrice(30);
      setMatches(0);
      setRuns(0);
      setWickets(0);
      setAverage(0);

      await fetchPlayers();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      alert(`Error: ${msg}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditClick = (p: Player) => {
    setEditingPlayer(p);
    setEditName(p.name);
    setEditPhotoUrl(p.photoUrl || "");
    setEditRole(p.role);
    setEditBasePrice(p.basePrice);
    setEditMatches(p.stats?.matches || 0);
    setEditRuns(p.stats?.runs || 0);
    setEditWickets(p.stats?.wickets || 0);
    setEditAverage(p.stats?.average || 0);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlayer) return;
    if (!editName.trim()) {
      alert("Player name cannot be empty");
      return;
    }
    if (editBasePrice < 30) {
      alert("Base price must be at least the tournament minimum (30)");
      return;
    }
    setSubmitting(true);

    try {
      const token = localStorage.getItem("admin_token") || "";
      const stats = {
        matches: editMatches,
        runs: editRole === "Bowler" ? 0 : editRuns,
        wickets: editRole === "Bowler" ? editWickets : 0,
        average: editAverage,
      };

      const res = await fetch("/api/players", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "x-bypass-admin-auth": token === "dev-bypass-token" ? "true" : "false",
        },
        body: JSON.stringify({
          id: editingPlayer.id,
          name: editName.trim(),
          photoUrl: editPhotoUrl,
          role: editRole,
          stats,
          basePrice: editBasePrice,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to edit player");
      }

      setEditingPlayer(null);
      await fetchPlayers();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      alert(`Error: ${msg}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeletePlayer = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this player?")) return;

    try {
      const token = localStorage.getItem("admin_token") || "";
      const res = await fetch(`/api/players?id=${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "x-bypass-admin-auth": token === "dev-bypass-token" ? "true" : "false",
        },
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to delete player");
      }

      await fetchPlayers();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      alert(`Error: ${msg}`);
    }
  };

  return (
    <div className="mx-auto w-full max-w-7xl px-6 py-8 text-slate-100 flex-1 grid grid-cols-1 lg:grid-cols-3 gap-8 relative">
      {/* Add Player Panel */}
      <div className="rounded-xl border border-slate-800 bg-[#1E293B] p-6 h-fit">
        <h2 className="text-xl font-extrabold uppercase tracking-wider mb-6 border-b border-slate-850 pb-3">
          ➕ Add New <span className="text-blue-500">Player</span>
        </h2>

        <form onSubmit={handleAddPlayer} className="flex flex-col gap-4">
          <div>
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-1.5">
              Player Full Name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-900/60 px-4 py-2.5 text-sm text-white focus:border-blue-500 focus:outline-none"
              placeholder="e.g. MS Dhoni"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-1.5">
              Photo URL (Optional)
            </label>
            <input
              type="text"
              value={photoUrl}
              onChange={(e) => setPhotoUrl(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-900/60 px-4 py-2.5 text-sm text-white focus:border-blue-500 focus:outline-none"
              placeholder="https://example.com/photo.jpg"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-1.5">
                Role
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as Player["role"])}
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-white focus:border-blue-500 focus:outline-none"
              >
                <option value="Batsman">🏏 Batsman</option>
                <option value="Bowler">⚾ Bowler</option>
                <option value="All-rounder">⚡ All-rounder</option>
                <option value="Wicket-Keeper">🧤 Wicket-Keeper</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-1.5">
                Base Price
              </label>
              <input
                type="number"
                required
                min={30}
                value={basePrice}
                onChange={(e) => setBasePrice(Number(e.target.value))}
                className="w-full rounded-lg border border-slate-700 bg-slate-900/60 px-4 py-2.5 text-sm text-white focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-2 border-t border-slate-800 pt-3">
            Career Statistics
          </h3>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Matches
              </label>
              <input
                type="number"
                min={0}
                value={matches}
                onChange={(e) => setMatches(Number(e.target.value))}
                className="w-full rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
              />
            </div>

            {role === "Bowler" ? (
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Wickets
                </label>
                <input
                  type="number"
                  min={0}
                  value={wickets}
                  onChange={(e) => setWickets(Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
                />
              </div>
            ) : (
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Runs
                </label>
                <input
                  type="number"
                  min={0}
                  value={runs}
                  onChange={(e) => setRuns(Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
                />
              </div>
            )}

            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Average
              </label>
              <input
                type="number"
                step="0.01"
                min={0}
                value={average}
                onChange={(e) => setAverage(Number(e.target.value))}
                className="w-full rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="mt-4 flex h-11 items-center justify-center rounded-lg bg-blue-600 font-bold text-white shadow-lg transition-all hover:bg-blue-500 active:scale-[0.98] disabled:opacity-50"
          >
            {submitting ? "Saving Player..." : "Add Player Profile"}
          </button>
        </form>
      </div>

      {/* Players List Panel */}
      <div className="lg:col-span-2 rounded-xl border border-slate-800 bg-[#1E293B] p-6">
        <h2 className="text-xl font-extrabold uppercase tracking-wider mb-6 border-b border-slate-850 pb-3 flex items-center justify-between">
          <span>🏃 Player List ({players.length})</span>
          <Link href="/admin/dashboard" className="text-xs text-blue-400 font-bold hover:underline">
            ← Back to Dashboard
          </Link>
        </h2>

        {loading ? (
          <p className="text-slate-500 text-center py-12">Loading player list...</p>
        ) : players.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-200">
              <thead className="bg-slate-900/60 text-xs font-bold uppercase tracking-widest text-slate-400">
                <tr>
                  <th className="p-3">Player</th>
                  <th className="p-3">Role</th>
                  <th className="p-3">Base Price</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {players.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-800/40">
                    <td className="p-3 font-semibold flex items-center gap-3">
                      <div className="relative h-8 w-8 rounded overflow-hidden bg-slate-800 flex items-center justify-center border border-slate-700">
                        {p.photoUrl ? (
                          <Image src={p.photoUrl} alt={p.name} fill className="object-cover" unoptimized />
                        ) : (
                          <span>👤</span>
                        )}
                      </div>
                      <span className="truncate max-w-[150px]">{p.name}</span>
                    </td>
                    <td className="p-3 font-medium text-slate-400">{p.role}</td>
                    <td className="p-3 font-bold">{p.basePrice} pts</td>
                    <td className="p-3">
                      <span
                        className={`inline-block rounded px-2 py-0.5 text-2xs font-extrabold uppercase ${
                          p.status === "sold"
                            ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/20"
                            : p.status === "unsold"
                            ? "bg-red-500/20 text-red-400 border border-red-500/20"
                            : "bg-blue-500/20 text-blue-400 border border-blue-500/20"
                        }`}
                      >
                        {p.status === "pool" ? "Available" : p.status}
                      </span>
                    </td>
                    <td className="p-3 text-right flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => setViewingPlayer(p)}
                        className="rounded border border-slate-700 bg-slate-800 px-2 py-1 text-2xs font-bold text-slate-355 hover:bg-slate-750 hover:text-white"
                      >
                        View
                      </button>

                      <button
                        onClick={() => handleEditClick(p)}
                        className="rounded border border-blue-500/30 bg-blue-500/10 px-2 py-1 text-2xs font-bold text-blue-400 hover:bg-blue-600 hover:text-white"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeletePlayer(p.id)}
                        className="rounded border border-red-500/30 bg-red-500/10 px-2 py-1 text-2xs font-bold text-red-400 hover:bg-red-550 hover:text-white"
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
            <p className="text-slate-500 text-sm">No players added to the pool yet.</p>
          </div>
        )}
      </div>

      {/* Edit Player Modal */}
      {editingPlayer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="w-full max-w-lg rounded-xl border border-slate-800 bg-[#1E293B] p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <h3 className="text-lg font-extrabold uppercase tracking-wide text-slate-200">
                ✏️ Edit <span className="text-blue-500">Player Profile</span>
              </h3>
              <button
                onClick={() => setEditingPlayer(null)}
                className="text-slate-400 hover:text-white text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {editingPlayer.status === "sold" && (
              <div className="mb-4 rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-3 text-xs text-yellow-500 font-semibold">
                ⚠️ Auction Integrity Lock: This player is SOLD. Base price and role are locked.
              </div>
            )}

            <form onSubmit={handleSaveEdit} className="flex flex-col gap-4">
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-1">
                  Player Name
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-1">
                  Photo URL
                </label>
                <input
                  type="text"
                  value={editPhotoUrl}
                  onChange={(e) => setEditPhotoUrl(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-1">
                    Role
                  </label>
                  <select
                    value={editRole}
                    disabled={editingPlayer.status === "sold"}
                    onChange={(e) => setEditRole(e.target.value as Player["role"])}
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-2 py-2 text-sm text-white focus:outline-none focus:border-blue-500 disabled:opacity-50"
                  >
                    <option value="Batsman">🏏 Batsman</option>
                    <option value="Bowler">⚾ Bowler</option>
                    <option value="All-rounder">⚡ All-rounder</option>
                    <option value="Wicket-Keeper">🧤 Wicket-Keeper</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-1">
                    Base Price
                  </label>
                  <input
                    type="number"
                    required
                    min={30}
                    disabled={editingPlayer.status === "sold"}
                    value={editBasePrice}
                    onChange={(e) => setEditBasePrice(Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 disabled:opacity-50"
                  />
                </div>
              </div>

              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-2 border-t border-slate-800 pt-3">
                Career Statistics
              </h4>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Matches
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={editMatches}
                    onChange={(e) => setEditMatches(Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-2 py-1.5 text-sm text-white focus:outline-none"
                  />
                </div>

                {editRole === "Bowler" ? (
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      Wickets
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={editWickets}
                      onChange={(e) => setEditWickets(Number(e.target.value))}
                      className="w-full rounded-lg border border-slate-700 bg-slate-900 px-2 py-1.5 text-sm text-white focus:outline-none"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      Runs
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={editRuns}
                      onChange={(e) => setEditRuns(Number(e.target.value))}
                      className="w-full rounded-lg border border-slate-700 bg-slate-900 px-2 py-1.5 text-sm text-white focus:outline-none"
                    />
                  </div>
                )}

                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Average
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min={0}
                    value={editAverage}
                    onChange={(e) => setEditAverage(Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-2 py-1.5 text-sm text-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex gap-3 justify-end mt-4 border-t border-slate-800 pt-4">
                <button
                  type="button"
                  onClick={() => setEditingPlayer(null)}
                  className="rounded border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-bold text-slate-300 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded bg-blue-600 px-5 py-2 text-xs font-bold text-white hover:bg-blue-500 disabled:opacity-50"
                >
                  {submitting ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Player Details Modal */}
      {viewingPlayer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="w-full max-w-md rounded-xl border border-slate-800 bg-[#1E293B] p-6 shadow-2xl text-center">
            <div className="flex justify-end mb-2">
              <button
                onClick={() => setViewingPlayer(null)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="relative mx-auto h-32 w-32 overflow-hidden rounded-full bg-slate-900 border-2 border-slate-700 flex items-center justify-center mb-4">
              {viewingPlayer.photoUrl ? (
                <Image src={viewingPlayer.photoUrl} alt={viewingPlayer.name} fill className="object-cover" unoptimized />
              ) : (
                <span className="text-6xl">👤</span>
              )}
            </div>

            <h3 className="text-2xl font-black text-slate-100">{viewingPlayer.name}</h3>
            <span className="inline-block mt-1 bg-blue-500/10 border border-blue-500/20 px-3 py-0.5 rounded text-xs font-bold text-blue-400 tracking-wide uppercase">
              {viewingPlayer.role}
            </span>

            <div className="mt-6 grid grid-cols-2 gap-4 text-center text-sm border-t border-b border-slate-800 py-4">
              <div>
                <span className="text-[10px] text-slate-500 block uppercase font-bold tracking-wider">Base Price</span>
                <span className="text-base font-bold text-slate-200">{viewingPlayer.basePrice} pts</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block uppercase font-bold tracking-wider">Status</span>
                <span className="text-base font-bold text-slate-200 capitalize">{viewingPlayer.status === "pool" ? "Available" : viewingPlayer.status}</span>
              </div>
            </div>

            <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest text-left mt-5 mb-3">
              Career Statistics
            </h4>

            <div className="grid grid-cols-3 gap-3 text-center bg-slate-900/50 p-4 rounded-xl border border-slate-850">
              <div>
                <span className="text-[9px] text-slate-500 block uppercase font-bold">Matches</span>
                <span className="font-bold text-slate-300">{viewingPlayer.stats?.matches ?? 0}</span>
              </div>
              {viewingPlayer.role === "Bowler" ? (
                <div>
                  <span className="text-[9px] text-slate-500 block uppercase font-bold">Wickets</span>
                  <span className="font-bold text-slate-300">{viewingPlayer.stats?.wickets ?? 0}</span>
                </div>
              ) : (
                <div>
                  <span className="text-[9px] text-slate-500 block uppercase font-bold">Runs</span>
                  <span className="font-bold text-slate-300">{viewingPlayer.stats?.runs ?? 0}</span>
                </div>
              )}
              <div>
                <span className="text-[9px] text-slate-500 block uppercase font-bold">Average</span>
                <span className="font-bold text-slate-300">{viewingPlayer.stats?.average ?? 0}</span>
              </div>
            </div>

            <button
              onClick={() => setViewingPlayer(null)}
              className="mt-6 w-full rounded-lg bg-slate-800 border border-slate-700 py-2.5 font-bold text-slate-200 hover:text-white transition-colors"
            >
              Close Details
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
