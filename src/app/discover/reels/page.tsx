"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, Play } from "lucide-react";

type Reel = { id:number; title?:string; caption:string; video_url?:string|null; poster_key?:string|null; description?:string };

export default function ReelsPage(){
  const [reels,setReels]=useState<Reel[]>([]);
  const [loading,setLoading]=useState(true);
  useEffect(()=>{
    fetch("/api/feed/reels",{cache:"no-store"})
      .then(response=>response.ok?response.json():Promise.reject(new Error("Could not load reels")))
      .then(data=>setReels(Array.isArray(data.items)?data.items:[]))
      .catch(()=>setReels([]))
      .finally(()=>setLoading(false));
  },[]);

  return <main className="min-h-[65vh] bg-[#f5f8fb] px-4 py-8 text-slate-800"><div className="mx-auto max-w-md">
    <Link href="/discover" className="inline-flex items-center gap-2 text-sm font-medium text-[#12679a] hover:underline"><ArrowLeft className="h-4 w-4"/>Back to Discover</Link>
    <h1 className="mt-4 text-2xl font-bold text-[#143b5e]">Research reels</h1>
    {loading?<p className="mt-6 text-sm text-slate-600">Loading reels…</p>:reels.length?<div className="mt-5 h-[75vh] snap-y snap-mandatory space-y-5 overflow-y-auto">
      {reels.map(reel=><article key={reel.id} className="relative grid h-[72vh] snap-start place-items-center overflow-hidden rounded-2xl bg-gradient-to-b from-[#386f89] to-[#112c47] text-white">
        {reel.video_url?<video className="absolute inset-0 h-full w-full object-cover" src={reel.video_url} poster={reel.poster_key||undefined} controls playsInline preload="metadata" aria-label={reel.title||"Research reel"}/>:<div className="absolute inset-0 grid place-items-center"><div className="text-center"><Play className="mx-auto h-10 w-10"/><p className="mt-3 text-sm">Video unavailable</p></div></div>}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent px-5 pb-6 pt-20 text-white">
          {reel.title&&<h2 className="text-lg font-bold">{reel.title}</h2>}
          <p className="mt-2 whitespace-pre-line text-sm leading-6">{reel.caption}</p>
        </div>
      </article>)}
    </div>:<div className="mt-6 rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm"><p className="font-semibold text-[#143b5e]">No reels published yet</p><p className="mt-2 text-sm text-slate-600">Published research videos will appear here.</p></div>}
  </div></main>;
}
