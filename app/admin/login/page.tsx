"use client";

import { useEffect, useState, Suspense } from "react";
import { signInWithPopup, signOut } from "firebase/auth";
import { auth, googleProvider, db } from "@/lib/firebaseClient";
import { useRouter, useSearchParams } from "next/navigation";
import { collection, query, where, getDocs } from "firebase/firestore";

function LoginContent() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const errorParam = searchParams.get("error");
    if (errorParam) {
      const timer = setTimeout(() => {
        if (errorParam === "unauthorized") {
          setError("Unauthorized access: Your Google account is not on the admin allowlist.");
        } else if (errorParam === "error") {
          setError("An error occurred during authentication. Please try again.");
        }
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [searchParams]);

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      if (!user.email) {
        throw new Error("No email associated with Google account");
      }

      // Check if user is in Firestore admins allowlist
      const q = query(
        collection(db, "admins"),
        where("email", "==", user.email),
        where("active", "==", true)
      );
      const snap = await getDocs(q);

      if (snap.empty) {
        await signOut(auth);
        localStorage.removeItem("admin_token");
        setError("Unauthorized access: Your Google account is not configured as an active administrator.");
      } else {
        const token = await user.getIdToken();
        localStorage.setItem("admin_token", token);
        router.push("/admin/dashboard");
      }
    } catch (err) {
      console.error(err);
      const msg = err instanceof Error ? err.message : String(err);
      if (typeof err === "object" && err !== null && "code" in err && err.code === "auth/popup-closed-by-user") {
        return;
      }
      setError(msg || "An error occurred during sign-in.");
    } finally {
      setLoading(false);
    }
  };

  const handleDevBypass = () => {
    localStorage.setItem("admin_token", "dev-bypass-token");
    router.push("/admin/dashboard");
  };

  const isDev = process.env.NODE_ENV === "development";

  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-[#0B0F19] px-6 py-12 text-slate-100">
      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-slate-800 bg-[#1E293B] p-8 shadow-2xl">
          <h2 className="text-2xl font-black tracking-wider text-slate-100 uppercase text-center mb-6">
            ADMIN <span className="text-blue-500">PORTAL</span>
          </h2>

          {error && (
            <div className="mb-6 rounded-lg border border-red-500/30 bg-red-500/10 p-3.5 text-sm text-red-400 font-semibold leading-relaxed">
              ⚠️ {error}
            </div>
          )}

          <div className="flex flex-col gap-4">
            <button
              onClick={handleGoogleLogin}
              disabled={loading}
              className="flex h-12 w-full items-center justify-center gap-3 rounded-lg bg-white px-4 font-bold text-slate-900 transition-all hover:bg-slate-100 active:scale-[0.98] disabled:opacity-50"
            >
              {loading ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-350 border-t-slate-900" />
              ) : (
                <svg className="h-5 w-5" viewBox="0 0 24 24" width="24" height="24">
                  <path
                    fill="#EA4335"
                    d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.145-5.136 4.145-3.376 0-6.113-2.737-6.113-6.113s2.737-6.113 6.113-6.113c1.554 0 2.973.58 4.07 1.53l3.078-3.078C18.995 2.223 15.82 1 12.24 1 6.033 1 12.24s5.033 11.24 11.24 11.24c6.48 0 11.24-4.56 11.24-11.24 0-.768-.08-1.5-.224-2.185H12.24z"
                  />
                </svg>
              )}
              {loading ? "Signing in..." : "Continue with Google"}
            </button>
          </div>

          {isDev && (
            <div className="mt-8 border-t border-slate-800 pt-4 text-center">
              <p className="text-xs text-slate-500 font-medium mb-2">Development Bypass Mode</p>
              <button
                onClick={handleDevBypass}
                className="text-xs text-blue-400 font-bold hover:underline"
              >
                Bypass Authentication (Dev Mode)
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AdminLogin() {
  return (
    <Suspense fallback={
      <div className="flex flex-1 flex-col items-center justify-center bg-[#0B0F19] text-slate-100 min-h-screen">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-700 border-t-blue-500" />
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}
