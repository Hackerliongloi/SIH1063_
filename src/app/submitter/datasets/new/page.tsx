/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle } from "lucide-react";

export default function NewDatasetPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [region, setRegion] = useState("Antarctica");
  const [station, setStation] = useState("");
  const [year, setYear] = useState(new Date().getFullYear());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    
    try {
      const res = await fetch("/api/datasets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "dataset",
          title,
          description,
          region,
          station: station || null,
          year,
          tags: [],
          metadata: {}
        })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed to create dataset");
      
      router.push(`/submitter/datasets/${data.id}`);
    } catch (e: any) {
      setError(e.message);
      setSubmitting(false);
    }
  };

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-bold text-[#143b5e]">New Dataset Submission</h1>
      <p className="mt-1 text-sm text-slate-500">Provide the initial metadata for your dataset. You can upload the data file in the next step.</p>
      
      <form onSubmit={handleSubmit} className="mt-8 space-y-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700">Dataset Title *</label>
          <input required type="text" value={title} onChange={e => setTitle(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-sky-600 focus:ring-1 focus:ring-sky-600" />
        </div>
        
        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700">Description</label>
          <textarea rows={4} value={description} onChange={e => setDescription(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-sky-600 focus:ring-1 focus:ring-sky-600"></textarea>
        </div>
        
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">Region</label>
            <select value={region} onChange={e => setRegion(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-sky-600 focus:ring-1 focus:ring-sky-600">
              <option value="Antarctica">Antarctica</option>
              <option value="Arctic">Arctic</option>
              <option value="Himalaya">Himalaya</option>
              <option value="Southern Ocean">Southern Ocean</option>
            </select>
          </div>
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">Year</label>
            <input type="number" value={year} onChange={e => setYear(parseInt(e.target.value))} className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-sky-600 focus:ring-1 focus:ring-sky-600" />
          </div>
        </div>
        
        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700">Station / Location (Optional)</label>
          <input type="text" value={station} onChange={e => setStation(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-sky-600 focus:ring-1 focus:ring-sky-600" />
        </div>
        
        {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}
        
        <div className="flex justify-end gap-3 pt-4">
          <button type="button" onClick={() => router.back()} className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100">Cancel</button>
          <button type="submit" disabled={submitting} className="inline-flex items-center gap-2 rounded-lg bg-[#12679a] px-4 py-2 text-sm font-bold text-white hover:bg-[#0d527d] disabled:opacity-50">
            {submitting && <LoaderCircle className="h-4 w-4 animate-spin" />}
            Continue to Upload
          </button>
        </div>
      </form>
    </main>
  );
}
