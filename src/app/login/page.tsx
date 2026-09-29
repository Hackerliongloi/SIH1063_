"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { LogIn, LoaderCircle } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.detail || "Sign in failed. Check your email and password.");
      const role = result.user?.role;
      if (!["admin", "editor", "reviewer", "viewer"].includes(role)) throw new Error("This account does not have an assigned portal role.");
      window.dispatchEvent(new Event("polar-auth-changed"));
      const next = new URLSearchParams(window.location.search).get("next");
      const roleCanOpenNext = role === "admin"
        || (role === "editor" && ["/admin/content", "/admin/editorial", "/admin/generate"].some((path) => next?.startsWith(path)))
        || (role === "reviewer" && next?.startsWith("/admin/editorial"));
      const safeNext = next?.startsWith("/admin") && roleCanOpenNext;
      router.replace(safeNext ? next! : role === "reviewer" ? "/admin/editorial" : role === "viewer" ? "/" : "/admin/content");
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to sign in. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return <section className="grid min-h-[70vh] place-items-center bg-[#f3f7fa] px-4 py-12">
    <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-7 shadow-sm sm:p-9">
      <div className="mb-7 grid h-12 w-12 place-items-center rounded-xl bg-sky-100 text-[#12679a]"><LogIn className="h-6 w-6" /></div>
      <p className="text-xs font-bold uppercase tracking-[0.15em] text-[#3982a8]">NCPOR portal</p>
      <h1 className="mt-2 text-2xl font-bold text-[#143b5e]">Staff and account sign in</h1>
      <p className="mt-2 text-sm leading-6 text-slate-600">Sign in with an account issued by your portal administrator. Public research pages remain available without an account.</p>
      <form className="mt-7 space-y-4" onSubmit={signIn}>
        <div><label htmlFor="email" className="mb-1.5 block text-sm font-semibold text-slate-700">Email</label><input id="email" name="email" type="email" autoComplete="username" required value={email} onChange={(event) => setEmail(event.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-slate-900 outline-none focus:border-sky-600 focus:ring-2 focus:ring-sky-100" /></div>
        <div><label htmlFor="password" className="mb-1.5 block text-sm font-semibold text-slate-700">Password</label><input id="password" name="password" type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-slate-900 outline-none focus:border-sky-600 focus:ring-2 focus:ring-sky-100" /></div>
        {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        <button type="submit" disabled={submitting} className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#12679a] px-4 py-3 text-sm font-bold text-white hover:bg-[#0d527d] disabled:cursor-wait disabled:opacity-60">{submitting && <LoaderCircle className="h-4 w-4 animate-spin" />}{submitting ? "Signing in…" : "Sign in"}</button>
      </form>
      <Link href="/" className="mt-5 inline-block text-sm font-semibold text-[#12679a] hover:underline">Return to public site</Link>
    </div>
  </section>;
}
