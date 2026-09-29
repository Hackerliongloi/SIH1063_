"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, BookOpen, LoaderCircle, ShieldCheck } from "lucide-react";
import SectionPage from "@/components/SectionPage";
import { api } from "@/lib/api";

type StoryListItem = { id: number | string; title: string; summary?: string | null; excerpt?: string | null; body_md?: string | null; expedition_name?: string | null };

export default function StoriesPage() {
  const [stories, setStories] = useState<StoryListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    api.getStories().then((response) => {
      if (!active) return;
      const items = Array.isArray(response) ? response : Array.isArray(response?.items) ? response.items : [];
      setStories(items as StoryListItem[]);
    }).catch(() => {
      if (active) setFailed(true);
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, []);

  return <SectionPage section="Outreach" title="Science stories" intro="Accessible stories about research across Antarctica, the Arctic, the Southern Ocean and the high Himalaya.">
    {loading ? <div className="grid min-h-52 place-items-center rounded-xl border border-slate-200 bg-white text-[#277ba5]"><div className="flex items-center gap-3 text-sm"><LoaderCircle className="h-5 w-5 animate-spin" />Loading published stories</div></div>
      : failed ? <div role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900">Stories could not be loaded right now. Please try again shortly.</div>
      : stories.length === 0 ? <div className="rounded-xl border border-slate-200 bg-white px-6 py-14 text-center shadow-sm"><BookOpen className="mx-auto h-8 w-8 text-slate-400" /><h2 className="mt-3 text-lg font-bold text-[#143b5e]">No stories published yet</h2><p className="mt-2 text-sm text-slate-600">Published outreach stories will appear here.</p></div>
      : <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{stories.map((story) => {
        const excerpt = (story.summary || story.excerpt || story.body_md || "").replace(/[#*`]/g, "").trim();
        return <Link key={story.id} href={`/stories/${story.id}`} className="group flex min-h-64 flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-sky-300 hover:shadow-md">
          <div className="flex items-center justify-between gap-3"><span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800"><ShieldCheck className="h-3.5 w-3.5" />Verified story</span><span className="text-xs text-slate-500">{story.expedition_name || "Polar research"}</span></div>
          <h2 className="mt-4 text-lg font-bold leading-snug text-[#143b5e] group-hover:text-[#12679a]">{story.title}</h2>
          <p className="mt-2 line-clamp-4 text-sm leading-6 text-slate-600">{excerpt ? `${excerpt.slice(0, 240)}${excerpt.length > 240 ? "…" : ""}` : "Explore this published research story."}</p>
          <span className="mt-auto inline-flex items-center gap-1.5 pt-5 text-sm font-semibold text-[#12679a]">Read story <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></span>
        </Link>;
      })}</div>}
  </SectionPage>;
}
