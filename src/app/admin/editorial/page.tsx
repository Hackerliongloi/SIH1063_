"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ClipboardList,
  CheckCircle,
  XCircle,
  Clock,
  Send,
  Calendar,
  MessageSquare,
  FileText,
  UserCheck,
  RefreshCw,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Eye,
} from "lucide-react";
import { TwitterIcon, InstagramIcon, FacebookIcon } from "@/components/SocialIcons";
import { api } from "@/lib/api";

export default function EditorialDeskPage() {
  const [drafts, setDrafts] = useState<any[]>([]);
  const [selectedDraftId, setSelectedDraftId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"board" | "calendar" | "preview">("board");
  const [calendarItems, setCalendarItems] = useState<any[]>([]);
  const [commentInput, setCommentInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [tickResult, setTickResult] = useState<string | null>(null);

  const loadAll = async () => {
    try {
      const [draftsRes, calRes] = await Promise.all([
        api.getDrafts(),
        api.getCalendar(),
      ]);
      setDrafts(draftsRes || []);
      setCalendarItems(calRes?.items || []);
      if (!selectedDraftId && draftsRes?.length > 0) {
        setSelectedDraftId(draftsRes[0].id);
      }
    } catch (err) {
      console.error("Failed to load editorial data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const handleAction = async (action: string) => {
    if (!selectedDraftId) return;
    setActionLoading(true);
    try {
      await api.transitionDraft(selectedDraftId, action, commentInput || undefined);
      setCommentInput("");
      await loadAll();
    } catch (err) {
      console.error(`Transition ${action} failed:`, err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleTickWorker = async () => {
    try {
      const res = await api.tickWorker();
      setTickResult(`Worker Ticked: ${res.result?.published_count || 0} scheduled stories published!`);
      await loadAll();
      setTimeout(() => setTickResult(null), 5000);
    } catch (e) {
      console.error("Worker tick error", e);
    }
  };

  const selectedDraft = drafts.find((d) => d.id === selectedDraftId);

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      draft: "bg-slate-800 text-slate-300 border-slate-700",
      in_review: "bg-amber-950 text-amber-300 border-amber-800",
      approved: "bg-teal-950 text-teal-300 border-teal-800",
      changes_requested: "bg-orange-950 text-orange-300 border-orange-800",
      rejected: "bg-rose-950 text-rose-300 border-rose-800",
      scheduled: "bg-indigo-950 text-indigo-300 border-indigo-800",
      published: "bg-emerald-950 text-emerald-300 border-emerald-800 font-bold",
    };
    return (
      <span
        className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider border ${
          styles[status] || styles.draft
        }`}
      >
        {status.replace("_", " ")}
      </span>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Editorial Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-0.5 rounded-full bg-teal-950/80 border border-teal-800 text-teal-300 text-xs font-mono">
            <ClipboardList className="w-3.5 h-3.5" />
            TRACK E: EDITORIAL & DISSEMINATION DESK
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Editorial Review & Publishing State Machine
          </h1>
          <p className="text-xs text-slate-400">
            Enforces strict role governance: Draft → Review → Approved → Scheduled → Published in Indian Standard Time (IST).
          </p>
        </div>

        {/* Worker Tick Action */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleTickWorker}
            className="px-3.5 py-2 rounded-xl bg-[#0b1726] border border-[#1b3149] hover:border-sky-500 text-sky-300 text-xs font-mono flex items-center gap-2 transition-all shadow-sm"
          >
            <RefreshCw className="w-3.5 h-3.5 text-sky-400" />
            Tick Worker (Publish Scheduled)
          </button>
        </div>
      </div>

      {tickResult && (
        <div className="p-3 bg-emerald-950/60 border border-emerald-800 rounded-xl text-xs font-mono text-emerald-300">
          ✓ {tickResult}
        </div>
      )}

      {/* View Tabs */}
      <div className="flex border-b border-[#18293d] gap-3">
        <button
          onClick={() => setActiveTab("board")}
          className={`pb-3 px-3 text-xs font-medium transition-colors border-b-2 flex items-center gap-2 ${
            activeTab === "board"
              ? "border-sky-400 text-sky-300 font-semibold"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <ClipboardList className="w-4 h-4" />
          Review Workflow ({drafts.length})
        </button>
        <button
          onClick={() => setActiveTab("calendar")}
          className={`pb-3 px-3 text-xs font-medium transition-colors border-b-2 flex items-center gap-2 ${
            activeTab === "calendar"
              ? "border-sky-400 text-sky-300 font-semibold"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Calendar className="w-4 h-4" />
          IST Editorial Calendar ({calendarItems.length})
        </button>
        <button
          onClick={() => setActiveTab("preview")}
          className={`pb-3 px-3 text-xs font-medium transition-colors border-b-2 flex items-center gap-2 ${
            activeTab === "preview"
              ? "border-sky-400 text-sky-300 font-semibold"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Eye className="w-4 h-4" />
          Social Preview Mock (X / Insta / FB)
        </button>
      </div>

      {/* Tab 1: Review Board */}
      {activeTab === "board" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Drafts List Column */}
          <div className="lg:col-span-5 space-y-3 max-h-[750px] overflow-y-auto pr-1">
            {drafts.map((d) => {
              const isSelected = d.id === selectedDraftId;
              return (
                <div
                  key={d.id}
                  onClick={() => setSelectedDraftId(d.id)}
                  className={`p-4 rounded-xl border text-xs cursor-pointer transition-all space-y-2.5 ${
                    isSelected
                      ? "bg-[#0c1a2c] border-sky-500 shadow-md shadow-sky-950/50"
                      : "bg-[#08121f] border-[#18293d] hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-sky-400 uppercase text-[10px] font-bold">
                      {d.kind}
                    </span>
                    {getStatusBadge(d.status)}
                  </div>

                  <h3 className="font-bold text-white text-sm line-clamp-2 leading-snug">
                    {d.title}
                  </h3>

                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 pt-1 border-t border-[#142334]">
                    <span>By {d.created_by || "Editor"}</span>
                    <span className="text-emerald-400">
                      {d.citations?.length || 0} Grounded Spans
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Detailed Inspector & State Machine Controls */}
          <div className="lg:col-span-7 space-y-6">
            {selectedDraft ? (
              <div className="polar-card rounded-2xl p-6 sm:p-8 space-y-6">
                {/* Status Bar */}
                <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[#18293d]">
                  <div>
                    <span className="font-mono text-xs text-slate-400 block mb-1">Current State:</span>
                    {getStatusBadge(selectedDraft.status)}
                  </div>
                  <div className="text-right text-xs font-mono text-slate-400">
                    <div>Format: <strong className="text-white uppercase">{selectedDraft.kind}</strong></div>
                    <div>Tone: <strong className="text-white">{selectedDraft.tone}</strong></div>
                  </div>
                </div>

                {/* Draft Content */}
                <div className="space-y-3">
                  <h2 className="text-xl font-bold text-white tracking-tight">
                    {selectedDraft.title}
                  </h2>
                  <div className="p-4 bg-[#08121f] rounded-xl border border-[#142334] text-xs sm:text-sm text-slate-200 whitespace-pre-line leading-relaxed max-h-80 overflow-y-auto">
                    {selectedDraft.body_md}
                  </div>
                </div>

                {/* State Machine Transition Actions */}
                <div className="space-y-3 pt-4 border-t border-[#18293d]">
                  <h4 className="text-xs font-mono uppercase tracking-wider text-slate-300">
                    Execute State Machine Transition:
                  </h4>

                  <div className="flex flex-wrap gap-2">
                    {/* Submit for review */}
                    {["draft", "changes_requested"].includes(selectedDraft.status) && (
                      <button
                        onClick={() => handleAction("resubmit")}
                        disabled={actionLoading}
                        className="px-3 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium flex items-center gap-1.5"
                      >
                        <Send className="w-3.5 h-3.5" />
                        Submit for Review
                      </button>
                    )}

                    {/* Reviewer / Admin Actions */}
                    {["in_review"].includes(selectedDraft.status) && (
                      <>
                        <button
                          onClick={() => handleAction("approve")}
                          disabled={actionLoading}
                          className="px-3 py-2 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-xs font-medium flex items-center gap-1.5"
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                          Approve Draft
                        </button>
                        <button
                          onClick={() => handleAction("changes")}
                          disabled={actionLoading}
                          className="px-3 py-2 rounded-lg bg-orange-600 hover:bg-orange-500 text-white text-xs font-medium flex items-center gap-1.5"
                        >
                          <Clock className="w-3.5 h-3.5" />
                          Request Changes
                        </button>
                        <button
                          onClick={() => handleAction("reject")}
                          disabled={actionLoading}
                          className="px-3 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-medium flex items-center gap-1.5"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          Reject
                        </button>
                      </>
                    )}

                    {/* Publish / Schedule */}
                    {["approved", "draft"].includes(selectedDraft.status) && (
                      <>
                        <button
                          onClick={() => handleAction("publish")}
                          disabled={actionLoading}
                          className="px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium flex items-center gap-1.5"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          Publish Immediately
                        </button>
                        <button
                          onClick={() => handleAction("schedule")}
                          disabled={actionLoading}
                          className="px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium flex items-center gap-1.5"
                        >
                          <Clock className="w-3.5 h-3.5" />
                          Schedule Publication
                        </button>
                      </>
                    )}

                    {selectedDraft.status === "published" && (
                      <Link
                        href={`/stories/${selectedDraft.id}`}
                        className="px-3 py-2 rounded-lg bg-emerald-950 border border-emerald-800 text-emerald-300 text-xs font-medium flex items-center gap-1.5"
                      >
                        View Public Story Page <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    )}
                  </div>

                  {/* Comment Box */}
                  <div className="flex gap-2 pt-2">
                    <input
                      type="text"
                      value={commentInput}
                      onChange={(e) => setCommentInput(e.target.value)}
                      placeholder="Add an editorial note or change request log..."
                      className="flex-1 bg-[#08121f] border border-[#18293d] rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-sky-400"
                    />
                    <button
                      onClick={() => handleAction("comment")}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded-xl font-mono"
                    >
                      Comment
                    </button>
                  </div>
                </div>

                {/* Audit & Comments Trail */}
                {selectedDraft.comments && selectedDraft.comments.length > 0 && (
                  <div className="space-y-3 pt-4 border-t border-[#18293d]">
                    <h4 className="text-xs font-mono uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                      <MessageSquare className="w-3.5 h-3.5 text-sky-400" />
                      Editorial Audit Trail & Comments ({selectedDraft.comments.length}):
                    </h4>
                    <div className="space-y-2">
                      {selectedDraft.comments.map((c: any) => (
                        <div
                          key={c.id}
                          className="p-3 rounded-lg bg-[#08121f] border border-[#142334] text-xs space-y-1 font-mono"
                        >
                          <div className="flex items-center justify-between text-slate-400 text-[11px]">
                            <span className="text-sky-300 font-semibold">{c.author_name || "Editorial Staff"}</span>
                            <span>{c.created_at}</span>
                          </div>
                          <p className="text-slate-200">{c.body}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="polar-card rounded-2xl p-16 text-center text-xs text-slate-400">
                Select a draft from the left panel to review citations and transition states.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Editorial Calendar View (IST) */}
      {activeTab === "calendar" && (
        <div className="polar-card rounded-2xl p-6 sm:p-8 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
              <Calendar className="w-5 h-5 text-indigo-400" />
              Dissemination Publication Schedule (Indian Standard Time - Asia/Kolkata)
            </h2>
            <span className="text-xs font-mono text-slate-400">UTC Stored • IST Displayed</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {calendarItems.map((item) => (
              <div
                key={item.id}
                className="bg-[#08121f] border border-[#18293d] rounded-xl p-4 space-y-2.5 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="uppercase text-sky-400 font-semibold">{item.kind}</span>
                    {getStatusBadge(item.status)}
                  </div>
                  <h4 className="font-bold text-white text-sm line-clamp-2 mt-1">
                    {item.title}
                  </h4>
                  <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                    {item.expedition_name}
                  </p>
                </div>

                <div className="pt-2 border-t border-[#142334] text-xs font-mono text-emerald-400 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{item.date_ist}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Social Previews Simulator */}
      {activeTab === "preview" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Twitter / X Mock */}
          <div className="polar-card rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#18293d]">
              <span className="font-mono text-xs text-sky-400 flex items-center gap-1.5 font-bold">
                <TwitterIcon className="w-4 h-4" />
                X / Twitter Simulator
              </span>
              <span className="text-[10px] font-mono text-slate-400">@NCPOR_India</span>
            </div>

            <div className="p-4 bg-black rounded-xl border border-slate-800 space-y-3 text-xs text-slate-100 font-sans">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-sky-600 flex items-center justify-center font-bold text-white text-xs">
                  NP
                </div>
                <div>
                  <div className="font-bold text-white flex items-center gap-1">
                    NCPOR India <span className="text-sky-400">✓</span>
                  </div>
                  <div className="text-[11px] text-slate-400">@NCPOR_India</div>
                </div>
              </div>
              <p className="text-slate-200 leading-relaxed whitespace-pre-line">
                {selectedDraft?.kind === "twitter"
                  ? selectedDraft.body_md
                  : "1/3 ❄️ Live from Maitri Station! Scientists have logged 38 blizzard cycles while sustaining uninterrupted ozone column telemetry. Grounded in 43-IAE report."}
              </p>
            </div>
          </div>

          {/* Instagram Post Mock */}
          <div className="polar-card rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#18293d]">
              <span className="font-mono text-xs text-rose-400 flex items-center gap-1.5 font-bold">
                <InstagramIcon className="w-4 h-4" />
                Instagram Card Simulator
              </span>
              <span className="text-[10px] font-mono text-slate-400">@ncpor.india</span>
            </div>

            <div className="bg-slate-950 rounded-xl border border-slate-800 overflow-hidden space-y-3 text-xs">
              <div className="h-44 bg-slate-900 relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="https://images.unsplash.com/photo-1531366936337-7c912a4589a7?auto=format&fit=crop&w=800&q=80"
                  alt="Polar Preview"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-3 space-y-1.5">
                <span className="font-bold text-white">ncpor.india</span>
                <p className="text-slate-300 line-clamp-4 leading-relaxed">
                  {selectedDraft?.kind === "instagram"
                    ? selectedDraft.body_md
                    : "🌌 Curtains of emerald Aurora Australis over Bharati Station, Larsemann Hills! Verified by Antarctic space weather spectrometers."}
                </p>
              </div>
            </div>
          </div>

          {/* Facebook Post Mock */}
          <div className="polar-card rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#18293d]">
              <span className="font-mono text-xs text-indigo-400 flex items-center gap-1.5 font-bold">
                <FacebookIcon className="w-4 h-4" />
                Facebook Outreach Post
              </span>
              <span className="text-[10px] font-mono text-slate-400">NCPOR Official</span>
            </div>

            <div className="p-4 bg-[#0a1424] rounded-xl border border-indigo-950 space-y-3 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-indigo-700 flex items-center justify-center font-bold text-white text-[10px]">
                  MoES
                </div>
                <div>
                  <div className="font-bold text-white">National Centre for Polar and Ocean Research</div>
                  <div className="text-[10px] text-slate-400">Government Organization • Public</div>
                </div>
              </div>
              <p className="text-slate-200 leading-relaxed line-clamp-5">
                {selectedDraft?.body_md?.slice(0, 300) ||
                  "Scientific outreach update from India's polar campaign. Discover open technical monographs directly through the National Polar Science Knowledge Portal."}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
