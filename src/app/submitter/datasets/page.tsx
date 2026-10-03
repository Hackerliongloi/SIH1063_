/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Plus, FileText, LoaderCircle } from "lucide-react";

export default function SubmitterDatasetsPage() {
  const [datasets, setDatasets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadDatasets = async () => {
    try {
      const res = await fetch("/api/submitter/datasets");
      if (!res.ok) throw new Error("Failed to load datasets");
      const data = await res.json();
      setDatasets(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDatasets();
  }, []);

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="flex items-center justify-between pb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#143b5e]">My Submissions</h1>
          <p className="mt-1 text-sm text-slate-500">Manage your datasets, reports, publications, images, videos, and research activities.</p>
        </div>
        <Link href="/submitter/datasets/new" className="inline-flex items-center gap-2 rounded-lg bg-[#12679a] px-4 py-2 text-sm font-bold text-white hover:bg-[#0d527d]">
          <Plus className="h-4 w-4" /> New Submission
        </Link>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><LoaderCircle className="h-8 w-8 animate-spin text-[#12679a]" /></div>
      ) : error ? (
        <div className="rounded-lg bg-red-50 p-4 text-red-700">{error}</div>
      ) : datasets.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-12 text-center">
          <FileText className="mx-auto h-12 w-12 text-slate-300" />
          <h3 className="mt-4 text-sm font-semibold text-slate-900">No datasets</h3>
          <p className="mt-2 text-sm text-slate-500">Get started by creating a dataset, report, publication, image, video, or activity submission.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-6 py-3 font-semibold">Title</th>
                <th className="px-6 py-3 font-semibold">Status</th>
                <th className="px-6 py-3 font-semibold">Updated</th>
                <th className="px-6 py-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {datasets.map(d => (
                <tr key={d.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 font-medium text-slate-900">{d.title}<span className="ml-2 rounded bg-slate-100 px-2 py-1 text-xs font-normal text-slate-600">{d.type || "dataset"}</span></td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                      d.review_status === "approved" ? "bg-green-100 text-green-700" :
                      d.review_status === "in_review" ? "bg-amber-100 text-amber-700" :
                      d.review_status === "rejected" ? "bg-red-100 text-red-700" :
                      "bg-slate-100 text-slate-700"
                    }`}>
                      {d.review_status.replace("_", " ")}
                    </span>
                    {d.status === "processing" && <span className="ml-2 text-xs text-blue-600">Processing...</span>}
                    {d.status === "failed" && <span className="ml-2 text-xs text-red-600">File Error</span>}
                  </td>
                  <td className="px-6 py-4 text-slate-500">{new Date(d.created_at).toLocaleDateString()}</td>
                  <td className="px-6 py-4 text-right">
                    <Link href={`/submitter/datasets/${d.id}`} className="text-[#12679a] hover:underline">Manage</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
