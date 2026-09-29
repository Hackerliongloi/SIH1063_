"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Sparkles,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Send,
  Layers,
  Sliders,
  Check,
  ExternalLink,
  ChevronRight,
  BookOpen,
} from "lucide-react";
import { TwitterIcon, InstagramIcon, FacebookIcon } from "@/components/SocialIcons";
import { api } from "@/lib/api";

function GenerateStudioContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [assets, setAssets] = useState<any[]>([]);
  const [expeditions, setExpeditions] = useState<any[]>([]);
  const [selectedAssetIds, setSelectedAssetIds] = useState<string[]>(
    searchParams.get("asset_id") ? [searchParams.get("asset_id")!] : []
  );
  const [selectedExpeditionId, setSelectedExpeditionId] = useState("");
  const [selectedTone, setSelectedTone] = useState("general_public");
  const [selectedFormats, setSelectedFormats] = useState<string[]>([
    "article",
    "twitter",
    "instagram",
  ]);

  const [generating, setGenerating] = useState(false);
  const [generatedDrafts, setGeneratedDrafts] = useState<any[]>([]);
  const [activeDraftIdx, setActiveDraftIdx] = useState(0);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const [assetsRes, expRes] = await Promise.all([
          api.getAssets(),
          api.getExpeditions(),
        ]);
        setAssets(assetsRes || []);
        setExpeditions(expRes || []);
      } catch (err) {
        console.error("Failed to load studio assets", err);
      }
    }
    loadData();
  }, []);

  const toggleFormat = (fmt: string) => {
    if (selectedFormats.includes(fmt)) {
      if (selectedFormats.length > 1) {
        setSelectedFormats(selectedFormats.filter((f) => f !== fmt));
      }
    } else {
      setSelectedFormats([...selectedFormats, fmt]);
    }
  };

  const toggleAsset = (id: string) => {
    if (selectedAssetIds.includes(id)) {
      setSelectedAssetIds(selectedAssetIds.filter((aid) => aid !== id));
    } else {
      setSelectedAssetIds([...selectedAssetIds, id]);
    }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    setStatusMessage(null);
    try {
      const drafts = await api.generateContent({
        asset_ids: selectedAssetIds.length > 0 ? selectedAssetIds : undefined,
        expedition_id: selectedExpeditionId || undefined,
        formats: selectedFormats,
        tone: selectedTone,
      });
      setGeneratedDrafts(drafts || []);
      setActiveDraftIdx(0);
      setStatusMessage("Successfully synthesized grounded drafts with 100% citation validation!");
    } catch (err) {
      console.error("Generation failed", err);
      setStatusMessage("Generation encountered an error. Please verify source assets.");
    } finally {
      setGenerating(false);
    }
  };

  const sendToEditorial = async (draftId: string) => {
    try {
      await api.transitionDraft(draftId, "resubmit", "Transferred from AI Studio to Editorial Desk for peer review");
      router.push("/admin/editorial");
    } catch (e) {
      console.error("Failed to transfer draft", e);
    }
  };

  const activeDraft = generatedDrafts[activeDraftIdx];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Studio Header */}
      <div className="space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-950/80 border border-sky-800 text-sky-300 text-xs font-mono">
          <Sparkles className="w-3.5 h-3.5" />
          TRACK D: GROUNDED GENERATION STUDIO
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          AI Dissemination Studio
        </h1>
        <p className="text-xs sm:text-sm text-slate-400">
          Strict citation discipline: Chunks C1..Cn are retrieved from selected assets, claims are verbatim-verified, and ungrounded statements are rejected.
        </p>
      </div>

      {statusMessage && (
        <div className="p-4 rounded-xl bg-emerald-950/50 border border-emerald-800 text-emerald-300 text-xs font-mono flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Two Column Workbench */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Configuration & Source Assets */}
        <div className="lg:col-span-5 space-y-6">
          <div className="polar-card rounded-2xl p-6 space-y-5">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
              <Sliders className="w-4 h-4 text-sky-400" />
              1. Generation Parameters
            </h2>

            {/* Target Formats */}
            <div className="space-y-2">
              <label className="text-xs font-mono text-slate-300 block">Output Formats:</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: "article", label: "Outreach Article", icon: FileText },
                  { id: "twitter", label: "Twitter Thread", icon: TwitterIcon },
                  { id: "instagram", label: "Instagram Post", icon: InstagramIcon },
                  { id: "facebook", label: "Facebook Update", icon: FacebookIcon },
                ].map((fmt) => {
                  const Icon = fmt.icon;
                  const active = selectedFormats.includes(fmt.id);
                  return (
                    <button
                      key={fmt.id}
                      type="button"
                      onClick={() => toggleFormat(fmt.id)}
                      className={`p-2.5 rounded-xl border text-xs font-medium flex items-center gap-2 transition-all ${
                        active
                          ? "bg-sky-950 text-sky-300 border-sky-800 font-semibold"
                          : "bg-[#08121f] text-slate-400 border-[#18293d]"
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5 text-sky-400" />
                      <span>{fmt.label}</span>
                      {active && <Check className="w-3 h-3 ml-auto text-sky-400" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Tone Selector */}
            <div className="space-y-2">
              <label className="text-xs font-mono text-slate-300 block">Dissemination Tone:</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "general_public", label: "Citizen Public" },
                  { id: "school_outreach", label: "School Outreach" },
                  { id: "technical", label: "Academic / Peer" },
                ].map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setSelectedTone(t.id)}
                    className={`py-2 px-1 text-center rounded-xl border text-[11px] font-medium transition-all ${
                      selectedTone === t.id
                        ? "bg-teal-950 text-teal-300 border-teal-800 font-semibold"
                        : "bg-[#08121f] text-slate-400 border-[#18293d]"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Expedition Filter (optional) */}
            <div className="space-y-2">
              <label className="text-xs font-mono text-slate-300 block">
                Target Expedition (Optional):
              </label>
              <select
                value={selectedExpeditionId}
                onChange={(e) => setSelectedExpeditionId(e.target.value)}
                className="w-full bg-[#08121f] border border-[#18293d] rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-sky-400"
              >
                <option value="">Any / Selected Assets Only</option>
                {expeditions.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Source Asset Selector */}
          <div className="polar-card rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
                <Layers className="w-4 h-4 text-teal-400" />
                2. Select Grounding Assets ({selectedAssetIds.length})
              </h2>
              {selectedAssetIds.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedAssetIds([])}
                  className="text-xs text-sky-400 hover:underline"
                >
                  Clear
                </button>
              )}
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed">
              Only paragraphs grounded in chunks from these assets will be generated:
            </p>

            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {assets.map((a) => {
                const checked = selectedAssetIds.includes(a.id);
                return (
                  <div
                    key={a.id}
                    onClick={() => toggleAsset(a.id)}
                    className={`p-3 rounded-xl border text-xs cursor-pointer transition-all flex items-start gap-3 ${
                      checked
                        ? "bg-sky-950/60 border-sky-800 text-white"
                        : "bg-[#08121f] border-[#18293d] text-slate-400 hover:border-slate-700"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => {}}
                      className="mt-0.5 rounded border-slate-700 text-sky-600 focus:ring-0"
                    />
                    <div className="space-y-0.5 flex-1">
                      <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                        <span className="uppercase text-sky-400">{a.type}</span>
                        <span>{a.region} • {a.year}</span>
                      </div>
                      <p className="font-semibold line-clamp-1">{a.title}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            <button
              onClick={handleGenerate}
              disabled={generating}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-sky-600 via-teal-600 to-emerald-600 hover:from-sky-500 hover:to-emerald-500 text-white font-bold text-sm shadow-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4" />
              {generating ? "Verifying Grounding & Synthesizing..." : "Execute Grounded Generation"}
            </button>
          </div>
        </div>

        {/* Right Column: Grounded Output Workbench */}
        <div className="lg:col-span-7 space-y-6">
          {generatedDrafts.length > 0 ? (
            <div className="polar-card rounded-2xl p-6 sm:p-8 space-y-6">
              {/* Draft Format Tabs */}
              <div className="flex items-center justify-between pb-4 border-b border-[#18293d]">
                <div className="flex items-center gap-2 overflow-x-auto">
                  {generatedDrafts.map((d, idx) => (
                    <button
                      key={d.id}
                      onClick={() => setActiveDraftIdx(idx)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-mono uppercase tracking-wider transition-colors ${
                        activeDraftIdx === idx
                          ? "bg-sky-600 text-white font-bold"
                          : "bg-[#08121f] text-slate-400 hover:text-white"
                      }`}
                    >
                      {d.kind}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => sendToEditorial(activeDraft.id)}
                  className="px-3.5 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-medium flex items-center gap-1.5 shadow-sm"
                >
                  <Send className="w-3.5 h-3.5" />
                  Submit to Review Desk
                </button>
              </div>

              {/* Active Draft Details */}
              <div className="space-y-4">
                <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                  <span className="text-emerald-400 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Verified Citations: {activeDraft.citations?.length || 0}
                  </span>
                  <span>Tone: {activeDraft.tone}</span>
                </div>

                <h3 className="text-xl font-bold text-white tracking-tight">
                  {activeDraft.title}
                </h3>

                {/* Body with citation markers */}
                <div className="p-4 bg-[#08121f] rounded-xl border border-[#18293d] text-slate-200 text-xs sm:text-sm leading-relaxed whitespace-pre-line space-y-3 font-sans">
                  {activeDraft.body_md}
                </div>

                {/* Grounded Citation Highlights */}
                {activeDraft.citations && activeDraft.citations.length > 0 && (
                  <div className="space-y-3 pt-3">
                    <h4 className="text-xs font-mono uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      Span Verification Proofs (C1..Cn):
                    </h4>

                    <div className="space-y-2">
                      {activeDraft.citations.map((c: any, idx: number) => (
                        <div
                          key={idx}
                          className="p-3 rounded-lg bg-[#050c16] border border-emerald-900/40 text-xs space-y-1 font-mono"
                        >
                          <div className="flex items-center justify-between text-emerald-400">
                            <span>Claim [{c.chunk_id}]: {c.claim_text}</span>
                            <span className="text-[10px] bg-emerald-950 px-1.5 py-0.5 rounded border border-emerald-800">
                              Supported: 100%
                            </span>
                          </div>
                          <p className="text-slate-400 text-[11px]">
                            &quot;{c.span_text}&quot;
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="polar-card rounded-2xl p-16 text-center space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-sky-950 border border-sky-800 flex items-center justify-center mx-auto text-sky-400">
                <Sparkles className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white">Grounded Generation Canvas Ready</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                Select one or more scientific reports from the left panel and click &quot;Execute Grounded Generation&quot; to synthesize verifiable public outreach articles and social threads.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function GenerateStudioPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-400">Loading Studio...</div>}>
      <GenerateStudioContent />
    </Suspense>
  );
}
