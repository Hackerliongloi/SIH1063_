"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Search,
  SlidersHorizontal,
  X,
  FileText,
  Database,
  Image as ImageIcon,
  Video,
  FileCode,
  ArrowUpDown,
  Sparkles,
  Info,
  Calendar,
  MapPin,
  ExternalLink,
  ChevronRight,
  Filter,
} from "lucide-react";
import { api } from "@/lib/api";

function ExploreContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [query, setQuery] = useState(searchParams.get("q") || "");
  const [activeTab, setActiveTab] = useState<"hybrid" | "images">("hybrid");
  const [selectedType, setSelectedType] = useState(searchParams.get("type") || "");
  const [selectedRegion, setSelectedRegion] = useState(searchParams.get("region") || "");
  const [selectedSort, setSelectedSort] = useState(searchParams.get("sort") || "relevance");
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  const [results, setResults] = useState<any[]>([]);
  const [imageResults, setImageResults] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [parsedYears, setParsedYears] = useState<{ from?: number; to?: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeScoreBreakdown, setActiveScoreBreakdown] = useState<any | null>(null);

  useEffect(() => {
    async function executeSearch() {
      setLoading(true);
      try {
        if (activeTab === "hybrid") {
          const res = await api.search({
            q: query,
            type: selectedType || undefined,
            region: selectedRegion || undefined,
            sort: selectedSort,
          });
          setResults(res.results || []);
          setTotalCount(res.total || 0);
          setParsedYears(res.parsed_year_range || null);
        } else {
          const imgRes = await api.searchImages(query || "penguin Maitri");
          setImageResults(imgRes.results || []);
          setTotalCount(imgRes.total || 0);
        }
      } catch (err) {
        console.error("Search execution failed:", err);
      } finally {
        setLoading(false);
      }
    }

    executeSearch();
  }, [query, selectedType, selectedRegion, selectedSort, activeTab]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (selectedType) params.set("type", selectedType);
    if (selectedRegion) params.set("region", selectedRegion);
    if (selectedSort) params.set("sort", selectedSort);
    router.replace(`/explore?${params.toString()}`);
  };

  const clearFilters = () => {
    setSelectedType("");
    setSelectedRegion("");
    setSelectedSort("relevance");
    setQuery("");
    router.replace("/explore");
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Search & Filter Bar */}
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Knowledge Repository Search
            </h1>
            <p className="text-xs sm:text-sm text-slate-400">
              Hybrid ranking: Normalized Keyword (BM25) + 384-dim Dense Embeddings + Recency Decay.
            </p>
          </div>

          {/* Mode Switcher: Hybrid vs CLIP Image Search */}
          <div className="flex items-center bg-[#0b1726] border border-[#1b3149] rounded-lg p-1 self-stretch sm:self-auto">
            <button
              onClick={() => setActiveTab("hybrid")}
              className={`flex-1 sm:flex-initial px-4 py-1.5 rounded-md text-xs font-medium transition-colors ${
                activeTab === "hybrid"
                  ? "bg-sky-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Hybrid Text & Data
            </button>
            <button
              onClick={() => setActiveTab("images")}
              className={`flex-1 sm:flex-initial px-4 py-1.5 rounded-md text-xs font-medium transition-colors ${
                activeTab === "images"
                  ? "bg-sky-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              CLIP Image Search
            </button>
          </div>
        </div>

        {/* Search input form */}
        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={
                activeTab === "hybrid"
                  ? "Search reports, datasets, publications (e.g. 'blizzard at Maitri between 2022 and 2024')..."
                  : "Describe photo contents in natural language (e.g. 'penguin colonies near fast ice edge')..."
              }
              className="w-full pl-11 pr-4 py-3 rounded-xl bg-[#0b1726] border border-[#1b3149] text-white text-sm placeholder-slate-400 focus:outline-none focus:border-sky-400"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <button
            type="submit"
            className="px-5 py-3 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-medium text-sm flex items-center gap-2"
          >
            <Search className="w-4 h-4" />
            <span className="hidden sm:inline">Search</span>
          </button>
          {/* Mobile Filter Toggle Button */}
          <button
            type="button"
            onClick={() => setMobileFilterOpen(true)}
            className="md:hidden px-4 py-3 rounded-xl bg-[#0b1726] border border-[#1b3149] text-slate-300 hover:text-white flex items-center gap-1.5 text-sm"
          >
            <Filter className="w-4 h-4 text-sky-400" />
            <span>Filters</span>
          </button>
        </form>

        {/* Natural Language parsed alert */}
        {parsedYears && (
          <div className="flex items-center gap-2 text-xs font-mono text-emerald-400 bg-emerald-950/40 border border-emerald-800/60 rounded-lg px-3 py-1.5">
            <Calendar className="w-3.5 h-3.5" />
            <span>
              Natural-Language Year Constraint Detected: {parsedYears.from} - {parsedYears.to}
            </span>
          </div>
        )}
      </div>

      {/* Main Layout: Sidebar on Desktop, Bottom Sheet on Mobile */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8 items-start">
        {/* Desktop Sidebar Filters */}
        <aside className="hidden md:block col-span-1 space-y-6 bg-[#08121f] border border-[#18293d] rounded-xl p-5">
          <div className="flex items-center justify-between pb-3 border-b border-[#18293d]">
            <span className="font-bold text-sm text-white flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-sky-400" />
              Filter Metadata
            </span>
            {(selectedType || selectedRegion || query) && (
              <button
                onClick={clearFilters}
                className="text-xs text-sky-400 hover:underline"
              >
                Reset
              </button>
            )}
          </div>

          {/* Type Filter */}
          <div className="space-y-2">
            <label className="text-xs font-mono uppercase text-slate-400 tracking-wider">
              Asset Type
            </label>
            <div className="space-y-1">
              {[
                { label: "All Formats", value: "" },
                { label: "Reports (PDF)", value: "report" },
                { label: "Datasets (CSV/NC)", value: "dataset" },
                { label: "Publications", value: "publication" },
                { label: "Photography", value: "photo" },
                { label: "Video Footage", value: "video" },
              ].map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setSelectedType(t.value)}
                  className={`w-full text-left px-3 py-1.5 rounded-lg text-xs transition-colors flex items-center justify-between ${
                    selectedType === t.value
                      ? "bg-sky-950 text-sky-300 font-semibold border border-sky-800"
                      : "text-slate-300 hover:bg-[#0e2137]"
                  }`}
                >
                  <span>{t.label}</span>
                  {selectedType === t.value && <span className="text-sky-400">✓</span>}
                </button>
              ))}
            </div>
          </div>

          {/* Region Filter */}
          <div className="space-y-2">
            <label className="text-xs font-mono uppercase text-slate-400 tracking-wider">
              Polar Region
            </label>
            <div className="space-y-1">
              {[
                { label: "All Regions", value: "" },
                { label: "Antarctic (Maitri/Bharati)", value: "Antarctic" },
                { label: "Arctic (Ny-Ålesund)", value: "Arctic" },
                { label: "Southern Ocean", value: "Southern Ocean" },
                { label: "Himalayas (Spiti)", value: "Himalayas" },
              ].map((r) => (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => setSelectedRegion(r.value)}
                  className={`w-full text-left px-3 py-1.5 rounded-lg text-xs transition-colors flex items-center justify-between ${
                    selectedRegion === r.value
                      ? "bg-teal-950 text-teal-300 font-semibold border border-teal-800"
                      : "text-slate-300 hover:bg-[#0e2137]"
                  }`}
                >
                  <span>{r.label}</span>
                  {selectedRegion === r.value && <span className="text-teal-400">✓</span>}
                </button>
              ))}
            </div>
          </div>

          {/* Ranking Model Info */}
          <div className="pt-4 border-t border-[#18293d] space-y-2 text-[11px] text-slate-400">
            <span className="font-mono text-sky-400 block font-semibold">
              Ranking Parameters:
            </span>
            <div className="font-mono space-y-1 bg-[#050c16] p-2.5 rounded border border-[#142334]">
              <div>w_kw (BM25): 0.40</div>
              <div>w_sem (Dense): 0.50</div>
              <div>w_rec (Recency): 0.10</div>
            </div>
          </div>
        </aside>

        {/* Results Stream */}
        <main className="col-span-1 md:col-span-3 space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-400 pb-2 border-b border-[#18293d]">
            <span>
              Found <strong className="text-white">{totalCount}</strong> scientific assets
            </span>
            <div className="flex items-center gap-2">
              <span className="hidden sm:inline">Sort:</span>
              <select
                value={selectedSort}
                onChange={(e) => setSelectedSort(e.target.value)}
                className="bg-[#0b1726] border border-[#18293d] rounded px-2.5 py-1 text-slate-300 text-xs focus:outline-none"
              >
                <option value="relevance">Hybrid Score (Highest)</option>
                <option value="newest">Newest First</option>
                <option value="oldest">Historical (Oldest)</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className="py-20 text-center space-y-3">
              <div className="w-8 h-8 border-2 border-sky-400 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs font-mono text-slate-400">Computing hybrid rankings & vector distances...</p>
            </div>
          ) : activeTab === "hybrid" ? (
            results.length === 0 ? (
              <div className="polar-card rounded-xl p-12 text-center space-y-3">
                <Info className="w-8 h-8 text-sky-400 mx-auto" />
                <h3 className="text-base font-bold text-white">No scientific records match your criteria</h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Try broadening your search term or clearing the active filters.
                </p>
                <button
                  onClick={clearFilters}
                  className="px-4 py-2 rounded-lg bg-sky-600 text-white text-xs font-medium"
                >
                  Clear All Filters
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {results.map((hit) => (
                  <div
                    key={hit.asset_id}
                    className="polar-card rounded-xl p-5 flex flex-col md:flex-row gap-5 hover:border-sky-500/50 transition-all group"
                  >
                    {/* Thumbnail if available */}
                    {hit.thumb_key && (
                      <div className="w-full md:w-44 h-32 rounded-lg overflow-hidden relative flex-shrink-0 bg-slate-900 border border-[#1b3149]">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={hit.thumb_key}
                          alt={hit.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                        <span className="absolute bottom-2 left-2 px-1.5 py-0.5 rounded bg-black/80 font-mono text-[9px] uppercase tracking-wider text-sky-300">
                          {hit.type}
                        </span>
                      </div>
                    )}

                    <div className="flex-1 flex flex-col justify-between space-y-3">
                      <div>
                        <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono mb-1.5">
                          <span className="text-teal-400 flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {hit.region} • {hit.year}
                          </span>
                          {/* Score Pill with interactive breakdown */}
                          <button
                            type="button"
                            onClick={() => setActiveScoreBreakdown(hit)}
                            className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-sky-950 text-sky-300 border border-sky-800 text-[10px] hover:bg-sky-900 transition-colors"
                          >
                            <Sparkles className="w-3 h-3 text-sky-400" />
                            <span>Score: {hit.score}</span>
                            <Info className="w-2.5 h-2.5 opacity-70" />
                          </button>
                        </div>

                        <Link
                          href={`/assets/${hit.asset_id}`}
                          className="text-base font-bold text-white group-hover:text-sky-300 transition-colors line-clamp-2"
                        >
                          {hit.title}
                        </Link>

                        {hit.expedition && (
                          <p className="text-xs text-slate-400 font-mono mt-0.5">
                            {hit.expedition}
                          </p>
                        )}

                        <p className="text-xs text-slate-300 leading-relaxed mt-2 line-clamp-3 bg-[#08121f] p-2.5 rounded-lg border border-[#142334]">
                          {hit.snippet}
                        </p>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-[#142334] text-xs font-mono">
                        {hit.page ? (
                          <span className="text-slate-400">
                            Matched on Page <strong>{hit.page}</strong>
                          </span>
                        ) : (
                          <span className="text-slate-400">Full Record Verified</span>
                        )}
                        <Link
                          href={`/assets/${hit.asset_id}`}
                          className="text-sky-400 hover:text-sky-300 flex items-center gap-1"
                        >
                          Open Asset Detail <ChevronRight className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : (
            /* CLIP Semantic Image Search Tab */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {imageResults.map((photo) => (
                <div
                  key={photo.asset_id}
                  className="polar-card rounded-xl overflow-hidden group flex flex-col justify-between"
                >
                  <div className="relative h-48 bg-slate-900">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={photo.thumb_key}
                      alt={photo.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                    <div className="absolute top-2 right-2 px-2 py-0.5 rounded bg-black/80 font-mono text-[10px] text-teal-300 border border-teal-800">
                      CLIP Sim: {photo.similarity_score}
                    </div>
                  </div>

                  <div className="p-4 space-y-2">
                    <span className="text-[10px] font-mono text-slate-400 uppercase">
                      {photo.region} • {photo.year}
                    </span>
                    <h4 className="text-sm font-bold text-white group-hover:text-sky-300 transition-colors line-clamp-2">
                      {photo.title}
                    </h4>
                    <p className="text-xs text-slate-400 line-clamp-2">
                      {photo.description}
                    </p>
                    <Link
                      href={`/assets/${photo.asset_id}`}
                      className="text-xs font-mono text-sky-400 hover:underline pt-2 block"
                    >
                      Examine Photo & Metadata →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>

      {/* Mobile Filter Bottom Sheet */}
      {mobileFilterOpen && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/70 backdrop-blur-sm md:hidden">
          <div className="w-full bg-[#08121f] border-t border-[#18293d] rounded-t-2xl p-6 space-y-5 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#18293d]">
              <span className="font-bold text-base text-white">Filter Repository</span>
              <button
                onClick={() => setMobileFilterOpen(false)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Types */}
            <div className="space-y-2">
              <label className="text-xs font-mono uppercase text-slate-400">Format</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: "All Formats", value: "" },
                  { label: "Reports", value: "report" },
                  { label: "Datasets", value: "dataset" },
                  { label: "Publications", value: "publication" },
                  { label: "Photos", value: "photo" },
                  { label: "Videos", value: "video" },
                ].map((t) => (
                  <button
                    key={t.value}
                    onClick={() => {
                      setSelectedType(t.value);
                    }}
                    className={`px-3 py-2 rounded-lg text-xs font-medium border ${
                      selectedType === t.value
                        ? "bg-sky-950 text-sky-300 border-sky-800"
                        : "bg-[#0b1726] border-[#18293d] text-slate-300"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Regions */}
            <div className="space-y-2">
              <label className="text-xs font-mono uppercase text-slate-400">Region</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: "All Regions", value: "" },
                  { label: "Antarctica", value: "Antarctic" },
                  { label: "Arctic", value: "Arctic" },
                  { label: "Southern Ocean", value: "Southern Ocean" },
                  { label: "Himalayas", value: "Himalayas" },
                ].map((r) => (
                  <button
                    key={r.value}
                    onClick={() => {
                      setSelectedRegion(r.value);
                    }}
                    className={`px-3 py-2 rounded-lg text-xs font-medium border ${
                      selectedRegion === r.value
                        ? "bg-teal-950 text-teal-300 border-teal-800"
                        : "bg-[#0b1726] border-[#18293d] text-slate-300"
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={() => setMobileFilterOpen(false)}
              className="w-full py-3 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-medium text-sm"
            >
              Apply Filters ({totalCount} Results)
            </button>
          </div>
        </div>
      )}

      {/* Score Breakdown Modal */}
      {activeScoreBreakdown && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#08121f] border border-[#1b3149] rounded-2xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#18293d]">
              <span className="font-bold text-white text-sm flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-sky-400" />
                Hybrid Ranking Formula Breakdown
              </span>
              <button
                onClick={() => setActiveScoreBreakdown(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-300">
              Target: <strong className="text-white">{activeScoreBreakdown.title}</strong>
            </p>

            <div className="space-y-3 font-mono text-xs">
              <div className="p-3 rounded-lg bg-[#050c16] border border-[#142334] space-y-2">
                <div className="flex justify-between text-sky-300">
                  <span>Keyword Component (w_kw = 0.40):</span>
                  <span>{activeScoreBreakdown.score_breakdown?.w_kw_part}</span>
                </div>
                <div className="flex justify-between text-teal-300">
                  <span>Semantic Vector (w_sem = 0.50):</span>
                  <span>{activeScoreBreakdown.score_breakdown?.w_sem_part}</span>
                </div>
                <div className="flex justify-between text-indigo-300">
                  <span>Recency Weight (w_rec = 0.10):</span>
                  <span>{activeScoreBreakdown.score_breakdown?.w_rec_part}</span>
                </div>
                <div className="pt-2 border-t border-[#142334] flex justify-between font-bold text-white">
                  <span>Final Composite Score:</span>
                  <span>{activeScoreBreakdown.score}</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => setActiveScoreBreakdown(null)}
              className="w-full py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono"
            >
              Close Inspector
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ExplorePage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-400">Loading Explore...</div>}>
      <ExploreContent />
    </Suspense>
  );
}
