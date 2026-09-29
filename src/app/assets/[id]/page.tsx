"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  FileText,
  Database,
  Image as ImageIcon,
  Video,
  Download,
  ExternalLink,
  Calendar,
  MapPin,
  Clock,
  Layers,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  Share2,
} from "lucide-react";
import { api } from "@/lib/api";

export default function AssetDetailPage() {
  const params = useParams();
  const router = useRouter();
  const assetId = params?.id as string;

  const [assetData, setAssetData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"text" | "metadata" | "versions">("text");

  useEffect(() => {
    async function loadAsset() {
      try {
        const res = await api.getAsset(assetId);
        setAssetData(res);
      } catch (err) {
        console.error("Failed to load asset", err);
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
        <p className="text-xs font-mono text-slate-400">Loading scientific record & chunk index...</p>
      </div>
    );
  }

  if (!assetData || !assetData.asset) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center space-y-4">
        <h2 className="text-xl font-bold text-white">Scientific Record Not Found</h2>
        <p className="text-xs text-slate-400">The requested polar asset ID does not exist in the repository.</p>
        <Link href="/explore" className="px-4 py-2 rounded-lg bg-sky-600 text-white text-xs inline-block">
          Return to Explore
        </Link>
      </div>
    );
  }

  const { asset, chunks, versions, expedition } = assetData;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Back button & Breadcrumb */}
      <div className="flex items-center gap-3 text-xs font-mono text-slate-400">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-sky-400 hover:text-sky-300"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>
        <span>/</span>
        <Link href="/explore" className="hover:text-slate-200">
          Repository
        </Link>
        <span>/</span>
        <span className="text-slate-300 uppercase">{asset.type}</span>
      </div>

      {/* Main Asset Header */}
      <div className="polar-card rounded-2xl p-6 sm:p-8 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded bg-sky-950 text-sky-300 border border-sky-800 uppercase font-bold flex items-center gap-1.5">
              {asset.type === "report" && <FileText className="w-3.5 h-3.5" />}
              {asset.type === "dataset" && <Database className="w-3.5 h-3.5" />}
              {asset.type === "photo" && <ImageIcon className="w-3.5 h-3.5" />}
              {asset.type}
            </span>
            <span className="px-2.5 py-1 rounded bg-[#08121f] text-teal-300 border border-[#142334]">
              {asset.region}
            </span>
            <span className="px-2.5 py-1 rounded bg-[#08121f] text-slate-300 border border-[#142334]">
              Year: {asset.year}
            </span>
          </div>

          <span className="text-emerald-400 flex items-center gap-1 text-[11px]">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Verified NCPOR Archive (v{asset.version})
          </span>
        </div>

        <div className="space-y-3">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-snug">
            {asset.title}
          </h1>

          {expedition && (
            <div className="flex items-center gap-2 text-xs font-mono text-sky-300">
              <span className="text-slate-400">Expedition:</span>
              <span className="font-semibold">{expedition.name}</span>
              <span className="text-slate-300">({expedition.stations.join(", ")})</span>
            </div>
          )}

          <p className="text-slate-300 text-sm leading-relaxed">
            {asset.description}
          </p>
        </div>

        {/* Action Bar */}
        <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-[#18293d]">
          <Link
            href={`/admin/generate?asset_id=${asset.id}`}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-sky-600 to-teal-600 hover:from-sky-500 hover:to-teal-500 text-white text-xs font-medium flex items-center gap-2 shadow-md shadow-sky-950/50"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Synthesize Grounded Story in Studio
          </Link>

          <a
            href={asset.file_key ? `/api/storage/${asset.file_key}` : "#"}
            target="_blank"
            rel="noreferrer"
            className="px-4 py-2.5 rounded-xl bg-[#08121f] hover:bg-[#0e2137] border border-[#1c324a] text-slate-200 text-xs font-medium flex items-center gap-2"
          >
            <Download className="w-3.5 h-3.5 text-sky-400" />
            Download Source File
          </a>
        </div>
      </div>

      {/* Photo View / Media Display if photo */}
      {asset.type === "photo" && asset.thumb_key && (
        <div className="polar-card rounded-2xl overflow-hidden p-3 bg-black/40">
          <div className="relative max-h-[600px] w-full rounded-xl overflow-hidden flex items-center justify-center bg-slate-950">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={asset.thumb_key}
              alt={asset.title}
              className="max-h-[550px] w-auto object-contain rounded-lg"
            />
          </div>
          <p className="text-xs font-mono text-slate-400 text-center pt-3">
            High-Resolution Polar Field Imagery • 512-dim CLIP Vector Indexed
          </p>
        </div>
      )}

      {/* Tabs: Extracted Chunks & Text, Metadata, Version History */}
      <div className="space-y-4">
        <div className="flex border-b border-[#18293d] gap-2">
          <button
            onClick={() => setActiveTab("text")}
            className={`pb-3 px-3 text-xs font-medium transition-colors border-b-2 flex items-center gap-1.5 ${
              activeTab === "text"
                ? "border-sky-400 text-sky-300 font-semibold"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            Extracted Text Chunks ({chunks?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab("metadata")}
            className={`pb-3 px-3 text-xs font-medium transition-colors border-b-2 flex items-center gap-1.5 ${
              activeTab === "metadata"
                ? "border-sky-400 text-sky-300 font-semibold"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Scientific Metadata
          </button>
          <button
            onClick={() => setActiveTab("versions")}
            className={`pb-3 px-3 text-xs font-medium transition-colors border-b-2 flex items-center gap-1.5 ${
              activeTab === "versions"
                ? "border-sky-400 text-sky-300 font-semibold"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            Version History ({versions?.length || 1})
          </button>
        </div>

        {/* Tab 1: Extracted Chunks */}
        {activeTab === "text" && (
          <div className="space-y-4">
            <div className="bg-[#08121f] border border-[#142334] rounded-xl p-4 text-xs text-slate-300 leading-relaxed">
              <span className="font-mono text-sky-400 font-semibold block mb-1">
                Citation Chunking Protocol:
              </span>
              This technical document has been parsed into ~500-token chunks with 50-token overlap, indexed into 384-dimensional dense vectors. AI dissemination stories are strictly bound to quote verbatim spans from these chunks.
            </div>

            {chunks && chunks.length > 0 ? (
              <div className="space-y-3">
                {chunks.map((ch: any) => (
                  <div
                    key={ch.id}
                    className="polar-card rounded-xl p-4 space-y-2 border-l-4 border-l-sky-500"
                  >
                    <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                      <span className="px-2 py-0.5 rounded bg-sky-950 text-sky-300 border border-sky-800 font-bold">
                        Chunk [{ch.id}]
                      </span>
                      {ch.page && <span>Page: {ch.page}</span>}
                    </div>
                    <p className="text-xs text-slate-200 leading-relaxed font-sans bg-[#060e19] p-3 rounded-lg border border-[#112033]">
                      &quot;{ch.text}&quot;
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="polar-card rounded-xl p-8 text-center text-xs text-slate-400">
                No indexed chunks for this asset.
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Metadata */}
        {activeTab === "metadata" && (
          <div className="polar-card rounded-xl p-6 space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
              Repository Registry Attributes
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
              <div className="p-3 bg-[#08121f] rounded-lg border border-[#142334]">
                <span className="text-slate-400 block mb-1">Asset ID:</span>
                <span className="text-white font-semibold">{asset.id}</span>
              </div>
              <div className="p-3 bg-[#08121f] rounded-lg border border-[#142334]">
                <span className="text-slate-400 block mb-1">Format Category:</span>
                <span className="text-sky-300 font-semibold uppercase">{asset.type}</span>
              </div>
              <div className="p-3 bg-[#08121f] rounded-lg border border-[#142334]">
                <span className="text-slate-400 block mb-1">Primary Region:</span>
                <span className="text-teal-300 font-semibold">{asset.region}</span>
              </div>
              <div className="p-3 bg-[#08121f] rounded-lg border border-[#142334]">
                <span className="text-slate-400 block mb-1">Observation Year:</span>
                <span className="text-white font-semibold">{asset.year}</span>
              </div>
              <div className="p-3 bg-[#08121f] rounded-lg border border-[#142334]">
                <span className="text-slate-400 block mb-1">File Storage Key:</span>
                <span className="text-slate-300">{asset.file_key || "Direct Repository Resource"}</span>
              </div>
              <div className="p-3 bg-[#08121f] rounded-lg border border-[#142334]">
                <span className="text-slate-400 block mb-1">Indexing Status:</span>
                <span className="text-emerald-400 font-semibold uppercase">{asset.status}</span>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Version History */}
        {activeTab === "versions" && (
          <div className="polar-card rounded-xl p-6 space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
              Audit Log & Version Snapshots
            </h3>
            <div className="space-y-3">
              {versions?.map((v: any, idx: number) => (
                <div
                  key={idx}
                  className="p-3 bg-[#08121f] rounded-lg border border-[#142334] text-xs font-mono space-y-1"
                >
                  <div className="flex items-center justify-between text-sky-400 font-semibold">
                    <span>Snapshot v{v.version}</span>
                    <span className="text-slate-400 text-[11px]">{v.timestamp}</span>
                  </div>
                  <p className="text-slate-200">{v.title}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
