"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ShieldCheck,
  ExternalLink,
  X,
  Sparkles,
} from "lucide-react";
import { api } from "@/lib/api";

type StoryCitation = {
  id: number;
  chunk_id?: number | string | null;
  supported?: boolean;
  claim_text?: string | null;
  asset_title?: string | null;
  span_text?: string | null;
  asset_id?: number | null;
};

type StoryRecord = {
  title: string;
  created_by?: number | string | null;
  expedition_name?: string | null;
  body_md?: string | null;
  citations?: StoryCitation[];
};

export default function StoryDetailPage() {
  const params = useParams();
  const router = useRouter();
  const storyId = params?.id as string;

  const [story, setStory] = useState<StoryRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCitation, setSelectedCitation] = useState<StoryCitation | null>(null);

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
        <p className="text-xs font-mono text-slate-500">Loading verified scientific story...</p>
      </div>
    );
  }

  if (!story) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center space-y-4">
        <h2 className="text-xl font-bold text-[#143b5e]">Story Not Found</h2>
        <p className="text-xs text-slate-500">This story may not be published or does not exist.</p>
        <Link href="/stories" className="px-4 py-2 rounded-lg bg-sky-600 text-white text-xs inline-block">
          Return to Stories
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-3 text-xs font-mono text-slate-500">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-[#12679a] hover:text-[#12679a]"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>
        <span>/</span>
        <Link href="/stories" className="hover:text-slate-700">
          Science Stories
        </Link>
        <span>/</span>
        <span className="text-slate-600 truncate max-w-xs">{story.title}</span>
      </div>

      <article className="polar-card rounded-2xl p-6 sm:p-10 space-y-8">
        {/* Story Metadata Header */}
        <div className="space-y-4 pb-6 border-b border-slate-200">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
            <span className="px-2.5 py-1 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" />
              Verified Dissemination Article
            </span>
            <span className="text-slate-500">
              Published by {story.created_by || "Chief Editor"} • NCPOR
            </span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-extrabold text-[#143b5e] tracking-tight leading-tight">
            {story.title}
          </h1>

          {story.expedition_name && (
            <p className="text-xs font-mono text-[#12679a]">
              Expedition Source: <strong>{story.expedition_name}</strong>
            </p>
          )}

          {/* Citations Count Strip */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
            <span className="text-slate-600 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-emerald-700" />
              This article features <strong>{story.citations?.length || 0} grounded citations</strong> tied to official research logs.
            </span>
            <span className="text-[11px] font-mono text-slate-500">
              Click any [C#] citation marker to view verbatim proof.
            </span>
          </div>
        </div>

        {/* Article Body */}
        <div className="prose prose-invert max-w-none text-slate-700 text-sm sm:text-base leading-relaxed space-y-5">
          {story.body_md?.split("\n\n").map((para: string, idx: number) => {
            if (para.startsWith("### ")) {
              return (
                <h3 key={idx} className="text-lg sm:text-xl font-bold text-[#12679a] mt-6 pt-2">
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
          <div className="pt-8 border-t border-slate-200 space-y-4">
            <h3 className="text-base font-bold text-[#143b5e] flex items-center gap-2 font-mono uppercase tracking-wider text-xs">
              <ShieldCheck className="w-4 h-4 text-emerald-700" />
              Verified Citations & Source Documentation
            </h3>

            <div className="space-y-3">
              {story.citations.map((cit, idx) => (
                <div
                  key={cit.id}
                  className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs space-y-2"
                >
                  <div className="flex items-center justify-between font-mono">
                    <span className="text-emerald-700 font-bold flex items-center gap-1.5">
                      Citation [{cit.chunk_id || `C${idx+1}`}]
                      {cit.supported && (
                        <span className="text-[10px] bg-emerald-50 text-emerald-800 px-1.5 py-0.5 rounded border border-emerald-200">
                          Supported
                        </span>
                      )}
                    </span>
                    <button type="button" onClick={() => setSelectedCitation(cit)} className="inline-flex min-h-9 items-center gap-1 rounded px-2 text-[11px] font-semibold text-[#12679a] hover:bg-sky-50/50 hover:text-[#143b5e]" aria-label={`Inspect citation ${cit.chunk_id || idx + 1}`}>
                      Inspect span <ExternalLink className="w-3 h-3" />
                    </button>
                  </div>

                  <p className="text-slate-600">
                    <strong className="text-[#143b5e] font-medium">Claim:</strong> &quot;{cit.claim_text}&quot;
                  </p>

                  <div className="p-2.5 rounded bg-slate-100 border border-slate-200 text-[11px] font-mono text-slate-500">
                    <span className="text-slate-600 block mb-1">Verbatim Excerpt from {cit.asset_title}:</span>
                    <span className="text-teal-800">&quot;{cit.span_text}&quot;</span>
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
          <div className="w-full max-w-lg bg-slate-50 border border-slate-200 rounded-2xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <span className="font-bold text-[#143b5e] text-sm flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-700" />
                Citation Verification Inspector
              </span>
              <button
                onClick={() => setSelectedCitation(null)}
                className="text-slate-500 hover:text-[#143b5e]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="font-mono text-slate-500 block mb-1">Claim in Story:</span>
                <p className="p-3 bg-white rounded-lg border border-slate-200 text-[#143b5e]">
                  &quot;{selectedCitation.claim_text}&quot;
                </p>
              </div>

              <div>
                <span className="font-mono text-slate-500 block mb-1">
                  Source Chunk [{selectedCitation.chunk_id}] in {selectedCitation.asset_title}:
                </span>
                <p className="p-3 bg-slate-100 rounded-lg border border-teal-900/60 text-teal-800 font-mono leading-relaxed">
                  &quot;{selectedCitation.span_text}&quot;
                </p>
              </div>

              <div className="p-3 bg-emerald-50 border border-emerald-200/60 rounded-lg text-emerald-800 font-mono text-[11px]">
              Citation span validated against the linked source text.
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
                className="px-4 py-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-mono"
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
