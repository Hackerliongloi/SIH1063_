"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";
import { LogOut, LoaderCircle, ShieldAlert } from "lucide-react";

type SessionUser = { id: number; email: string; role: "admin" | "editor" | "reviewer" | "viewer" };

export default function AdminLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [checking, setChecking] = useState(true);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/session", { cache: "no-store" }).then(async (response) => {
      if (!response.ok) throw new Error("Not signed in");
      return response.json();
    }).then((session: SessionUser) => {
      if (cancelled) return;
      setUser(session);
      const roleAllowsPage = session.role === "admin"
        || (session.role === "editor" && ["/admin/content", "/admin/editorial", "/admin/generate"].some((path) => pathname.startsWith(path)))
        || (session.role === "reviewer" && pathname.startsWith("/admin/editorial"));
      setAllowed(roleAllowsPage);
      setChecking(false);
      if (!roleAllowsPage) router.replace(session.role === "viewer" ? "/" : "/login");
    }).catch(() => {
      if (cancelled) return;
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    });
    return () => { cancelled = true; };
  }, [pathname, router]);

  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  if (checking || !user || !allowed) return <div className="grid min-h-[65vh] place-items-center bg-[#07111d] text-slate-200"><div className="flex items-center gap-3 text-sm">{checking ? <LoaderCircle className="h-5 w-5 animate-spin" /> : <ShieldAlert className="h-5 w-5" />}{checking ? "Checking your account…" : "Redirecting…"}</div></div>;

  return <>
    <div className="border-b border-white/10 bg-[#0b1826] px-4 py-2 text-white sm:px-6"><div className="mx-auto flex max-w-7xl items-center justify-between gap-3"><div className="min-w-0 text-xs text-slate-300"><span className="font-semibold text-white">Signed in:</span> {user.email} <span className="ml-2 rounded bg-sky-900/70 px-2 py-0.5 uppercase">{user.role}</span></div><button onClick={signOut} className="inline-flex shrink-0 items-center gap-1.5 text-xs font-semibold text-sky-200 hover:text-white"><LogOut className="h-4 w-4" />Sign out</button></div></div>
    {children}
    <div className="border-t border-white/10 bg-[#0b1826] px-4 py-2 text-center text-xs text-slate-400"><Link href="/" className="hover:text-white">Back to public website</Link></div>
  </>;
}
