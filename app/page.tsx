import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-[#0B0F19] px-6 py-12 text-slate-100">
      <div className="w-full max-w-md text-center">
        {/* Tournament Brand Card */}
        <div className="mb-8 rounded-2xl border border-slate-800 bg-[#1E293B] p-8 shadow-2xl">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-blue-500/10 text-3xl mb-4 border border-blue-500/20">
            🏏
          </div>
          <h1 className="text-3xl font-extrabold tracking-wider text-slate-100 uppercase sm:text-4xl">
            EPL<span className="text-blue-500 font-medium">Auction</span>
          </h1>
          <p className="mt-2 text-sm text-slate-400 font-medium tracking-wide uppercase">
            Live Player Auction Console
          </p>
          <div className="mt-4 inline-block rounded bg-blue-500/10 border border-blue-500/20 px-3 py-1 text-xs font-semibold text-blue-400">
            40 Players • 5 Teams • 8-Man Squads
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-4">
          <Link
            href="/dashboard"
            className="flex h-14 items-center justify-center rounded-xl bg-blue-600 font-bold text-white shadow-lg transition-all hover:bg-blue-500 hover:shadow-xl active:scale-[0.98]"
          >
            Continue as User (Public View)
          </Link>
          
          <div className="relative my-2 flex items-center justify-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-800" />
            </div>
            <span className="relative bg-[#0B0F19] px-3 text-xs font-bold text-slate-500 uppercase tracking-widest">
              or
            </span>
          </div>

          <Link
            href="/admin/login"
            className="flex h-14 items-center justify-center rounded-xl border border-slate-700 bg-slate-800/40 font-bold text-slate-200 transition-all hover:bg-slate-800 hover:text-white hover:border-slate-600 active:scale-[0.98]"
          >
            Access Admin Console
          </Link>

          <Link
            href="/projector"
            target="_blank"
            className="flex h-14 items-center justify-center rounded-xl border border-slate-700 bg-slate-800/40 font-bold text-slate-200 transition-all hover:bg-slate-800 hover:text-white hover:border-slate-600 active:scale-[0.98]"
          >
            Open Projector Screen (TV Display)
          </Link>

        </div>
      </div>
    </div>
  );
}
