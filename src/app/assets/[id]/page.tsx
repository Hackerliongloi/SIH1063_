"use client";
/* eslint-disable @next/next/no-img-element -- repository thumbnails can use local S3 URLs */

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  FileText,
  Database,
  Image as ImageIcon,
  Download,
  ExternalLink,
  Clock,
  Layers,
  Sparkles,
  CheckCircle2,
} from "lucide-react";
import { api } from "@/lib/api";
import { getMediaUrl } from "@/lib/media";

type AssetRecord = { id: string | number; title: string; type: string; region?: string; year?: number | string; version?: number | string; status?: string; description?: string; file_key?: string | null; thumb_key?: string | null; external_url?: string | null };
type AssetChunk = { id: string | number; page?: number | string | null; text: string };
type AssetVersion = { version: number | string; timestamp?: string; title?: string };
type AssetDetail = { asset: AssetRecord; chunks?: AssetChunk[]; versions?: AssetVersion[]; expedition?: { name?: string; stations?: string[] } | null };

export default function AssetDetailPage() {
  const params = useParams();
  const router = useRouter();
  const assetId = params?.id as string;

  const [assetData, setAssetData] = useState<AssetDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"text" | "metadata" | "versions">("text");

  useEffect(() => {
    async function loadAsset() {
      try {
        const res = await api.getAsset(assetId);
        setAssetData(res as AssetDetail);
      } catch (err) {
        console.error("Failed to load asset", err);
        setLoadError(err instanceof Error ? err.message : "This record could not be loaded.");
      } finally {
        setLoading(false);
      }
    }
    if (assetId) loadAsset();
  }, [assetId]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center space-y-3">
        <div className="w-8 h-8 border-2 border-sky-400 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs font-mono text-slate-500">Loading scientific record & chunk index...</p>
      </div>
    );
  }

  if (!assetData || !assetData.asset) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center space-y-4">
        <div className="mx-auto max-w-lg rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <h2 className="text-xl font-bold text-[#143b5e]">{loadError ? "Record unavailable" : "Scientific record not found"}</h2>
          <p role={loadError ? "alert" : undefined} className="mt-2 text-sm leading-6 text-slate-600">{loadError || "The requested record does not exist in the repository."}</p>
          <div className="mt-5 flex justify-center gap-3">{loadError && <button type="button" onClick={() => router.refresh()} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Try again</button>}<Link href="/explore" className="inline-block rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700">Return to search</Link></div>
        </div>
      </div>
    );
  }

  const { asset, chunks, versions, expedition } = assetData;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Back button & Breadcrumb */}
      <div className="flex items-center gap-3 text-xs font-mono text-slate-500">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-[#12679a] hover:text-[#12679a]"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>
        <span>/</span>
        <Link href="/explore" className="hover:text-slate-700">
          Repository
        </Link>
        <span>/</span>
        <span className="text-slate-600 uppercase">{asset.type}</span>
      </div>

      {/* Main Asset Header */}
      <div className="polar-card rounded-2xl p-6 sm:p-8 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded bg-sky-50 text-[#12679a] border border-sky-200 uppercase font-bold flex items-center gap-1.5">
              {asset.type === "report" && <FileText className="w-3.5 h-3.5" />}
              {asset.type === "dataset" && <Database className="w-3.5 h-3.5" />}
              {asset.type === "photo" && <ImageIcon className="w-3.5 h-3.5" />}
              {asset.type}
            </span>
            <span className="px-2.5 py-1 rounded bg-slate-50 text-teal-800 border border-slate-200">
              {asset.region}
            </span>
            <span className="px-2.5 py-1 rounded bg-slate-50 text-slate-600 border border-slate-200">
              Year: {asset.year}
            </span>
          </div>

          <span className="text-emerald-700 flex items-center gap-1 text-[11px]">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Verified NCPOR Archive (v{asset.version})
          </span>
        </div>

        <div className="space-y-3">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#143b5e] tracking-tight leading-snug">
            {asset.title}
          </h1>

          {expedition && (
            <div className="flex items-center gap-2 text-xs font-mono text-[#12679a]">
              <span className="text-slate-500">Expedition:</span>
              <span className="font-semibold">{expedition.name}</span>
              {Array.isArray(expedition.stations) && expedition.stations.length > 0 && <span className="text-slate-500">({expedition.stations.join(", ")})</span>}
            </div>
          )}

          <p className="text-slate-600 text-sm leading-relaxed">
            {asset.description}
          </p>
        </div>

        {/* Action Bar */}
        <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-slate-200">
          <Link
            href={`/admin/generate?asset_id=${asset.id}`}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-sky-600 to-teal-600 hover:from-sky-500 hover:to-teal-500 text-white text-xs font-medium flex items-center gap-2 shadow-md shadow-sky-950/50"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Synthesize Grounded Story in Studio
          </Link>

          {asset.file_key ? <a
            href={getMediaUrl(asset.file_key) || undefined}
            target="_blank"
            rel="noreferrer"
            className="px-4 py-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-300 text-slate-700 text-xs font-medium flex items-center gap-2"
          >
            <Download className="w-3.5 h-3.5 text-[#12679a]" />
            Download Source File
          </a> : asset.external_url ? <a href={asset.external_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"><ExternalLink className="h-4 w-4 text-[#12679a]" />Open source resource</a> : <span className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-500"><Download className="h-4 w-4" />Source file unavailable</span>}

          <a href={`/api/assets/${asset.id}/export/pdf`} className="px-4 py-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-300 text-slate-700 text-xs font-medium flex items-center gap-2">
            <FileText className="w-3.5 h-3.5 text-red-600" />
            Export PDF
          </a>
          <a href={`/api/assets/${asset.id}/export/xml`} className="px-4 py-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-300 text-slate-700 text-xs font-medium flex items-center gap-2">
            <FileText className="w-3.5 h-3.5 text-amber-600" />
            Export XML
          </a>
        </div>
      </div>

      {/* Photo View / Media Display if photo */}
      {(asset.type === "photo" || asset.type === "video") && (asset.thumb_key || asset.file_key || asset.external_url) && (
        <div className="polar-card overflow-hidden rounded-2xl bg-white p-3">
          <div className="relative max-h-[600px] w-full rounded-xl overflow-hidden flex items-center justify-center bg-white">
            {asset.type === "video" ? <video src={`/api/assets/${asset.id}/media`} poster={getMediaUrl(asset.thumb_key) || undefined} controls playsInline preload="metadata" className="max-h-[550px] w-full rounded-lg object-contain" /> : <img src={getMediaUrl(asset.thumb_key) || getMediaUrl(asset.file_key) || getMediaUrl(asset.external_url) || ""} alt={asset.title} className="max-h-[550px] w-auto rounded-lg object-contain" />}
          </div>
          <p className="text-xs font-mono text-slate-500 text-center pt-3">
            High-Resolution Polar Field Imagery • 512-dim CLIP Vector Indexed
          </p>
        </div>
      )}

      {/* Tabs: Extracted Chunks & Text, Metadata, Version History */}
      <div className="space-y-4">
        <div className="flex border-b border-slate-200 gap-2">
          <button
            onClick={() => setActiveTab("text")}
            className={`pb-3 px-3 text-xs font-medium transition-colors border-b-2 flex items-center gap-1.5 ${
              activeTab === "text"
                ? "border-sky-400 text-[#12679a] font-semibold"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            Extracted Text Chunks ({chunks?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab("metadata")}
            className={`pb-3 px-3 text-xs font-medium transition-colors border-b-2 flex items-center gap-1.5 ${
              activeTab === "metadata"
                ? "border-sky-400 text-[#12679a] font-semibold"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Scientific Metadata
          </button>
          <button
            onClick={() => setActiveTab("versions")}
            className={`pb-3 px-3 text-xs font-medium transition-colors border-b-2 flex items-center gap-1.5 ${
              activeTab === "versions"
                ? "border-sky-400 text-[#12679a] font-semibold"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            Version History ({versions?.length || 1})
          </button>
        </div>

        {/* Tab 1: Extracted Chunks */}
        {activeTab === "text" && (
          <div className="space-y-4">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs text-slate-600 leading-relaxed">
              <span className="font-mono text-[#12679a] font-semibold block mb-1">
                Citation Chunking Protocol:
              </span>
              This technical document has been parsed into ~500-token chunks with 50-token overlap, indexed into 384-dimensional dense vectors. AI dissemination stories are strictly bound to quote verbatim spans from these chunks.
            </div>

            {chunks && chunks.length > 0 ? (
              <div className="space-y-3">
                {chunks.map((ch) => (
                  <div
                    key={ch.id}
                    className="polar-card rounded-xl p-4 space-y-2 border-l-4 border-l-sky-500"
                  >
                    <div className="flex items-center justify-between text-xs font-mono text-slate-500">
                      <span className="px-2 py-0.5 rounded bg-sky-50 text-[#12679a] border border-sky-200 font-bold">
                        Chunk [{ch.id}]
                      </span>
                      {ch.page && <span>Page: {ch.page}</span>}
                    </div>
                    <p className="text-xs text-slate-700 leading-relaxed font-sans bg-slate-50 p-3 rounded-lg border border-slate-200">
                      &quot;{ch.text}&quot;
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="polar-card rounded-xl p-8 text-center text-xs text-slate-500">
                No indexed chunks for this asset.
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Metadata */}
        {activeTab === "metadata" && (
          <div className="polar-card rounded-xl p-6 space-y-4">
            <h3 className="text-sm font-bold text-[#143b5e] uppercase tracking-wider font-mono">
              Repository Registry Attributes
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-slate-500 block mb-1">Asset ID:</span>
                <span className="text-[#143b5e] font-semibold">{asset.id}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-slate-500 block mb-1">Format Category:</span>
                <span className="text-[#12679a] font-semibold uppercase">{asset.type}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-slate-500 block mb-1">Primary Region:</span>
                <span className="text-teal-800 font-semibold">{asset.region}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-slate-500 block mb-1">Observation Year:</span>
                <span className="text-[#143b5e] font-semibold">{asset.year}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-slate-500 block mb-1">File Storage Key:</span>
                <span className="text-slate-600">{asset.file_key || "Direct Repository Resource"}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-slate-500 block mb-1">Indexing Status:</span>
                <span className="text-emerald-700 font-semibold uppercase">{asset.status}</span>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Version History */}
        {activeTab === "versions" && (
          <div className="polar-card rounded-xl p-6 space-y-4">
            <h3 className="text-sm font-bold text-[#143b5e] uppercase tracking-wider font-mono">
              Audit Log & Version Snapshots
            </h3>
            <div className="space-y-3">
              {versions?.map((v, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs font-mono space-y-1"
                >
                  <div className="flex items-center justify-between text-[#12679a] font-semibold">
                    <span>Snapshot v{v.version}</span>
                    <span className="text-slate-500 text-[11px]">{v.timestamp}</span>
                  </div>
                  <p className="text-slate-700">{v.title}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
