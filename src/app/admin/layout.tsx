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
        || (session.role === "editor" && ["/admin/content", "/admin/editorial", "/admin/generate", "/admin/reels", "/admin/analytics"].some((path) => pathname.startsWith(path)))
        || (session.role === "reviewer" && ["/admin/editorial", "/admin/reels", "/admin/analytics"].some((path) => pathname.startsWith(path)));
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
    window.dispatchEvent(new Event("polar-auth-changed"));
    router.replace("/login");
    router.refresh();
  }

  if (checking || !user || !allowed) return <div className="grid min-h-[65vh] place-items-center bg-[#f5f8fb] text-slate-700"><div className="flex items-center gap-3 text-sm">{checking ? <LoaderCircle className="h-5 w-5 animate-spin text-[#277ba5]" /> : <ShieldAlert className="h-5 w-5" />}{checking ? "Checking your account…" : "Redirecting…"}</div></div>;

  return <>
    <div className="border-b border-slate-200 bg-white px-4 py-2 text-slate-700 sm:px-6"><div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3"><div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-600"><span><span className="font-semibold text-[#143b5e]">Signed in:</span> {user.email} <span className="ml-2 rounded-full bg-sky-50 px-2.5 py-1 font-semibold uppercase text-[#12679a]">{user.role}</span></span><nav aria-label="Admin pages" className="flex flex-wrap items-center gap-3 font-semibold text-[#12679a]">{(user.role!=="reviewer")&&<><Link href="/admin/content">Content</Link><Link href="/admin/generate">AI Studio</Link></>}<Link href="/admin/editorial">Editorial</Link><Link href="/admin/reels">Reels</Link><Link href="/admin/analytics">Analytics</Link></nav></div><button onClick={signOut} className="inline-flex shrink-0 items-center gap-1.5 text-xs font-semibold text-[#12679a] hover:text-[#143b5e]"><LogOut className="h-4 w-4" />Sign out</button></div></div>
    {children}
    <div className="border-t border-slate-200 bg-white px-4 py-3 text-center text-xs text-slate-500"><Link href="/" className="font-medium text-[#12679a] hover:underline">Back to public website</Link></div>
  </>;
}
