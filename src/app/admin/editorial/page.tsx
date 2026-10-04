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
  RefreshCw,
  Sparkles,
  ArrowRight,
  Eye,
  Trash2,
} from "lucide-react";
import { TwitterIcon, InstagramIcon, FacebookIcon } from "@/components/SocialIcons";
import { api } from "@/lib/api";
import { getMediaUrl } from "@/lib/media";

type DraftComment = { id?: string | number; author_name?: string; body: string; created_at?: string };
type LinkedMedia = { id: number; type: string; title?: string; external_url?: string | null; file_key?: string | null; thumb_key?: string | null; alt_text?: string };
type LinkedContent = { id: number; kind: string; caption?: string; title?: string; description?: string; status: string; primary_asset?: LinkedMedia | null; media?: LinkedMedia[] };
type DraftRecord = { id: string | number; kind: string; title: string; body_md?: string; tone?: string; status: string; created_by?: string | number; citations?: unknown[]; comments?: DraftComment[]; scheduled_at?: string | null; expedition_id?: string | number | null; public_story_id?: number | null; linked_content?: LinkedContent | null; webhook_delivery_status?: { id?: number; state: string; attempts: number; last_error: string | null; }; };
type CalendarRecord = DraftRecord;

export default function EditorialDeskPage() {
  const [drafts, setDrafts] = useState<DraftRecord[]>([]);
  const [selectedDraftId, setSelectedDraftId] = useState<string | null>(null);
  const [selectedDraft, setSelectedDraft] = useState<DraftRecord | null>(null);
  const [activeTab, setActiveTab] = useState<"board" | "calendar" | "preview">("board");
  const [calendarItems, setCalendarItems] = useState<CalendarRecord[]>([]);
  const [commentInput, setCommentInput] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [tickResult, setTickResult] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [currentRole, setCurrentRole] = useState<"admin" | "editor" | "reviewer" | null>(null);

  const loadAll = async (preferredDraftId?: string | null) => {
    setLoadError(null);
    try {
      const [draftsRes, calRes, sessionRes] = await Promise.all([
        api.getDrafts(),
        api.getCalendar(),
        fetch("/api/auth/session", { cache: "no-store" }).then(async (response) => {
          if (!response.ok) throw new Error("Your session could not be verified.");
          return response.json() as Promise<{ role: "admin" | "editor" | "reviewer" }>;
        }),
      ]);
      setCurrentRole(sessionRes.role);
      const draftList = Array.isArray(draftsRes) ? draftsRes as DraftRecord[] : [];
      const calendarList = Array.isArray(calRes) ? calRes as CalendarRecord[] : [];
      setDrafts(draftList);
      setCalendarItems(calendarList);
      const nextId = preferredDraftId === undefined ? (selectedDraftId || draftList[0]?.id) : (preferredDraftId || draftList[0]?.id);
      if (nextId) {
        const detail = await api.getDraft(String(nextId));
        setSelectedDraft(detail as DraftRecord);
        setSelectedDraftId(String(nextId));
      } else {
        setSelectedDraft(null);
        setSelectedDraftId(null);
      }
    } catch (err) {
      console.error("Failed to load editorial data", err);
      setLoadError(err instanceof Error ? err.message : "Editorial data could not be loaded.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadAll(); }, 0);
    return () => window.clearTimeout(timer);
    // Initial load only; mutations explicitly refresh the desk.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectDraft = async (id: string) => {
    setSelectedDraftId(id);
    try {
      setSelectedDraft(await api.getDraft(id) as DraftRecord);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Draft details could not be loaded.");
    }
  };

  const handleAction = async (action: string) => {
    if (!selectedDraftId) return;
    if (action === "unpublish" && !window.confirm("Unpublish this item from the Polar Portal? This removes it from public portal views and moves it back to Approved. Posts already sent by an external social platform cannot be recalled here.")) return;
    if (action === "comment" && !commentInput.trim()) {
      setLoadError("Enter an editorial note before adding a comment.");
      return;
    }
    if (action === "schedule" && !scheduledAt) {
      setLoadError("Choose a publication date and time before scheduling.");
      return;
    }
    setActionLoading(true);
    try {
      if (action === "comment") await api.addDraftComment(selectedDraftId, commentInput.trim());
      else await api.transitionDraft(selectedDraftId, action, commentInput || undefined, action === "schedule" ? new Date(scheduledAt).toISOString() : undefined);
      setCommentInput("");
      setScheduledAt("");
      await loadAll();
    } catch (err) {
      console.error(`Transition ${action} failed:`, err);
      setLoadError(err instanceof Error ? err.message : "The editorial action could not be completed.");
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
      setLoadError(e instanceof Error ? e.message : "The publishing worker could not be run.");
    }
  };

  const handleDeleteDraft = async () => {
    if (!selectedDraftId || !window.confirm("Delete this draft and its unpublished linked content? This cannot be undone.")) return;
    setActionLoading(true);
    try {
      await api.deleteDraft(selectedDraftId);
      setSelectedDraftId(null);
      setSelectedDraft(null);
      await loadAll(null);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "The draft could not be deleted.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleWebhookRetry = async (eventId: string | number) => {
    setActionLoading(true);
    try {
      await api.retryWebhook(eventId);
      await loadAll();
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Webhook delivery could not be retried.");
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      draft: "bg-slate-100 text-slate-700 border-slate-300",
      in_review: "bg-amber-50 text-amber-800 border-amber-200",
      approved: "bg-teal-50 text-teal-800 border-teal-200",
      changes_requested: "bg-orange-50 text-orange-800 border-orange-200",
      rejected: "bg-rose-50 text-rose-800 border-rose-200",
      scheduled: "bg-indigo-50 text-indigo-800 border-indigo-200",
      published: "bg-emerald-50 text-emerald-800 border-emerald-200 font-bold",
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
          <div className="inline-flex items-center gap-2 px-3 py-0.5 rounded-full bg-teal-50/80 border border-teal-200 text-teal-800 text-xs font-mono">
            <ClipboardList className="w-3.5 h-3.5" />
            TRACK E: EDITORIAL & DISSEMINATION DESK
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#143b5e] tracking-tight">
            Editorial Review & Publishing State Machine
          </h1>
          <p className="text-xs text-slate-500">
            Enforces strict role governance: Draft → Review → Approved → Scheduled → Published in Indian Standard Time (IST).<br/>
            Note: &quot;Webhook delivered&quot; means Zapier or Make accepted the request; it does not prove each social account published successfully.
          </p>
        </div>

        {/* Worker Tick Action */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleTickWorker}
            className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:border-sky-500 text-[#12679a] text-xs font-mono flex items-center gap-2 transition-all shadow-sm"
          >
            <RefreshCw className="w-3.5 h-3.5 text-[#12679a]" />
            Tick Worker (Publish Scheduled)
          </button>
        </div>
      </div>

      {loadError && <div role="alert" className="flex items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800"><span>{loadError}</span><button type="button" onClick={() => { void loadAll(); }} className="shrink-0 font-semibold underline">Retry</button></div>}
      {loading && <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500"><RefreshCw className="mr-2 inline h-4 w-4 animate-spin" />Loading editorial desk...</div>}

      {tickResult && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-mono text-emerald-800">
          ✓ {tickResult}
        </div>
      )}

      {/* View Tabs */}
      <div className="flex border-b border-slate-200 gap-3">
        <button
          onClick={() => setActiveTab("board")}
          className={`pb-3 px-3 text-xs font-medium transition-colors border-b-2 flex items-center gap-2 ${
            activeTab === "board"
              ? "border-sky-400 text-[#12679a] font-semibold"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <ClipboardList className="w-4 h-4" />
          Review Workflow ({drafts.length})
        </button>
        <button
          onClick={() => setActiveTab("calendar")}
          className={`pb-3 px-3 text-xs font-medium transition-colors border-b-2 flex items-center gap-2 ${
            activeTab === "calendar"
              ? "border-sky-400 text-[#12679a] font-semibold"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <Calendar className="w-4 h-4" />
          IST Editorial Calendar ({calendarItems.length})
        </button>
        <button
          onClick={() => setActiveTab("preview")}
          className={`pb-3 px-3 text-xs font-medium transition-colors border-b-2 flex items-center gap-2 ${
            activeTab === "preview"
              ? "border-sky-400 text-[#12679a] font-semibold"
              : "border-transparent text-slate-500 hover:text-slate-700"
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
              const isSelected = String(d.id) === selectedDraftId;
              return (
                <div
                  key={d.id}
                  onClick={() => { void selectDraft(String(d.id)); }}
                  className={`p-4 rounded-xl border text-xs cursor-pointer transition-all space-y-2.5 ${
                    isSelected
                      ? "bg-sky-50 border-sky-500 shadow-md shadow-sky-950/50"
                      : "bg-slate-50 border-slate-200 hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[#12679a] uppercase text-[10px] font-bold">
                      {d.kind}
                    </span>
                    <div className="flex gap-2 items-center">
                      {d.webhook_delivery_status && (
                        <span title={d.webhook_delivery_status.last_error || ""} className={`px-1.5 py-0.5 rounded text-[9px] font-mono uppercase tracking-wider border ${d.webhook_delivery_status.state === 'delivered' ? 'bg-green-100 text-green-700 border-green-200' : d.webhook_delivery_status.state === 'dead_letter' ? 'bg-red-100 text-red-700 border-red-200' : 'bg-blue-100 text-blue-700 border-blue-200'}`}>
                          Webhook: {d.webhook_delivery_status.state}
                        </span>
                      )}
                      {getStatusBadge(d.status)}
                    </div>
                  </div>

                  <h3 className="font-bold text-[#143b5e] text-sm line-clamp-2 leading-snug">
                    {d.title}
                  </h3>

                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 pt-1 border-t border-slate-200">
                    <span>By {d.created_by || "Editor"}</span>
                    <span className="text-emerald-700">
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
                <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-200">
                  <div>
                    <span className="font-mono text-xs text-slate-500 block mb-1">Current State:</span>
                    {getStatusBadge(selectedDraft.status)}
                  </div>
                  <div className="text-right text-xs font-mono text-slate-500">
                    <div>Format: <strong className="text-[#143b5e] uppercase">{selectedDraft.kind}</strong></div>
                    <div>Tone: <strong className="text-[#143b5e]">{selectedDraft.tone}</strong></div>
                  </div>
                </div>

                {/* Draft Content */}
                <div className="space-y-3">
                  <h2 className="text-xl font-bold text-[#143b5e] tracking-tight">
                    {selectedDraft.title}
                  </h2>
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-700 whitespace-pre-line leading-relaxed max-h-80 overflow-y-auto">
                    {selectedDraft.body_md}
                  </div>
                </div>

                {/* Exact linked post/media admins will approve or unpublish */}
                {selectedDraft.kind !== "article" && (
                  <section aria-label="Generated social post preview" className="overflow-hidden rounded-xl border border-sky-200 bg-white">
                    <div className="border-b border-sky-100 bg-sky-50 px-4 py-2 text-[11px] font-mono font-semibold uppercase tracking-wide text-sky-900">Portal post preview · {selectedDraft.kind}</div>
                    <div className="p-4 space-y-3">
                      {(() => {
                        const item = selectedDraft.linked_content;
                        const media = item?.media?.length ? item.media : item?.primary_asset ? [item.primary_asset] : [];
                        if (!item) return <p className="text-sm text-slate-600">No linked feed item was found for this draft. Review the draft text and citations below before approval.</p>;
                        return <>
                          <div className="flex items-center gap-2 text-xs text-slate-500"><span className="font-semibold text-[#143b5e]">Portal feed item #{item.id}</span><span>·</span><span className="capitalize">{item.status.replace("_", " ")}</span></div>
                          {media.length ? <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{media.map((asset, index) => {
                            const video = asset.type === "video";
                            const url = video ? `/api/assets/${asset.id}/media` : getMediaUrl(asset.thumb_key || asset.file_key || asset.external_url);
                            return <div key={`${asset.id}-${index}`} className="overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              {url ? (video ? <video src={url} poster={getMediaUrl(asset.thumb_key) || undefined} controls playsInline preload="metadata" className="max-h-80 w-full bg-black object-contain" /> : <img src={url} alt={asset.alt_text || asset.title || `Post media ${index + 1}`} className="max-h-80 w-full object-contain" />) : <div className="p-6 text-sm text-slate-500">Media URL is unavailable.</div>}
                              <div className="px-3 py-2 text-xs text-slate-600">{asset.title || (video ? "Video attachment" : "Image attachment")}</div>
                            </div>;
                          })}</div> : <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-3 text-xs text-slate-600">No media is attached. This will appear as a text-only post.</div>}
                          <div className="rounded-lg bg-slate-50 p-3 text-sm leading-relaxed text-slate-700 whitespace-pre-line">{item.caption || selectedDraft.body_md || "No post text is available."}</div>
                        </>;
                      })()}
                    </div>
                  </section>
                )}

                {/* State Machine Transition Actions */}
                <div className="space-y-3 pt-4 border-t border-slate-200">
                  <h4 className="text-xs font-mono uppercase tracking-wider text-slate-600">
                    Execute State Machine Transition:
                  </h4>

                  {selectedDraft.status === "approved" && <label className="block max-w-sm text-xs font-semibold text-slate-700">Publication date and time
                    <input type="datetime-local" value={scheduledAt} onChange={(event) => setScheduledAt(event.target.value)} className="mt-1.5 min-h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-normal text-slate-800 focus:border-sky-600 focus:outline-none focus:ring-2 focus:ring-sky-100" />
                  </label>}

                  <div className="flex flex-wrap gap-2">
                    {selectedDraft.webhook_delivery_status?.state === "dead_letter" && selectedDraft.webhook_delivery_status.id && <button type="button" onClick={() => void handleWebhookRetry(selectedDraft.webhook_delivery_status!.id!)} disabled={actionLoading} className="px-3 py-2 rounded-lg bg-amber-100 text-amber-900 text-xs font-medium disabled:opacity-50">Retry webhook</button>}
                    {selectedDraft.status !== "published" && (currentRole === "admin" || currentRole === "editor") && <button type="button" onClick={() => void handleDeleteDraft()} disabled={actionLoading} className="px-3 py-2 rounded-lg border border-rose-200 bg-rose-50 text-rose-800 text-xs font-medium disabled:opacity-50"><Trash2 className="mr-1 inline h-3.5 w-3.5"/>Delete draft</button>}
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
                    {["approved"].includes(selectedDraft.status) && (
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

                    {selectedDraft.status === "published" && selectedDraft.public_story_id && (
                      <Link
                        href={`/community?view_id=${selectedDraft.public_story_id}&view_type=${["instagram", "twitter", "facebook", "post", "carousel"].includes(selectedDraft.kind) ? "post" : selectedDraft.kind}`}
                        className="px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center gap-1.5"
                      >
                        View Public Story Page <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    )}
                    {selectedDraft.status === "published" && currentRole === "admin" && <button type="button" onClick={() => void handleAction("unpublish")} disabled={actionLoading} className="px-3 py-2 rounded-lg border border-amber-300 bg-amber-50 text-amber-900 text-xs font-semibold disabled:opacity-50">Unpublish</button>}
                  </div>

                  {/* Comment Box */}
                  <div className="flex gap-2 pt-2">
                    <input
                      type="text"
                      value={commentInput}
                      onChange={(e) => setCommentInput(e.target.value)}
                      placeholder="Add an editorial note or change request log..."
                      className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-[#143b5e] placeholder-slate-400 focus:outline-none focus:border-sky-400"
                    />
                    <button
                      onClick={() => handleAction("comment")}
                      disabled={actionLoading}
                      className="rounded-lg bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 disabled:opacity-50"
                    >
                      Comment
                    </button>
                  </div>
                </div>

                {/* Audit & Comments Trail */}
                {selectedDraft.comments && selectedDraft.comments.length > 0 && (
                  <div className="space-y-3 pt-4 border-t border-slate-200">
                    <h4 className="text-xs font-mono uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                      <MessageSquare className="w-3.5 h-3.5 text-[#12679a]" />
                      Editorial Audit Trail & Comments ({selectedDraft.comments.length}):
                    </h4>
                    <div className="space-y-2">
                      {selectedDraft.comments.map((c, idx) => (
                        <div
                          key={c.id ?? idx}
                          className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs space-y-1 font-mono"
                        >
                          <div className="flex items-center justify-between text-slate-500 text-[11px]">
                            <span className="text-[#12679a] font-semibold">{c.author_name || "Editorial Staff"}</span>
                            <span>{c.created_at}</span>
                          </div>
                          <p className="text-slate-700">{c.body}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="polar-card rounded-2xl p-16 text-center text-xs text-slate-500">
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
            <h2 className="text-lg font-bold text-[#143b5e] tracking-tight flex items-center gap-2">
              <Calendar className="w-5 h-5 text-indigo-700" />
              Dissemination Publication Schedule (Indian Standard Time - Asia/Kolkata)
            </h2>
            <span className="text-xs font-mono text-slate-500">UTC Stored • IST Displayed</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {calendarItems.map((item) => (
              <div
                key={item.id}
                className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2.5 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="uppercase text-[#12679a] font-semibold">{item.kind}</span>
                    {getStatusBadge(item.status)}
                  </div>
                  <h4 className="font-bold text-[#143b5e] text-sm line-clamp-2 mt-1">
                    {item.title}
                  </h4>
                  <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                    {item.expedition_id ? `Expedition ${item.expedition_id}` : "General repository"}
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-200 text-xs font-mono text-emerald-700 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{item.scheduled_at ? new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" }).format(new Date(item.scheduled_at)) : "Date pending"}</span>
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
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <span className="font-mono text-xs text-[#12679a] flex items-center gap-1.5 font-bold">
                <TwitterIcon className="w-4 h-4" />
                X / Twitter Simulator
              </span>
              <span className="text-[10px] font-mono text-slate-500">@NCPOR_India</span>
            </div>

            <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs font-sans text-slate-700">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-sky-600 flex items-center justify-center font-bold text-white text-xs">
                  NP
                </div>
                <div>
                  <div className="font-bold text-[#143b5e] flex items-center gap-1">
                    NCPOR India <span className="text-[#12679a]">✓</span>
                  </div>
                  <div className="text-[11px] text-slate-500">@NCPOR_India</div>
                </div>
              </div>
              <p className="text-slate-700 leading-relaxed whitespace-pre-line">
                {selectedDraft?.kind === "twitter"
                  ? selectedDraft.body_md
                  : "1/3 ❄️ Live from Maitri Station! Scientists have logged 38 blizzard cycles while sustaining uninterrupted ozone column telemetry. Grounded in 43-IAE report."}
              </p>
            </div>
          </div>

          {/* Instagram Post Mock */}
          <div className="polar-card rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <span className="font-mono text-xs text-rose-700 flex items-center gap-1.5 font-bold">
                <InstagramIcon className="w-4 h-4" />
                Instagram Card Simulator
              </span>
              <span className="text-[10px] font-mono text-slate-500">@ncpor.india</span>
            </div>

            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white text-xs">
              <div className="relative h-44 bg-slate-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="https://images.unsplash.com/photo-1531366936337-7c912a4589a7?auto=format&fit=crop&w=800&q=80"
                  alt="Polar Preview"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-3 space-y-1.5">
                <span className="font-bold text-[#143b5e]">ncpor.india</span>
                <p className="text-slate-600 line-clamp-4 leading-relaxed">
                  {selectedDraft?.kind === "instagram"
                    ? selectedDraft.body_md
                    : "🌌 Curtains of emerald Aurora Australis over Bharati Station, Larsemann Hills! Verified by Antarctic space weather spectrometers."}
                </p>
              </div>
            </div>
          </div>

          {/* Facebook Post Mock */}
          <div className="polar-card rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <span className="font-mono text-xs text-indigo-700 flex items-center gap-1.5 font-bold">
                <FacebookIcon className="w-4 h-4" />
                Facebook Outreach Post
              </span>
              <span className="text-[10px] font-mono text-slate-500">NCPOR Official</span>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-indigo-950 space-y-3 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-indigo-700 flex items-center justify-center font-bold text-white text-[10px]">
                  MoES
                </div>
                <div>
                  <div className="font-bold text-[#143b5e]">National Centre for Polar and Ocean Research</div>
                  <div className="text-[10px] text-slate-500">Government Organization • Public</div>
                </div>
              </div>
              <p className="text-slate-700 leading-relaxed line-clamp-5">
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
