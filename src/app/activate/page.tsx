"use client";

import Link from "next/link";
import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { LogIn, LoaderCircle } from "lucide-react";

function ActivateContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<"loading" | "success" | "error">(token ? "loading" : "error");
  const [message, setMessage] = useState(token ? "" : "No activation token provided.");

  useEffect(() => {
    if (!token) return;

    let isMounted = true;
    async function activate() {
      try {
        const response = await fetch("/api/auth/activate", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ token }),
        });
        const result = await response.json().catch(() => ({}));
        if (!isMounted) return;
        if (!response.ok) throw new Error(result.detail || "Activation failed. The link may have expired.");
        setStatus("success");
      } catch (reason) {
        if (isMounted) {
          setStatus("error");
          setMessage(reason instanceof Error ? reason.message : "Unable to activate account.");
        }
      }
    }
    activate();
    return () => { isMounted = false; };
  }, [token]);

  return (
    <div className="mt-7">
      {status === "loading" && (
        <div className="flex flex-col items-center justify-center space-y-4 py-8">
          <LoaderCircle className="h-8 w-8 animate-spin text-[#12679a]" />
          <p className="text-sm font-medium text-slate-600">Activating your account...</p>
        </div>
      )}
      {status === "success" && (
        <div className="rounded-lg bg-green-50 p-4 text-green-800">
          <p className="font-semibold">Account Activated!</p>
          <p className="mt-2 text-sm">Your account is now ready. You can sign in to continue.</p>
          <Link href="/login" className="mt-4 inline-flex items-center justify-center rounded-lg bg-[#12679a] px-4 py-2 text-sm font-bold text-white hover:bg-[#0d527d]">
            Go to Sign In
          </Link>
        </div>
      )}
      {status === "error" && (
        <div className="rounded-lg bg-red-50 p-4 text-red-800">
          <p className="font-semibold">Activation Failed</p>
          <p className="mt-2 text-sm">{message}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/register" className="inline-flex items-center justify-center rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-bold text-red-700 hover:bg-red-50">
              Register again
            </Link>
            <Link href="/submitter/register" className="inline-flex items-center justify-center rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-bold text-red-700 hover:bg-red-50">
              Apply as Submitter again
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ActivatePage() {
  return (
    <section className="grid min-h-[70vh] place-items-center bg-[#f3f7fa] px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-7 shadow-sm sm:p-9">
        <div className="mb-7 grid h-12 w-12 place-items-center rounded-xl bg-sky-100 text-[#12679a]">
          <LogIn className="h-6 w-6" />
        </div>
        <h1 className="text-2xl font-bold text-[#143b5e]">Account Activation</h1>
        <Suspense fallback={<div className="mt-7 flex justify-center"><LoaderCircle className="h-6 w-6 animate-spin" /></div>}>
          <ActivateContent />
        </Suspense>
      </div>
    </section>
  );
}
