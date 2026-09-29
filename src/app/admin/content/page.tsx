"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  UploadCloud,
  FileText,
  Database,
  Image as ImageIcon,
  Video,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Plus,
  Clock,
  Layers,
  Edit3,
  X,
  ShieldCheck,
} from "lucide-react";
import { api } from "@/lib/api";

export default function AdminContentPage() {
  const [assets, setAssets] = useState<any[]>([]);
  const [expeditions, setExpeditions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Upload modal state
  const [uploadModalOpen, setMobileUploadModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadDescription, setUploadDescription] = useState("");
  const [uploadExpeditionId, setUploadExpeditionId] = useState("");
  const [uploadRegion, setUploadRegion] = useState("Antarctic");
  const [uploadYear, setUploadYear] = useState(2024);
  const [uploadType, setUploadType] = useState("report");
  const [uploading, setUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const [assetsRes, expRes] = await Promise.all([
        api.getAssets(),
        api.getExpeditions(),
      ]);
      setAssets(assetsRes || []);
      setExpeditions(expRes || []);
    } catch (err) {
      console.error("Failed to load content data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const f = e.target.files[0];
      setSelectedFile(f);
      if (!uploadTitle) {
        setUploadTitle(f.name.replace(/\.[^/.]+$/, "").replace(/_/g, " ").toUpperCase());
      }
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      alert("Please select a file to ingest");
      return;
    }

    setUploading(true);
    setUploadMessage(null);
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      if (uploadTitle) formData.append("title", uploadTitle);
      if (uploadDescription) formData.append("description", uploadDescription);
      if (uploadExpeditionId) formData.append("expedition_id", uploadExpeditionId);
      if (uploadRegion) formData.append("region", uploadRegion);
      if (uploadYear) formData.append("year", uploadYear.toString());
      if (uploadType) formData.append("asset_type", uploadType);

      const res = await fetch("/api/ingest/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || "Upload failed");
      }

      const data = await res.json();
      setUploadMessage(`Success! Ingested ${data.asset?.title} with ${data.chunks_generated} chunks generated.`);
      setSelectedFile(null);
      setUploadTitle("");
      setUploadDescription("");
      setMobileUploadModalOpen(false);
      await loadData();
    } catch (err: any) {
      setUploadMessage(`Error: ${err.message || "Failed to process file"}`);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-0.5 rounded-full bg-sky-950/80 border border-sky-800 text-sky-300 text-xs font-mono">
            <UploadCloud className="w-3.5 h-3.5" />
            TRACK A & B: INGESTION PIPELINE & REPOSITORY CMS
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Scientific Content Management
          </h1>
          <p className="text-xs text-slate-400">
            MIME sniffing, automated chunk extraction (~500 tokens), 384d embedding, and version snapshots.
          </p>
        </div>

        <button
          onClick={() => setMobileUploadModalOpen(true)}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-sky-600 to-teal-600 hover:from-sky-500 hover:to-teal-500 text-white font-medium text-xs flex items-center gap-2 shadow-lg shadow-sky-950/50"
        >
          <Plus className="w-4 h-4" />
          Ingest New Scientific Asset
        </button>
      </div>

      {uploadMessage && (
        <div className="p-4 rounded-xl bg-emerald-950/50 border border-emerald-800 text-emerald-300 text-xs font-mono">
          {uploadMessage}
        </div>
      )}

      {/* Asset Repository Table */}
      <div className="polar-card rounded-2xl overflow-hidden border border-[#18293d]">
        <div className="p-5 border-b border-[#18293d] flex items-center justify-between">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
            <Layers className="w-4 h-4 text-sky-400" />
            Indexed Knowledge Repository Records ({assets.length})
          </h2>
          <span className="text-xs font-mono text-slate-400">All Versions Preserved</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#08121f] text-slate-400 uppercase font-mono text-[10px] border-b border-[#18293d]">
              <tr>
                <th className="px-5 py-3.5">Asset Title & ID</th>
                <th className="px-5 py-3.5">Type</th>
                <th className="px-5 py-3.5">Region & Year</th>
                <th className="px-5 py-3.5">Version</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#142334] text-slate-300">
              {assets.map((a) => (
                <tr key={a.id} className="hover:bg-[#0c1828] transition-colors">
                  <td className="px-5 py-3.5 space-y-0.5">
                    <Link
                      href={`/assets/${a.id}`}
                      className="font-bold text-white hover:text-sky-300 transition-colors line-clamp-1"
                    >
                      {a.title}
                    </Link>
                    <span className="font-mono text-[10px] text-slate-300 block">{a.id}</span>
                  </td>
                  <td className="px-5 py-3.5 font-mono uppercase text-sky-400">
                    {a.type}
                  </td>
                  <td className="px-5 py-3.5 font-mono text-teal-300">
                    {a.region} ({a.year})
                  </td>
                  <td className="px-5 py-3.5 font-mono">
                    <span className="px-2 py-0.5 rounded bg-[#08121f] border border-[#142334] text-slate-300">
                      v{a.version}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 font-mono">
                    <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 text-[10px] uppercase">
                      {a.status}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-right space-x-2 font-mono">
                    <Link
                      href={`/assets/${a.id}`}
                      className="text-sky-400 hover:underline"
                    >
                      Inspect
                    </Link>
                    <span>•</span>
                    <Link
                      href={`/admin/generate?asset_id=${a.id}`}
                      className="text-teal-400 hover:underline"
                    >
                      Synthesize
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Upload Ingestion Modal */}
      {uploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-[#08121f] border border-[#1b3149] rounded-2xl p-6 sm:p-8 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#18293d]">
              <span className="font-bold text-white text-base flex items-center gap-2">
                <UploadCloud className="w-5 h-5 text-sky-400" />
                Ingest Scientific Document / Dataset
              </span>
              <button
                onClick={() => setMobileUploadModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} className="space-y-4 text-xs font-sans">
              {/* File input */}
              <div className="space-y-1.5">
                <label className="font-mono text-slate-300 block">Select File (PDF, CSV, NC, JPG, MP4):</label>
                <input
                  type="file"
                  onChange={handleFileChange}
                  accept=".pdf,.docx,.csv,.nc,.jpg,.jpeg,.png,.mp4,.txt"
                  required
                  className="w-full text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-sky-600 file:text-white hover:file:bg-sky-500 cursor-pointer bg-[#050c16] p-2 rounded-xl border border-[#18293d]"
                />
              </div>

              {/* Title */}
              <div className="space-y-1.5">
                <label className="font-mono text-slate-300 block">Document Title:</label>
                <input
                  type="text"
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  placeholder="e.g. 43rd IAE Winterover Scientific Report"
                  required
                  className="w-full bg-[#050c16] border border-[#18293d] rounded-xl px-3.5 py-2 text-white placeholder-slate-300 focus:outline-none focus:border-sky-400"
                />
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="font-mono text-slate-300 block">Abstract / Description:</label>
                <textarea
                  value={uploadDescription}
                  onChange={(e) => setUploadDescription(e.target.value)}
                  placeholder="Provide technical scientific summary..."
                  rows={3}
                  className="w-full bg-[#050c16] border border-[#18293d] rounded-xl px-3.5 py-2 text-white placeholder-slate-300 focus:outline-none focus:border-sky-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Region */}
                <div className="space-y-1.5">
                  <label className="font-mono text-slate-300 block">Region:</label>
                  <select
                    value={uploadRegion}
                    onChange={(e) => setUploadRegion(e.target.value)}
                    className="w-full bg-[#050c16] border border-[#18293d] rounded-xl px-3 py-2 text-white"
                  >
                    <option value="Antarctic">Antarctica</option>
                    <option value="Arctic">Arctic Svalbard</option>
                    <option value="Southern Ocean">Southern Ocean</option>
                    <option value="Himalayas">Himalayas (Spiti)</option>
                  </select>
                </div>

                {/* Year */}
                <div className="space-y-1.5">
                  <label className="font-mono text-slate-300 block">Observation Year:</label>
                  <input
                    type="number"
                    value={uploadYear}
                    onChange={(e) => setUploadYear(parseInt(e.target.value))}
                    min={1980}
                    max={2030}
                    className="w-full bg-[#050c16] border border-[#18293d] rounded-xl px-3 py-2 text-white"
                  />
                </div>
              </div>

              {/* Expedition */}
              <div className="space-y-1.5">
                <label className="font-mono text-slate-300 block">Associated Expedition:</label>
                <select
                  value={uploadExpeditionId}
                  onChange={(e) => setUploadExpeditionId(e.target.value)}
                  className="w-full bg-[#050c16] border border-[#18293d] rounded-xl px-3 py-2 text-white"
                >
                  <option value="">General Polar Archive</option>
                  {expeditions.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-3 pt-3">
                <button
                  type="submit"
                  disabled={uploading}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-sky-600 to-teal-600 hover:from-sky-500 hover:to-teal-500 text-white font-bold text-xs shadow-lg shadow-sky-950/50 disabled:opacity-50"
                >
                  {uploading ? "Extracting & Embedding..." : "Ingest & Index Asset"}
                </button>
                <button
                  type="button"
                  onClick={() => setMobileUploadModalOpen(false)}
                  className="px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
