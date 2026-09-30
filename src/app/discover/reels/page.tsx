"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, Play } from "lucide-react";

type Reel = { id: number; caption: string; mp4_key?: string; hls_key?: string; poster_key?: string };

export default function ReelsPage() {
  const [reels, setReels] = useState<Reel[]>([]);
  useEffect(() => { fetch("/api/feed/reels", { cache: "no-store" }).then((r) => r.ok ? r.json() : { items: [] }).then((data) => setReels(Array.isArray(data.items) ? data.items : [])).catch(() => setReels([])); }, []);
  return <main className="min-h-[65vh] bg-[#f5f8fb] px-4 py-8 text-slate-800"><div className="mx-auto max-w-md"><Link href="/discover" className="inline-flex items-center gap-2 text-sm font-medium text-[#12679a] hover:underline"><ArrowLeft className="h-4 w-4" />Back to Discover</Link><h1 className="mt-4 text-2xl font-bold text-[#143b5e]">Research reels</h1>{reels.length ? <div className="mt-5 h-[75vh] snap-y snap-mandatory space-y-5 overflow-y-auto">{reels.map((reel) => <article key={reel.id} className="relative grid h-[72vh] snap-start place-items-center overflow-hidden rounded-2xl bg-gradient-to-b from-[#386f89] to-[#112c47] text-white"><div className="text-center"><Play className="mx-auto h-10 w-10" /><p className="mt-3 max-w-xs text-sm">{reel.caption}</p></div>{reel.mp4_key && <video className="absolute inset-0 h-full w-full object-cover" src={reel.mp4_key} controls playsInline preload="metadata" />}</article>)}</div> : <div className="mt-6 rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm"><p className="font-semibold text-[#143b5e]">No reels published yet</p><p className="mt-2 text-sm text-slate-600">Published research videos will appear in this vertical viewer.</p></div>}</div></main>;
}
