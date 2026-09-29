"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Bookmark, Heart, LoaderCircle, Play, Share2 } from "lucide-react";

type FeedItem = { id: number; kind: string; caption: string; hashtags?: string[]; primary_asset_id?: number; like_count: number; view_count: number; share_count: number; ai_assisted: boolean; source: string };

export default function DiscoverPage() {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [liked, setLiked] = useState<number[]>([]);
  const [saved, setSaved] = useState<number[]>([]);

  const loadFeed = useCallback(async () => {
    try {
      const response = await fetch("/api/feed?tab=for_you&limit=20", { cache: "no-store" });
      if (response.ok) {
        const body = await response.json();
        setItems(Array.isArray(body.items) ? body.items : []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFeed();
    try { setSaved(JSON.parse(localStorage.getItem("polar-saved-feed") || "[]")); } catch { setSaved([]); }
  }, [loadFeed]);

  const react = async (id: number, type: "like" | "share") => {
    const response = await fetch(`/api/feed/${id}/react`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type }) });
    if (response.ok) {
      const result = await response.json();
      setItems((current) => current.map((item) => item.id === id ? { ...item, like_count: result.like_count, share_count: result.share_count } : item));
      if (type === "like") setLiked((current) => result.liked ? [...current, id] : current.filter((itemId) => itemId !== id));
    }
  };

  const toggleSaved = (id: number) => {
    setSaved((current) => {
      const next = current.includes(id) ? current.filter((itemId) => itemId !== id) : [...current, id];
      localStorage.setItem("polar-saved-feed", JSON.stringify(next));
      return next;
    });
  };

  return <div className="min-h-[70vh] bg-[#f3f7fa] px-4 py-8 sm:px-6 lg:px-8">
    <div className="mx-auto max-w-5xl">
      <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-[#3982a8]">Polar field notes</p><h1 className="mt-2 text-3xl font-bold text-[#143b5e]">Discover</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Stories, photographs and short videos from polar and ocean research programmes.</p></div><Link href="/discover/reels" className="inline-flex items-center gap-2 rounded-md bg-[#143b5e] px-4 py-2.5 text-sm font-semibold text-white"><Play className="h-4 w-4" />Watch reels</Link></div>
      {loading ? <div className="grid min-h-60 place-items-center text-[#277ba5]"><LoaderCircle className="h-8 w-8 animate-spin" /></div> : items.length ? <div className="mx-auto mt-7 max-w-2xl space-y-5">{items.map((item) => <article key={item.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between p-4"><div><p className="text-sm font-bold text-[#143b5e]">NCPOR · {item.source === "auto" ? "Research story" : "Field update"}</p><p className="mt-0.5 text-xs text-slate-500">Polar and ocean research</p></div>{item.ai_assisted && <span className="rounded-full bg-violet-50 px-2.5 py-1 text-[10px] font-bold text-violet-700">AI-assisted</span>}</div>
        <div className="grid aspect-[4/3] place-items-center bg-gradient-to-br from-[#d9eaf2] via-[#91bdcf] to-[#285d79] text-center text-white"><div><div className="mx-auto grid h-14 w-14 place-items-center rounded-full border border-white/50 bg-white/20"><Play className="ml-1 h-6 w-6" /></div><p className="mt-3 text-xs font-semibold uppercase tracking-widest">Research archive</p></div></div>
        <div className="p-4"><div className="flex items-center gap-4"><button onClick={() => react(item.id, "like")} aria-label={liked.includes(item.id) ? "Unlike this post" : "Like this post"} className={`inline-flex items-center gap-1.5 text-sm ${liked.includes(item.id) ? "text-rose-600" : "text-slate-600 hover:text-rose-600"}`}><Heart className={`h-5 w-5 ${liked.includes(item.id) ? "fill-current" : ""}`} />{item.like_count}</button><button onClick={() => react(item.id, "share")} aria-label="Share post" className="inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-[#12679a]"><Share2 className="h-5 w-5" />{item.share_count}</button><span className="ml-auto text-xs text-slate-500">{item.view_count} views</span><button onClick={() => toggleSaved(item.id)} aria-label={saved.includes(item.id) ? "Remove saved post" : "Save post"} className={saved.includes(item.id) ? "text-[#12679a]" : "text-slate-500"}><Bookmark className={`h-5 w-5 ${saved.includes(item.id) ? "fill-current" : ""}`} /></button></div><p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-slate-700">{item.caption}</p>{item.hashtags?.length ? <p className="mt-2 text-sm text-[#277ba5]">{item.hashtags.map((tag) => `#${tag}`).join(" ")}</p> : null}<p className="mt-3 border-t border-slate-100 pt-3 text-xs text-slate-500">Source: NCPOR knowledge archive</p></div>
      </article>)}</div> : <div className="mt-8 rounded-2xl border border-slate-200 bg-white px-6 py-14 text-center"><p className="text-lg font-bold text-[#143b5e]">No published posts yet</p><p className="mt-2 text-sm text-slate-500">New field stories and research updates will appear here.</p><Link href="/explore" className="mt-5 inline-block rounded-md bg-[#12679a] px-4 py-2.5 text-sm font-semibold text-white">Explore the archive</Link></div>}
    </div>
  </div>;
}
