"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { LogIn, LoaderCircle } from "lucide-react";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function register(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.detail || "Registration failed. Please try again.");
      setSuccess(true);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to register. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return <section className="grid min-h-[70vh] place-items-center bg-[#f3f7fa] px-4 py-12">
    <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-7 shadow-sm sm:p-9">
      <div className="mb-7 grid h-12 w-12 place-items-center rounded-xl bg-sky-100 text-[#12679a]"><LogIn className="h-6 w-6" /></div>
      <p className="text-xs font-bold uppercase tracking-[0.15em] text-[#3982a8]">NCPOR portal</p>
      <h1 className="mt-2 text-2xl font-bold text-[#143b5e]">Submitter Registration</h1>
      <p className="mt-2 text-sm leading-6 text-slate-600">Register as a submitter to upload and manage your datasets.</p>
      
      {success ? (
        <div className="mt-7 rounded-lg bg-green-50 p-4 text-green-800">
          <p className="font-semibold">Registration successful!</p>
          <p className="mt-2 text-sm">Please check your email for the activation link to complete the process.</p>
        </div>
      ) : (
        <form className="mt-7 space-y-4" onSubmit={register}>
          <div><label htmlFor="email" className="mb-1.5 block text-sm font-semibold text-slate-700">Email</label><input id="email" name="email" type="email" autoComplete="username" required value={email} onChange={(event) => setEmail(event.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-slate-900 outline-none focus:border-sky-600 focus:ring-2 focus:ring-sky-100" /></div>
          <div><label htmlFor="password" className="mb-1.5 block text-sm font-semibold text-slate-700">Password (min 12 characters)</label><input id="password" name="password" type="password" autoComplete="new-password" required minLength={12} value={password} onChange={(event) => setPassword(event.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-slate-900 outline-none focus:border-sky-600 focus:ring-2 focus:ring-sky-100" /></div>
          {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
          <button type="submit" disabled={submitting} className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#12679a] px-4 py-3 text-sm font-bold text-white hover:bg-[#0d527d] disabled:cursor-wait disabled:opacity-60">{submitting && <LoaderCircle className="h-4 w-4 animate-spin" />}{submitting ? "Registering…" : "Register"}</button>
        </form>
      )}
      <div className="mt-5 flex items-center justify-between">
        <Link href="/login" className="inline-block text-sm font-semibold text-[#12679a] hover:underline">Sign in instead</Link>
        <Link href="/" className="inline-block text-sm font-semibold text-[#12679a] hover:underline">Return to public site</Link>
      </div>
    </div>
  </section>;
}
