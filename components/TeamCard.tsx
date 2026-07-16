import Image from "next/image";
import { calculateMaxAllowedBid, BASE_PRICE, MAX_SQUAD_SIZE } from "@/lib/bidValidation";

export interface TeamCardProps {
  team: {
    id: string;
    teamName: string;
    ownerName: string;
    logoUrl?: string;
    startingWallet: number;
    walletRemaining: number;
    playersBoughtCount: number;
  };
  highlighted?: boolean;
}

export default function TeamCard({ team, highlighted = false }: TeamCardProps) {
  const maxBid = calculateMaxAllowedBid(team.walletRemaining, team.playersBoughtCount);
  const isFull = team.playersBoughtCount >= MAX_SQUAD_SIZE;

  const spent = team.startingWallet - team.walletRemaining;
  const remainingSlots = Math.max(0, MAX_SQUAD_SIZE - team.playersBoughtCount);
  const reservedBudget = remainingSlots * BASE_PRICE;

  return (
    <div
      className={`group relative overflow-hidden rounded-xl border p-5 shadow-lg transition-all duration-300 ${
        highlighted
          ? "border-blue-500 bg-slate-800/80 ring-1 ring-blue-500/50"
          : "border-slate-800 bg-[#1E293B] hover:-translate-y-1 hover:border-slate-700"
      }`}
    >
      <div className="flex items-center gap-4">
        {/* Team Logo */}
        <div className="relative h-14 w-14 overflow-hidden rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center">
          {team.logoUrl ? (
            <Image
              src={team.logoUrl}
              alt={team.teamName}
              fill
              className="object-cover"
              sizes="56px"
              unoptimized
            />
          ) : (
            <span className="text-xl font-black text-slate-500">
              {team.teamName.substring(0, 2).toUpperCase()}
            </span>
          )}
        </div>

        {/* Name / Owner */}
        <div className="flex-1 min-w-0">
          <h4 className="text-base font-bold text-slate-100 truncate">{team.teamName}</h4>
          <p className="text-xs text-slate-400 truncate">Owner: {team.ownerName}</p>
        </div>
      </div>

      {/* Roster Progress Bar */}
      <div className="mt-4">
        <div className="flex justify-between text-xs font-bold text-slate-300 mb-1">
          <span>SQUAD CAPACITY</span>
          <span className={isFull ? "text-emerald-400" : "text-blue-400"}>
            {team.playersBoughtCount} / {MAX_SQUAD_SIZE} Players (Need {remainingSlots})
          </span>
        </div>
        <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              isFull ? "bg-emerald-500" : "bg-blue-500"
            }`}
            style={{ width: `${(team.playersBoughtCount / MAX_SQUAD_SIZE) * 100}%` }}
          />
        </div>
      </div>

      {/* Wallet Stats Grid */}
      <div className="mt-4 grid grid-cols-3 gap-2 pt-3 border-t border-slate-850 text-center">
        <div>
          <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">
            Spent
          </span>
          <span className="text-sm font-extrabold text-slate-350">{spent} pts</span>
        </div>

        <div>
          <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">
            Reserved
          </span>
          <span className="text-sm font-extrabold text-slate-350">{reservedBudget} pts</span>
        </div>

        <div>
          <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">
            Remaining
          </span>
          <span className="text-sm font-extrabold text-slate-200">{team.walletRemaining} pts</span>
        </div>
      </div>

      {/* Maximum allowed bid banner */}
      <div className="mt-4 pt-3 border-t border-slate-850 flex items-center justify-between">
        <span className="text-xs font-bold text-slate-400">MAX ALLOWED BID</span>
        {isFull ? (
          <span className="text-xs font-bold text-slate-500">Squad Full</span>
        ) : maxBid < BASE_PRICE ? (
          <span className="text-xs font-bold text-red-400">Ineligible</span>
        ) : (
          <span className="text-sm font-black text-blue-400">{maxBid} pts</span>
        )}
      </div>
    </div>
  );
}
