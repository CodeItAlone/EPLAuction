import Image from "next/image";

export interface PlayerStats {
  matches?: number;
  runs?: number;
  wickets?: number;
  average?: number;
  [key: string]: unknown;
}

export interface PlayerCardProps {
  player: {
    id: string;
    name: string;
    photoUrl?: string;
    role: "Batsman" | "Bowler" | "All-rounder" | "Wicket-Keeper";
    stats?: PlayerStats;
    basePrice: number;
    status: "pool" | "sold" | "unsold";
    soldPrice?: number | null;
    soldToTeamId?: string | null;
  };
  teamName?: string;
  teamLogo?: string;
}

export default function PlayerCard({ player, teamName, teamLogo }: PlayerCardProps) {
  const getRoleBadge = (role: string) => {
    switch (role) {
      case "Batsman":
        return { emoji: "🏏", bg: "bg-orange-500/20 text-orange-400 border-orange-500/30" };
      case "Bowler":
        return { emoji: "⚾", bg: "bg-blue-500/20 text-blue-400 border-blue-500/30" };
      case "All-rounder":
        return { emoji: "⚡", bg: "bg-purple-500/20 text-purple-400 border-purple-500/30" };
      case "Wicket-Keeper":
        return { emoji: "🧤", bg: "bg-teal-500/20 text-teal-400 border-teal-500/30" };
      default:
        return { emoji: "👤", bg: "bg-slate-500/20 text-slate-400 border-slate-500/30" };
    }
  };

  const badge = getRoleBadge(player.role);

  return (
    <div className="group relative overflow-hidden rounded-xl border border-slate-800 bg-[#1E293B] p-5 shadow-lg transition-all duration-300 hover:-translate-y-1 hover:border-slate-700 hover:shadow-2xl">
      {/* Background Glow */}
      <div className="absolute -right-16 -top-16 h-32 w-32 rounded-full bg-slate-700/10 blur-2xl transition-all group-hover:bg-blue-500/10" />

      <div className="flex items-start gap-4">
        {/* Player Image */}
        <div className="relative h-20 w-20 overflow-hidden rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center">
          {player.photoUrl ? (
            <Image
              src={player.photoUrl}
              alt={player.name}
              fill
              className="object-cover"
              sizes="80px"
              unoptimized
            />
          ) : (
            <span className="text-3xl text-slate-500">{badge.emoji}</span>
          )}
        </div>

        {/* Info */}
        <div className="flex-1">
          <h3 className="text-lg font-bold text-slate-100 line-clamp-1">{player.name}</h3>
          
          <div className="mt-1 flex items-center gap-2">
            <span className={`inline-flex items-center gap-1 rounded border px-2 py-0.5 text-xs font-semibold ${badge.bg}`}>
              <span>{badge.emoji}</span>
              <span>{player.role}</span>
            </span>
          </div>

          {/* Stats Preview */}
          <div className="mt-3 grid grid-cols-3 gap-2 rounded bg-slate-900/60 p-2 text-center text-xs">
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-500">Matches</p>
              <p className="font-semibold text-slate-300">{player.stats?.matches ?? "-"}</p>
            </div>
            {player.role === "Bowler" ? (
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-500">Wickets</p>
                <p className="font-semibold text-slate-300">{player.stats?.wickets ?? "-"}</p>
              </div>
            ) : (
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-500">Runs</p>
                <p className="font-semibold text-slate-300">{player.stats?.runs ?? "-"}</p>
              </div>
            )}
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-500">Avg</p>
              <p className="font-semibold text-slate-300">{player.stats?.average ?? "-"}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer / Status details */}
      <div className="mt-4 pt-4 border-t border-slate-800/80 flex items-center justify-between text-sm">
        <div>
          <span className="text-xs text-slate-500 font-bold uppercase tracking-wider block">Base Price</span>
          <span className="text-base font-black text-slate-200">{player.basePrice} pts</span>
        </div>

        <div className="text-right">
          {player.status === "sold" ? (
            <div>
              <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest block">SOLD</span>
              <div className="flex items-center gap-1 justify-end mt-0.5">
                {teamLogo && (
                  <div className="relative h-4 w-4 rounded overflow-hidden">
                    <Image src={teamLogo} alt={teamName || ""} fill className="object-cover" sizes="16px" unoptimized />
                  </div>
                )}
                <span className="font-black text-emerald-400 text-lg leading-none">{player.soldPrice} pts</span>
              </div>
              <span className="text-xs text-slate-300 font-bold block truncate max-w-[140px] mt-0.5">{teamName}</span>
            </div>
          ) : player.status === "unsold" ? (
            <div>
              <span className="text-[10px] text-red-400 font-bold uppercase tracking-widest block">UNSOLD</span>
              <span className="text-xs text-slate-500 font-medium block mt-0.5">Passed Pool</span>
            </div>
          ) : (
            <div>
              <span className="text-[10px] text-blue-400 font-bold uppercase tracking-widest block">AVAILABLE</span>
              <span className="text-xs text-slate-400 font-medium block mt-0.5">In Pool</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
