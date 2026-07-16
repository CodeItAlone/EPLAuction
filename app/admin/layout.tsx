"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { collection, query, where, getDocs } from "firebase/firestore";
import { auth, db } from "@/lib/firebaseClient";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const router = useRouter();
  const pathname = usePathname();
  const isLoginPage = pathname === "/admin/login";

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Check for development bypass token
        const devBypass = localStorage.getItem("admin_token") === "dev-bypass-token";
        if (devBypass && process.env.NODE_ENV === "development") {
          setCurrentUser(user);
          setLoading(false);
          return;
        }

        try {
          // Verify that email exists in the admins collection and is active
          const q = query(
            collection(db, "admins"),
            where("email", "==", user.email),
            where("active", "==", true)
          );
          const snap = await getDocs(q);

          if (snap.empty) {
            // Unauthenticated/Unauthorized email -> Sign out immediately
            await signOut(auth);
            localStorage.removeItem("admin_token");
            setCurrentUser(null);
            
            // Allow login screen to display an inline error, but redirect users from pages
            if (!isLoginPage) {
              router.push("/admin/login?error=unauthorized");
            }
          } else {
            // Authorized admin
            const token = await user.getIdToken();
            localStorage.setItem("admin_token", token);
            setCurrentUser(user);
            if (isLoginPage) {
              router.push("/admin/dashboard");
            }
          }
        } catch (error) {
          console.error("Authorization check failed:", error);
          await signOut(auth);
          localStorage.removeItem("admin_token");
          setCurrentUser(null);
          router.push("/admin/login?error=error");
        }
      } else {
        // Not logged in
        localStorage.removeItem("admin_token");
        setCurrentUser(null);
        if (!isLoginPage) {
          router.push("/admin/login");
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router, pathname, isLoginPage]);

  if (loading) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center bg-[#0B0F19] text-slate-100 min-h-screen">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-700 border-t-blue-500" />
          <p className="text-sm font-bold uppercase tracking-widest text-slate-400">Verifying Admin Access...</p>
        </div>
      </div>
    );
  }

  // Render nothing during redirect
  if (!currentUser && !isLoginPage) {
    return null;
  }

  return <>{children}</>;
}
