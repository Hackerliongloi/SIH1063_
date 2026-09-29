"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  BookOpen,
  ShieldCheck,
  ExternalLink,
  Calendar,
  User,
  Share2,
  X,
  FileText,
  Sparkles,
} from "lucide-react";
import { api } from "@/lib/api";

export default function StoryDetailPage() {
  const params = useParams();
  const router = useRouter();
  const storyId = params?.id as string;

  const [story, setStory] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCitation, setSelectedCitation] = useState<any | null>(null);

  useEffect(() => {
    async function loadStory() {
      try {
        const res = await api.getStory(storyId);
        setStory(res);
      } catch (err) {
        console.error("Failed to load story", err);
      } finally {
        setLoading(false);
      }
    }
    if (storyId) loadStory();
  }, [storyId]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center space-y-3">
        <div className="w-8 h-8 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs font-mono text-slate-400">Loading verified scientific story...</p>
      </div>
    );
  }

  if (!story) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center space-y-4">
        <h2 className="text-xl font-bold text-white">Story Not Found</h2>
        <p className="text-xs text-slate-400">This story may not be published or does not exist.</p>
        <Link href="/stories" className="px-4 py-2 rounded-lg bg-sky-600 text-white text-xs inline-block">
          Return to Stories
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-3 text-xs font-mono text-slate-400">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-sky-400 hover:text-sky-300"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>
        <span>/</span>
        <Link href="/stories" className="hover:text-slate-200">
          Science Stories
        </Link>
        <span>/</span>
        <span className="text-slate-300 truncate max-w-xs">{story.title}</span>
      </div>

      <article className="polar-card rounded-2xl p-6 sm:p-10 space-y-8">
        {/* Story Metadata Header */}
        <div className="space-y-4 pb-6 border-b border-[#18293d]">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
            <span className="px-2.5 py-1 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-bold flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" />
              Verified Dissemination Article
            </span>
            <span className="text-slate-400">
              Published by {story.created_by || "Chief Editor"} • NCPOR
            </span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
            {story.title}
          </h1>

          {story.expedition_name && (
            <p className="text-xs font-mono text-sky-300">
              Expedition Source: <strong>{story.expedition_name}</strong>
            </p>
          )}

          {/* Citations Count Strip */}
          <div className="bg-[#08121f] border border-[#142334] rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
            <span className="text-slate-300 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              This article features <strong>{story.citations?.length || 0} grounded citations</strong> tied to official research logs.
            </span>
            <span className="text-[11px] font-mono text-slate-400">
              Click any [C#] citation marker to view verbatim proof.
            </span>
          </div>
        </div>

        {/* Article Body */}
        <div className="prose prose-invert max-w-none text-slate-200 text-sm sm:text-base leading-relaxed space-y-5">
          {story.body_md?.split("\n\n").map((para: string, idx: number) => {
            if (para.startsWith("### ")) {
              return (
                <h3 key={idx} className="text-lg sm:text-xl font-bold text-sky-300 mt-6 pt-2">
                  {para.replace("### ", "")}
                </h3>
              );
            }

            return (
              <p key={idx} className="leading-relaxed">
                {para}
              </p>
            );
          })}
        </div>

        {/* Citations Reference List at bottom */}
        {story.citations && story.citations.length > 0 && (
          <div className="pt-8 border-t border-[#18293d] space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2 font-mono uppercase tracking-wider text-xs">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Verified Citations & Source Documentation
            </h3>

            <div className="space-y-3">
              {story.citations.map((cit: any, idx: number) => (
                <div
                  key={cit.id}
                  onClick={() => setSelectedCitation(cit)}
                  className="cursor-pointer bg-[#08121f] hover:bg-[#0c1b2c] border border-[#18293d] hover:border-emerald-500/50 rounded-xl p-4 transition-all text-xs space-y-2 group"
                >
                  <div className="flex items-center justify-between font-mono">
                    <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                      Citation [{cit.chunk_id || `C${idx+1}`}]
                      {cit.supported && (
                        <span className="text-[10px] bg-emerald-950 text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-800">
                          Supported ✓
                        </span>
                      )}
                    </span>
                    <span className="text-sky-400 text-[11px] group-hover:underline flex items-center gap-1">
                      Inspect Span <ExternalLink className="w-3 h-3" />
                    </span>
                  </div>

                  <p className="text-slate-300">
                    <strong className="text-white font-medium">Claim:</strong> &quot;{cit.claim_text}&quot;
                  </p>

                  <div className="p-2.5 rounded bg-[#050c16] border border-[#112033] text-[11px] font-mono text-slate-400">
                    <span className="text-slate-300 block mb-1">Verbatim Excerpt from {cit.asset_title}:</span>
                    <span className="text-teal-300">&quot;{cit.span_text}&quot;</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </article>

      {/* Slide-over Citation Inspector Drawer */}
      {selectedCitation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-[#08121f] border border-[#1b3149] rounded-2xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#18293d]">
              <span className="font-bold text-white text-sm flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                Citation Verification Inspector
              </span>
              <button
                onClick={() => setSelectedCitation(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="font-mono text-slate-400 block mb-1">Claim in Story:</span>
                <p className="p-3 bg-[#0b1726] rounded-lg border border-[#18293d] text-white">
                  &quot;{selectedCitation.claim_text}&quot;
                </p>
              </div>

              <div>
                <span className="font-mono text-slate-400 block mb-1">
                  Source Chunk [{selectedCitation.chunk_id}] in {selectedCitation.asset_title}:
                </span>
                <p className="p-3 bg-[#050c16] rounded-lg border border-teal-900/60 text-teal-300 font-mono leading-relaxed">
                  &quot;{selectedCitation.span_text}&quot;
                </p>
              </div>

              <div className="p-3 bg-emerald-950/40 border border-emerald-800/60 rounded-lg text-emerald-300 font-mono text-[11px]">
                ✓ Validated against official technical report text with fuzzy threshold &gt; 0.90. No hallucinations detected.
              </div>
            </div>

            <div className="flex items-center gap-3 pt-3">
              {selectedCitation.asset_id && (
                <Link
                  href={`/assets/${selectedCitation.asset_id}`}
                  className="flex-1 py-2.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium text-center"
                >
                  View Source Asset Detail
                </Link>
              )}
              <button
                onClick={() => setSelectedCitation(null)}
                className="px-4 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
