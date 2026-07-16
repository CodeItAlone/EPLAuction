"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { auth } from "@/lib/firebaseClient";

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  if (pathname === "/projector") return null;

  const isAdminPath = pathname.startsWith("/admin");


  const handleSignOut = async () => {
    try {
      await signOut(auth);
      localStorage.removeItem("admin_token");
      router.push("/");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  return (
    <nav className="border-b border-slate-800 bg-[#0B0F19] px-6 py-4 text-slate-200">
      <div className="mx-auto flex max-w-7xl items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-xl font-extrabold tracking-wider text-blue-500 sm:text-2xl">
            EPL<span className="text-slate-100 font-medium">Auction</span>
          </span>
        </Link>

        <div className="flex items-center gap-6 font-semibold">
          {isAdminPath ? (
            <>
              <Link
                href="/admin/dashboard"
                className={`transition-colors hover:text-blue-400 ${
                  pathname === "/admin/dashboard" ? "text-blue-500" : "text-slate-400"
                }`}
              >
                Dashboard
              </Link>
              <Link
                href="/admin/live-auction"
                className={`transition-colors hover:text-blue-400 ${
                  pathname === "/admin/live-auction" ? "text-blue-500" : "text-slate-400"
                }`}
              >
                Live Auction
              </Link>
              <Link
                href="/admin/players"
                className={`transition-colors hover:text-blue-400 ${
                  pathname === "/admin/players" ? "text-blue-500" : "text-slate-400"
                }`}
              >
                Players
              </Link>
              <Link
                href="/admin/teams"
                className={`transition-colors hover:text-blue-400 ${
                  pathname === "/admin/teams" ? "text-blue-500" : "text-slate-400"
                }`}
              >
                Teams
              </Link>
            </>
          ) : (
            <>
              <Link
                href="/dashboard"
                className={`transition-colors hover:text-blue-400 ${
                  pathname === "/dashboard" ? "text-blue-500" : "text-slate-400"
                }`}
              >
                Public Scoreboard
              </Link>
            </>
          )}

          {isAdminPath && user ? (
            <button
              onClick={handleSignOut}
              className="rounded-md border border-red-500/30 bg-red-500/10 px-4 py-1.5 text-sm text-red-400 transition-all hover:bg-red-500 hover:text-white"
            >
              Logout
            </button>
          ) : (
            <Link
              href={isAdminPath ? "/dashboard" : "/admin/login"}
              className="rounded-md border border-slate-700 bg-slate-800/50 px-4 py-1.5 text-sm transition-all hover:bg-slate-800 hover:text-white"
            >
              {isAdminPath ? "Exit Admin" : "Admin Login"}
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
