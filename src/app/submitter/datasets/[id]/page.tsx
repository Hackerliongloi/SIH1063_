/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Upload, FileText, LoaderCircle, CheckCircle, AlertCircle, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function DatasetDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  
  const [dataset, setDataset] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const loadDataset = async () => {
    try {
      const res = await fetch(`/api/assets/${id}`);
      if (!res.ok) throw new Error("Dataset not found");
      const data = await res.json();
      setDataset(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDataset();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    
    setUploading(true);
    setError("");
    const formData = new FormData();
    formData.append("file", file);
    
    try {
      const res = await fetch(`/api/datasets/${id}/upload`, {
        method: "POST",
        body: formData,
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Upload failed");
      
      setDataset(data.asset);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmitForReview = async () => {
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch(`/api/datasets/${id}/transition`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "submit" }),
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed to submit for review");
      
      setDataset(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="flex justify-center py-12"><LoaderCircle className="h-8 w-8 animate-spin text-[#12679a]" /></div>;
  if (error && !dataset) return <div className="p-8 text-center text-red-700">{error}</div>;

  const canUpload = ["draft", "rejected", "failed"].includes(dataset.status);
  const hasFile = !!dataset.file_key;
  
  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <Link href="/submitter/datasets" className="mb-6 flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900">
        <ArrowLeft className="h-4 w-4" /> Back to Datasets
      </Link>
      
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#143b5e]">{dataset.title}</h1>
          <div className="mt-2 flex items-center gap-3">
            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
              dataset.status === "ready" ? "bg-green-100 text-green-700" :
              dataset.status === "in_review" ? "bg-amber-100 text-amber-700" :
              dataset.status === "rejected" ? "bg-red-100 text-red-700" :
              "bg-slate-100 text-slate-700"
            }`}>
              {dataset.status === "ready" && <CheckCircle className="h-3.5 w-3.5" />}
              {dataset.status === "rejected" && <AlertCircle className="h-3.5 w-3.5" />}
              {dataset.status.replace("_", " ")}
            </span>
            <span className="text-sm text-slate-500">ID: {dataset.id}</span>
          </div>
        </div>
        
        {dataset.status === "draft" && hasFile && (
          <button 
            onClick={handleSubmitForReview} 
            disabled={submitting} 
            className="inline-flex items-center gap-2 rounded-lg bg-[#12679a] px-4 py-2 text-sm font-bold text-white hover:bg-[#0d527d] disabled:opacity-50"
          >
            {submitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
            Submit for Review
          </button>
        )}
      </div>

      <div className="mt-8 grid gap-8 md:grid-cols-3">
        <div className="md:col-span-2 space-y-6">
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="font-semibold text-slate-900">Description</h3>
            <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">{dataset.description || "No description provided."}</p>
            
            <div className="mt-6 grid grid-cols-2 gap-4 border-t border-slate-100 pt-6">
              <div>
                <span className="block text-xs font-semibold uppercase tracking-wider text-slate-500">Region</span>
                <span className="mt-1 block font-medium text-slate-900">{dataset.region || "—"}</span>
              </div>
              <div>
                <span className="block text-xs font-semibold uppercase tracking-wider text-slate-500">Year</span>
                <span className="mt-1 block font-medium text-slate-900">{dataset.year || "—"}</span>
              </div>
              <div>
                <span className="block text-xs font-semibold uppercase tracking-wider text-slate-500">Station</span>
                <span className="mt-1 block font-medium text-slate-900">{dataset.station || "—"}</span>
              </div>
            </div>
          </div>
          
          {dataset.status === "rejected" && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-6 shadow-sm">
              <h3 className="flex items-center gap-2 font-semibold text-red-900">
                <AlertCircle className="h-5 w-5" /> Revision Required
              </h3>
              <p className="mt-2 text-sm text-red-800">
                Your dataset requires changes before it can be published. Please update the dataset and submit it for review again.
              </p>
            </div>
          )}
        </div>
        
        <div className="space-y-6">
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="font-semibold text-slate-900">Dataset File</h3>
            
            {hasFile ? (
              <div className="mt-4 flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                <FileText className="h-8 w-8 shrink-0 text-[#12679a]" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-900" title={dataset.metadata?.filename}>
                    {dataset.metadata?.filename || dataset.file_key}
                  </p>
                  <p className="text-xs text-slate-500">
                    {dataset.metadata?.size ? `${(dataset.metadata.size / 1024 / 1024).toFixed(2)} MB` : "Uploaded"}
                  </p>
                </div>
              </div>
            ) : (
              <p className="mt-4 text-sm text-slate-500">No file uploaded yet.</p>
            )}
            
            {canUpload && (
              <div className="mt-6">
                <label className="relative flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-sm font-medium text-[#12679a] hover:bg-slate-100">
                  {uploading ? (
                    <><LoaderCircle className="h-5 w-5 animate-spin" /> Uploading...</>
                  ) : (
                    <><Upload className="h-5 w-5" /> {hasFile ? "Replace File" : "Upload File"}</>
                  )}
                  <input type="file" className="sr-only" onChange={handleFileUpload} disabled={uploading} accept=".pdf,.docx,.csv,.nc,.nc4,.jpg,.jpeg,.png,.webp,.tif,.tiff,.mp4,.txt,.xml" />
                </label>
                {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
                <p className="mt-2 text-xs text-slate-500">Supported formats: CSV, NetCDF, PDF, Images. Max 100MB.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
