"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  UploadCloud,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Plus,
  Layers,
  X,
  Search,
  FilePlus2,
} from "lucide-react";
import { api } from "@/lib/api";

type AssetRecord = { id: string | number; title: string; type?: string; region?: string; year?: number | string; version?: number | string; status?: string };
type ExpeditionRecord = { id: string | number; name: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object");
}

function responseList<T>(value: unknown, guard: (item: unknown) => item is T): T[] {
  if (Array.isArray(value)) return value.filter(guard);
  if (value && typeof value === "object") {
    const data = value as { items?: unknown; results?: unknown };
    if (Array.isArray(data.items)) return data.items.filter(guard);
    if (Array.isArray(data.results)) return data.results.filter(guard);
  }
  return [];
}

export default function AdminContentPage() {
  const [assets, setAssets] = useState<AssetRecord[]>([]);
  const [expeditions, setExpeditions] = useState<ExpeditionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

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
    setLoadError(null);
    try {
      const [assetsRes, expRes] = await Promise.all([
        Promise.all([api.getLiveAssets("ready"), api.getLiveAssets("processing"), api.getLiveAssets("failed"), api.getLiveAssets("in_review")]),
        api.getLiveExpeditions(),
      ]);
      setAssets(assetsRes.flatMap((items) => responseList(items, (item): item is AssetRecord => isRecord(item) && (typeof item.id === "string" || typeof item.id === "number") && typeof item.title === "string")));
      setExpeditions(responseList(expRes, (item): item is ExpeditionRecord => isRecord(item) && (typeof item.id === "string" || typeof item.id === "number") && typeof item.name === "string"));
    } catch (err) {
      console.error("Failed to load content data", err);
      setLoadError("We couldn't load the repository records. Check the connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  const visibleAssets = assets.filter((asset) =>
    `${asset.title || ""} ${asset.type || ""} ${asset.region || ""} ${asset.year || ""}`
      .toLowerCase().includes(query.trim().toLowerCase())
  );
  const statusBadge = (status?: string) => status === "ready"
    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
    : status === "processing"
      ? "border-amber-200 bg-amber-50 text-amber-800"
      : status === "in_review"
        ? "border-purple-200 bg-purple-50 text-purple-800"
        : "border-rose-200 bg-rose-50 text-rose-800";

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadData(); }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const handleTransition = async (id: string | number, action: string) => {
    setLoading(true);
    try {
      await api.transitionDataset(id.toString(), action);
      await loadData();
    } catch (err: any) {
      setLoadError(err.message || "Failed to transition dataset");
      setLoading(false);
    }
  };

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
      setUploadMessage("Error: Please select a file to add to the repository.");
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
      if (uploadType) formData.append("type", uploadType);

      const res = await fetch("/api/ingest/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || "Upload failed");
      }

      const data = await res.json();
      setUploadMessage(data.job_queued ? `${data.asset?.title || "The file"} was accepted and queued for indexing. It will be available after processing completes.` : `${data.asset?.title || "The file"} was added to the repository.`);
      setSelectedFile(null);
      setUploadTitle("");
      setUploadDescription("");
      setMobileUploadModalOpen(false);
      await loadData();
    } catch (err: unknown) {
      setUploadMessage(`Error: ${err instanceof Error ? err.message : "Failed to process file"}`);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-[65vh] bg-[#f5f8fb] px-4 py-8 text-slate-700 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-7">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50/80 px-3 py-1 text-xs font-mono text-[#12679a]">
            <UploadCloud className="w-3.5 h-3.5" />
            TRACK A & B: INGESTION PIPELINE & REPOSITORY CMS
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-[#143b5e] sm:text-3xl">
            Content repository
          </h1>
          <p className="max-w-2xl text-sm leading-6 text-slate-500">
            Manage scientific records and add documents, datasets, photographs and video to the searchable repository.
          </p>
        </div>

        <button
          onClick={() => setMobileUploadModalOpen(true)}
          className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-300 focus:ring-offset-2 focus:ring-offset-[#07111d]"
        >
          <Plus className="w-4 h-4" />
          Add repository item
        </button>
      </div>

      {uploadMessage && (
        <div role="status" className={`rounded-xl border p-4 text-sm ${uploadMessage.startsWith("Error:") ? "border-rose-200 bg-rose-50 text-rose-800" : "border-emerald-200 bg-emerald-50 text-emerald-800"}`}>
          <div className="flex items-start gap-2">{uploadMessage.startsWith("Error:") ? <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> : <CheckCircle className="mt-0.5 h-4 w-4 shrink-0" />}<span>{uploadMessage}</span></div>
        </div>
      )}

      {/* Asset Repository Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg shadow-black/10">
        <div className="flex flex-col gap-4 border-b border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div>
            <h2 className="flex items-center gap-2 text-base font-bold text-[#143b5e]"><Layers className="h-4 w-4 text-[#12679a]" />Repository records</h2>
            <p className="mt-1 text-xs text-slate-500">{loading ? "Loading repository..." : `${visibleAssets.length} of ${assets.length} records`}</p>
          </div>
          <div className="flex gap-2">
            <label className="relative min-w-0 flex-1 sm:w-64 sm:flex-none"><span className="sr-only">Filter repository records</span><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Filter records" className="min-h-10 w-full rounded-lg border border-slate-300 bg-[#f5f8fb] pl-9 pr-3 text-sm text-slate-800 placeholder:text-slate-500 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-900" /></label>
            <button type="button" onClick={() => { setLoading(true); void loadData(); }} aria-label="Refresh repository" className="grid min-h-10 min-w-10 place-items-center rounded-lg border border-slate-300 bg-slate-50 text-slate-600 transition-colors hover:bg-slate-100" title="Refresh"><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /></button>
          </div>
        </div>

        {loadError && <div role="alert" className="m-4 flex items-center justify-between gap-3 rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800"><span>{loadError}</span><button type="button" onClick={() => { setLoading(true); void loadData(); }} className="shrink-0 font-semibold underline underline-offset-2">Retry</button></div>}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-5 py-3.5">Asset Title & ID</th>
                <th className="px-5 py-3.5">Type</th>
                <th className="px-5 py-3.5">Region & Year</th>
                <th className="px-5 py-3.5">Version</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#142334] text-slate-600">
              {visibleAssets.map((a) => (
                <tr key={a.id} className="transition-colors hover:bg-slate-50">
                  <td className="space-y-1 px-5 py-4">
                    <Link
                      href={`/assets/${a.id}`}
                      className="line-clamp-1 font-semibold text-slate-800 transition-colors hover:text-[#12679a]"
                    >
                      {a.title}
                    </Link>
                    <span className="block text-xs text-slate-500">Record ID {a.id}</span>
                  </td>
                  <td className="px-5 py-4">
                    <span className="rounded-full border border-sky-900 bg-sky-50/50 px-2.5 py-1 text-xs font-medium capitalize text-sky-800">{a.type || "Resource"}</span>
                  </td>
                  <td className="px-5 py-4 text-slate-600">
                    {a.region} ({a.year})
                  </td>
                  <td className="px-5 py-4">
                    <span className="rounded-md border border-slate-300 bg-[#f5f8fb] px-2 py-1 text-xs text-slate-600">
                      v{a.version}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <span className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${statusBadge(a.status)}`}>
                      {a.status}
                    </span>
                  </td>
                  <td className="space-x-2 px-5 py-4 text-right text-xs font-semibold">
                    {a.status === "in_review" && (
                      <>
                        <button onClick={() => handleTransition(a.id, 'approve')} className="text-emerald-700 hover:underline">Approve</button>
                        <span>•</span>
                        <button onClick={() => handleTransition(a.id, 'request_changes')} className="text-rose-700 hover:underline">Reject</button>
                        <span>•</span>
                      </>
                    )}
                    <Link
                      href={`/assets/${a.id}`}
                      className="text-[#12679a] hover:underline"
                    >
                      Inspect
                    </Link>
                    <span>•</span>
                    <Link
                      href={`/admin/generate?asset_id=${a.id}`}
                      className="text-teal-700 hover:underline"
                    >
                      Synthesize
                    </Link>
                  </td>
                </tr>
              ))}
              {!loading && !loadError && visibleAssets.length === 0 && <tr><td colSpan={6} className="px-6 py-16 text-center"><div className="mx-auto grid h-11 w-11 place-items-center rounded-xl bg-sky-50 text-[#12679a]"><FilePlus2 className="h-5 w-5" /></div><h3 className="mt-3 font-semibold text-[#143b5e]">{assets.length ? "No records match your filter" : "No repository records yet"}</h3><p className="mt-1 text-sm text-slate-500">{assets.length ? "Try another title, type, region or year." : "Add a scientific record to start building the repository."}</p>{assets.length === 0 && <button type="button" onClick={() => setMobileUploadModalOpen(true)} className="mt-4 rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-500">Add repository item</button>}</td></tr>}
              {loading && assets.length === 0 && <tr><td colSpan={6} className="px-6 py-16 text-center text-sm text-slate-500"><RefreshCw className="mr-2 inline h-4 w-4 animate-spin" />Loading repository records</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {/* Upload Ingestion Modal */}
      {uploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="w-full max-w-lg space-y-5 rounded-2xl border border-slate-300 bg-white p-5 shadow-2xl sm:p-7">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <span className="flex items-center gap-2 text-base font-bold text-[#143b5e]">
                <UploadCloud className="w-5 h-5 text-[#12679a]" />
                Ingest Scientific Document / Dataset
              </span>
              <button
                onClick={() => setMobileUploadModalOpen(false)}
                aria-label="Close upload dialog"
                className="grid h-9 w-9 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-[#143b5e]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} className="space-y-4 text-sm">
              {uploadMessage?.startsWith("Error:") && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{uploadMessage}</p>}
              {/* File input */}
              <div className="space-y-1.5">
                  <label className="mb-1.5 block text-xs font-semibold text-slate-600">Select a file <span className="font-normal text-slate-500">(PDF, CSV, NC, image, video)</span></label>
                <input
                  type="file"
                  onChange={handleFileChange}
                  accept=".pdf,.docx,.csv,.nc,.jpg,.jpeg,.png,.mp4,.txt"
                  required
                  className="w-full cursor-pointer rounded-lg border border-slate-300 bg-[#f5f8fb] p-2 text-sm text-slate-600 file:mr-3 file:cursor-pointer file:rounded-md file:border-0 file:bg-sky-700 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-white hover:file:bg-sky-600"
                />
              </div>

              {/* Title */}
              <div className="space-y-1.5">
                  <label className="mb-1.5 block text-xs font-semibold text-slate-600">Document title</label>
                <input
                  type="text"
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  placeholder="e.g. 43rd IAE Winterover Scientific Report"
                  required
                  className="min-h-10 w-full rounded-lg border border-slate-300 bg-[#f5f8fb] px-3.5 py-2 text-sm text-[#143b5e] placeholder:text-slate-500 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-900"
                />
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                  <label className="mb-1.5 block text-xs font-semibold text-slate-600">Description</label>
                <textarea
                  value={uploadDescription}
                  onChange={(e) => setUploadDescription(e.target.value)}
                  placeholder="Provide technical scientific summary..."
                  rows={3}
                  className="w-full rounded-lg border border-slate-300 bg-[#f5f8fb] px-3.5 py-2 text-sm text-[#143b5e] placeholder:text-slate-500 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-900"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <label className="mb-1.5 block text-xs font-semibold text-slate-600">Resource type</label>
                  <select value={uploadType} onChange={(e) => setUploadType(e.target.value)} className="min-h-10 w-full rounded-lg border border-slate-300 bg-[#f5f8fb] px-3 py-2 text-sm text-[#143b5e] focus:border-sky-500 focus:outline-none">
                    <option value="report">Report</option><option value="dataset">Dataset</option><option value="publication">Publication</option><option value="photo">Photograph</option><option value="video">Video</option>
                  </select>
                </div>
                {/* Region */}
                <div className="space-y-1.5">
                  <label className="mb-1.5 block text-xs font-semibold text-slate-600">Region</label>
                  <select
                    value={uploadRegion}
                    onChange={(e) => setUploadRegion(e.target.value)}
                    className="min-h-10 w-full rounded-lg border border-slate-300 bg-[#f5f8fb] px-3 py-2 text-sm text-[#143b5e] focus:border-sky-500 focus:outline-none"
                  >
                    <option value="Antarctic">Antarctica</option>
                    <option value="Arctic">Arctic Svalbard</option>
                    <option value="Southern Ocean">Southern Ocean</option>
                    <option value="Himalayas">Himalayas (Spiti)</option>
                  </select>
                </div>

                {/* Year */}
                <div className="space-y-1.5">
                  <label className="mb-1.5 block text-xs font-semibold text-slate-600">Observation year</label>
                  <input
                    type="number"
                    value={uploadYear}
                    onChange={(e) => setUploadYear(parseInt(e.target.value))}
                    min={1980}
                    max={2030}
                    className="min-h-10 w-full rounded-lg border border-slate-300 bg-[#f5f8fb] px-3 py-2 text-sm text-[#143b5e] focus:border-sky-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Expedition */}
              <div className="space-y-1.5">
                <label className="mb-1.5 block text-xs font-semibold text-slate-600">Associated expedition</label>
                <select
                  value={uploadExpeditionId}
                  onChange={(e) => setUploadExpeditionId(e.target.value)}
                  className="min-h-10 w-full rounded-lg border border-slate-300 bg-[#f5f8fb] px-3 py-2 text-sm text-[#143b5e] focus:border-sky-500 focus:outline-none"
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
                  className="min-h-11 flex-1 rounded-lg bg-sky-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {uploading ? "Processing and indexing..." : "Add to repository"}
                </button>
                <button
                  type="button"
                  onClick={() => setMobileUploadModalOpen(false)}
                  className="min-h-11 rounded-lg border border-slate-300 px-4 py-3 text-sm font-medium text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
