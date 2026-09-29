"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { BookOpen, Sparkles, ArrowRight, ShieldCheck, Calendar, User, FileText } from "lucide-react";
import { api } from "@/lib/api";

export default function StoriesPage() {
  const [stories, setStories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStories() {
      try {
        const res = await api.getStories();
        setStories(res || []);
      } catch (err) {
        console.error("Failed to load stories", err);
      } finally {
        setLoading(false);
      }
    }
    loadStories();
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
      <div className="max-w-3xl space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950/80 border border-emerald-800 text-emerald-300 text-xs font-mono">
          <Sparkles className="w-3.5 h-3.5" />
          GROUNDED POLAR DISSEMINATION
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
          Polar Science Dispatches & Outreach
        </h1>
        <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
          Open-access narratives explaining scientific discoveries from Indian Antarctic, Arctic, Southern Ocean, and Himalayan expeditions. Every factual claim is rigorously grounded with clickable citations to peer-reviewed reports and datasets.
        </p>
      </div>

      {loading ? (
        <div className="py-20 text-center space-y-3">
          <div className="w-8 h-8 border-2 border-sky-400 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-mono text-slate-400">Loading published stories...</p>
        </div>
      ) : stories.length === 0 ? (
        <div className="polar-card rounded-xl p-12 text-center text-slate-400 text-sm">
          No stories published yet. Visit the Editorial Desk to approve and publish pending drafts.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {stories.map((story) => (
            <Link
              key={story.id}
              href={`/stories/${story.id}`}
              className="polar-card rounded-2xl p-6 flex flex-col justify-between group hover:border-emerald-500/50 transition-all"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-emerald-400 font-semibold flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    {story.citations?.length || 0} Grounded Citations
                  </span>
                  <span className="text-slate-400">
                    {story.expedition_name ? story.expedition_name.split("(")[0] : "Polar Program"}
                  </span>
                </div>

                <h3 className="text-lg font-bold text-white group-hover:text-emerald-300 transition-colors leading-snug">
                  {story.title}
                </h3>

                <p className="text-xs text-slate-400 line-clamp-3 leading-relaxed">
                  {story.body_md?.replace(/[#*`]/g, "").slice(0, 200)}...
                </p>
              </div>

              <div className="pt-4 border-t border-[#142334] flex items-center justify-between text-xs font-mono text-slate-400">
                <span>By {story.created_by || "Chief Editor"}</span>
                <span className="text-emerald-400 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                  Read Story <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
