"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Sparkles,
  Clapperboard,
  BookOpen,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Send,
  Layers,
  Sliders,
  Check,
} from "lucide-react";
import { TwitterIcon, InstagramIcon, FacebookIcon } from "@/components/SocialIcons";
import { api } from "@/lib/api";

type StudioAsset = { id: string | number; title: string; type?: string; region?: string; year?: string | number };
type StudioExpedition = { id: string | number; name: string };
type StudioCitation = { chunk_id?: string | number; claim_text?: string; span_text?: string };
type GeneratedDraft = { id: string | number; kind: string; tone?: string; title: string; body_md: string; citations?: StudioCitation[] };

function GenerateStudioContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [assets, setAssets] = useState<StudioAsset[]>([]);
  const [expeditions, setExpeditions] = useState<StudioExpedition[]>([]);
  const [selectedAssetIds, setSelectedAssetIds] = useState<string[]>(
    searchParams.get("asset_id") ? [searchParams.get("asset_id")!] : []
  );
  const [selectedExpeditionId, setSelectedExpeditionId] = useState("");
  const [generationTheme, setGenerationTheme] = useState("");
  const [selectedTone, setSelectedTone] = useState("general_public");
  const [selectedFormats, setSelectedFormats] = useState<string[]>([
    "article",
    "twitter",
    "instagram",
  ]);

  const [generating, setGenerating] = useState(false);
  const [generatedDrafts, setGeneratedDrafts] = useState<GeneratedDraft[]>([]);
  const [activeDraftIdx, setActiveDraftIdx] = useState(0);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [statusIsError, setStatusIsError] = useState(false);
  const [assetLoadError, setAssetLoadError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const [assetsRes, expRes] = await Promise.all([
          api.getLiveAssets(),
          api.getLiveExpeditions(),
        ]);
        setAssets(Array.isArray(assetsRes) ? assetsRes as StudioAsset[] : []);
        setExpeditions(Array.isArray(expRes) ? expRes as StudioExpedition[] : []);
      } catch (err) {
        console.error("Failed to load studio assets", err);
        setAssetLoadError(err instanceof Error ? err.message : "Could not load repository assets.");
      }
    }
    const timer = window.setTimeout(() => { void loadData(); }, 0);
    return () => window.clearTimeout(timer);
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
    if (!selectedAssetIds.length && !selectedExpeditionId && !generationTheme.trim()) {
      setStatusIsError(true);
      setStatusMessage("Choose at least one source record or expedition, or enter a topic to search the repository.");
      return;
    }
    setGenerating(true);
    setStatusIsError(false);
    setStatusMessage(null);
    try {
      const drafts = await api.generateContent({
        asset_ids: selectedAssetIds.length > 0 ? selectedAssetIds : undefined,
        expedition_id: selectedExpeditionId || undefined,
        theme: generationTheme.trim() || undefined,
        formats: selectedFormats,
        tone: selectedTone,
      });
      if (!drafts.length) throw new Error("The service returned no drafts. Check that the chosen records contain indexed source text.");
      setGeneratedDrafts(drafts as GeneratedDraft[]);
      setActiveDraftIdx(0);
      setStatusMessage(`Created ${drafts.length} source-grounded draft${drafts.length === 1 ? "" : "s"}. Review citations before submitting.`);
    } catch (err: unknown) {
      console.error("Generation failed", err);
      setStatusIsError(true);
      setStatusMessage(err instanceof Error ? err.message : "Generation failed. Please try again.");
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
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-50/80 border border-sky-200 text-[#12679a] text-xs font-mono">
          <Sparkles className="w-3.5 h-3.5" />
          TRACK D: GROUNDED GENERATION STUDIO
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#143b5e] tracking-tight">
          AI Dissemination Studio
        </h1>
        <p className="text-xs sm:text-sm text-slate-500">
          Strict citation discipline: Chunks C1..Cn are retrieved from selected assets, claims are verbatim-verified, and ungrounded statements are rejected.
        </p>
      </div>

      {statusMessage && (
        <div role={statusIsError ? "alert" : "status"} className={`flex items-center gap-2 rounded-xl border p-4 text-sm ${statusIsError ? "border-rose-200 bg-rose-50 text-rose-800" : "border-emerald-200 bg-emerald-50 text-emerald-800"}`}>
          {statusIsError ? <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" /> : <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />}
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Two Column Workbench */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Configuration & Source Assets */}
        <div className="lg:col-span-5 space-y-6">
          <div className="polar-card rounded-2xl p-6 space-y-5">
            <h2 className="text-sm font-bold text-[#143b5e] uppercase tracking-wider font-mono flex items-center gap-2">
              <Sliders className="w-4 h-4 text-[#12679a]" />
              1. Generation Parameters
            </h2>

            {/* Target Formats */}
            <div className="space-y-2">
              <label className="text-xs font-mono text-slate-600 block">Output Formats:</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: "article", label: "Outreach Article", icon: FileText },
                  { id: "twitter", label: "Twitter Thread", icon: TwitterIcon },
                  { id: "instagram", label: "Instagram Post", icon: InstagramIcon },
                  { id: "facebook", label: "Facebook Update", icon: FacebookIcon },
                  { id: "carousel", label: "Image Carousel", icon: Layers },
                  { id: "story", label: "Science Story", icon: BookOpen },
                  { id: "reel", label: "Reel Script", icon: Clapperboard },
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
                          ? "bg-sky-50 text-[#12679a] border-sky-200 font-semibold"
                          : "bg-slate-50 text-slate-500 border-slate-200"
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5 text-[#12679a]" />
                      <span>{fmt.label}</span>
                      {active && <Check className="w-3 h-3 ml-auto text-[#12679a]" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Tone Selector */}
            <div className="space-y-2">
              <label className="text-xs font-mono text-slate-600 block">Dissemination Tone:</label>
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
                        ? "bg-teal-50 text-teal-800 border-teal-200 font-semibold"
                        : "bg-slate-50 text-slate-500 border-slate-200"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Expedition Filter (optional) */}
            <div className="space-y-2">
              <label className="text-xs font-mono text-slate-600 block">
                Target Expedition (Optional):
              </label>
              <select
                value={selectedExpeditionId}
                onChange={(e) => setSelectedExpeditionId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 focus:outline-none focus:border-sky-400"
              >
                <option value="">Any / Selected Assets Only</option>
                {expeditions.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label htmlFor="generation-topic" className="block text-xs font-semibold text-slate-700">Topic or source search</label>
              <input id="generation-topic" value={generationTheme} onChange={(event) => setGenerationTheme(event.target.value)} placeholder="e.g. Antarctic sea ice observations" className="min-h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-sky-600 focus:outline-none focus:ring-2 focus:ring-sky-100" />
              <p className="text-xs leading-5 text-slate-500">Used when no asset or expedition is selected. Only matching indexed sources are used.</p>
            </div>
          </div>

          {/* Source Asset Selector */}
          <div className="polar-card rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-[#143b5e] uppercase tracking-wider font-mono flex items-center gap-2">
                <Layers className="w-4 h-4 text-teal-700" />
                2. Select Grounding Assets ({selectedAssetIds.length})
              </h2>
              {selectedAssetIds.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedAssetIds([])}
                  className="text-xs text-[#12679a] hover:underline"
                >
                  Clear
                </button>
              )}
            </div>

            <p className="text-[11px] text-slate-500 leading-relaxed">
              Only paragraphs grounded in chunks from these assets will be generated:
            </p>

            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {assetLoadError && <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">{assetLoadError}<button type="button" onClick={() => window.location.reload()} className="ml-2 font-semibold underline">Retry</button></div>}
              {!assets.length && !assetLoadError && <p className="rounded-lg bg-slate-50 p-4 text-xs text-slate-500">No indexed repository records are available yet. Ingest a source document first, or search using a topic above.</p>}
              {assets.map((a) => {
                const checked = selectedAssetIds.includes(String(a.id));
                return (
                  <label
                    key={a.id}
                    className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 text-xs transition-all ${
                      checked
                        ? "bg-sky-50/60 border-sky-200 text-[#143b5e]"
                        : "bg-slate-50 border-slate-200 text-slate-500 hover:border-slate-700"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleAsset(String(a.id))}
                      className="mt-0.5 rounded border-slate-700 text-sky-600 focus:ring-0"
                    />
                    <div className="space-y-0.5 flex-1">
                      <div className="flex items-center justify-between text-[10px] font-mono text-slate-500">
                        <span className="uppercase text-[#12679a]">{a.type}</span>
                        <span>{a.region} • {a.year}</span>
                      </div>
                      <p className="font-semibold line-clamp-1">{a.title}</p>
                    </div>
                  </label>
                );
              })}
            </div>

            <button
              onClick={handleGenerate}
              type="button"
              disabled={generating || Boolean(assetLoadError)}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#12679a] py-3.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-[#0d527d] disabled:cursor-not-allowed disabled:opacity-50"
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
              <div className="flex items-center justify-between pb-4 border-b border-slate-200">
                <div className="flex items-center gap-2 overflow-x-auto">
                  {generatedDrafts.map((d, idx) => (
                    <button
                      key={d.id}
                      onClick={() => setActiveDraftIdx(idx)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-mono uppercase tracking-wider transition-colors ${
                        activeDraftIdx === idx
                          ? "bg-sky-600 text-white font-bold"
                          : "bg-slate-50 text-slate-500 hover:text-[#143b5e]"
                      }`}
                    >
                      {d.kind}
                    </button>
                  ))}
                </div>

                {activeDraft.kind === "reel" ? (
                  <Link href="/admin/reels" className="px-3.5 py-1.5 rounded-lg bg-[#12679a] hover:bg-[#0d527d] text-white text-xs font-medium flex items-center gap-1.5 shadow-sm">
                    <Clapperboard className="w-3.5 h-3.5" />Attach video & manage reel
                  </Link>
                ) : (
                  <button
                    onClick={() => sendToEditorial(String(activeDraft.id))}
                    className="px-3.5 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-medium flex items-center gap-1.5 shadow-sm"
                  >
                    <Send className="w-3.5 h-3.5" />
                    Submit to Review Desk
                  </button>
                )}
              </div>

              {/* Active Draft Details */}
              <div className="space-y-4">
                <div className="flex items-center justify-between text-xs font-mono text-slate-500">
                  <span className="text-emerald-700 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Verified Citations: {activeDraft.citations?.length || 0}
                  </span>
                  <span>Tone: {activeDraft.tone}</span>
                </div>

                <h3 className="text-xl font-bold text-[#143b5e] tracking-tight">
                  {activeDraft.title}
                </h3>

                {/* Body with citation markers */}
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-slate-700 text-xs sm:text-sm leading-relaxed whitespace-pre-line space-y-3 font-sans">
                  {activeDraft.body_md}
                </div>

                {/* Grounded Citation Highlights */}
                {activeDraft.citations && activeDraft.citations.length > 0 && (
                  <div className="space-y-3 pt-3">
                    <h4 className="text-xs font-mono uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                      Span Verification Proofs (C1..Cn):
                    </h4>

                    <div className="space-y-2">
                      {activeDraft.citations.map((c, idx) => (
                        <div
                          key={idx}
                          className="p-3 rounded-lg bg-slate-100 border border-emerald-200/40 text-xs space-y-1 font-mono"
                        >
                          <div className="flex items-center justify-between text-emerald-700">
                            <span>Claim [{c.chunk_id}]: {c.claim_text}</span>
                            <span className="text-[10px] bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                              Supported: 100%
                            </span>
                          </div>
                          <p className="text-slate-500 text-[11px]">
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
              <div className="w-12 h-12 rounded-2xl bg-sky-50 border border-sky-200 flex items-center justify-center mx-auto text-[#12679a]">
                <Sparkles className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-[#143b5e]">Grounded Generation Canvas Ready</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
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
    <Suspense fallback={<div className="p-8 text-center text-slate-500">Loading Studio...</div>}>
      <GenerateStudioContent />
    </Suspense>
  );
}
