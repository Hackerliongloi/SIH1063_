"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowRight, Calendar, Check, Database, Filter, Image as ImageIcon,
  Info, LoaderCircle, MapPin, Search, SlidersHorizontal, Sparkles, X,
} from "lucide-react";
import SectionPage from "@/components/SectionPage";
import { api } from "@/lib/api";

type SearchHit = {
  asset_id: number | string;
  title: string;
  type?: string;
  region?: string;
  year?: number | string;
  score?: number;
  score_breakdown?: { w_kw_part?: number; w_sem_part?: number; w_rec_part?: number };
  thumb_key?: string | null;
  expedition?: string | null;
  snippet?: string | null;
  page?: number | string | null;
};

type ImageHit = {
  asset_id: number | string;
  title: string;
  region?: string;
  year?: number | string;
  similarity_score?: number;
  thumb_key?: string | null;
  description?: string | null;
};

const assetTypes = [
  { label: "All formats", value: "" },
  { label: "Reports", value: "report" },
  { label: "Datasets", value: "dataset" },
  { label: "Publications", value: "publication" },
  { label: "Photographs", value: "photo" },
  { label: "Videos", value: "video" },
];
const regions = [
  { label: "All regions", value: "" },
  { label: "Antarctica", value: "Antarctic" },
  { label: "Arctic", value: "Arctic" },
  { label: "Southern Ocean", value: "Southern Ocean" },
  { label: "Himalaya", value: "Himalaya" },
];

function ExploreContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [query, setQuery] = useState(searchParams.get("q") || "");
  const [activeTab, setActiveTab] = useState<"hybrid" | "images">("hybrid");
  const [selectedType, setSelectedType] = useState(searchParams.get("type") || "");
  const [selectedRegion, setSelectedRegion] = useState(searchParams.get("region") || "");
  const [selectedSort, setSelectedSort] = useState(searchParams.get("sort") || "relevance");
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const [results, setResults] = useState<SearchHit[]>([]);
  const [imageResults, setImageResults] = useState<ImageHit[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [parsedYears, setParsedYears] = useState<{ from?: number; to?: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchError, setSearchError] = useState(false);
  const [activeScoreBreakdown, setActiveScoreBreakdown] = useState<SearchHit | null>(null);

  useEffect(() => {
    let active = true;
    async function executeSearch() {
      setLoading(true);
      setSearchError(false);
      try {
        if (activeTab === "hybrid") {
          const response = await api.search({
            q: query,
            type: selectedType || undefined,
            region: selectedRegion || undefined,
            sort: selectedSort,
          });
          if (!active) return;
          setResults(Array.isArray(response.results) ? response.results : []);
          setTotalCount(Number(response.total) || 0);
          setParsedYears(response.parsed_year_range || null);
        } else {
          const response = await api.searchImages(query || "polar research");
          if (!active) return;
          setImageResults(Array.isArray(response.results) ? response.results : []);
          setTotalCount(Number(response.total) || 0);
          setParsedYears(null);
        }
      } catch {
        if (active) setSearchError(true);
      } finally {
        if (active) setLoading(false);
      }
    }
    void executeSearch();
    return () => { active = false; };
  }, [query, selectedType, selectedRegion, selectedSort, activeTab]);

  const handleSearchSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (selectedType) params.set("type", selectedType);
    if (selectedRegion) params.set("region", selectedRegion);
    if (selectedSort !== "relevance") params.set("sort", selectedSort);
    router.replace(params.size ? `/explore?${params.toString()}` : "/explore");
  };

  const clearFilters = () => {
    setSelectedType("");
    setSelectedRegion("");
    setSelectedSort("relevance");
    setQuery("");
    setParsedYears(null);
    router.replace("/explore");
  };

  const typeOptions = (mobile = false) => assetTypes.map((item) => (
    <button key={item.value} type="button" onClick={() => setSelectedType(item.value)} aria-pressed={selectedType === item.value}
      className={`${mobile ? "rounded-lg border px-3 py-2.5 text-left text-sm" : "flex min-h-10 w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm"} ${selectedType === item.value ? "border-sky-200 bg-sky-50 font-semibold text-[#12679a]" : "border-transparent text-slate-600 hover:bg-slate-50"}`}>
      {item.label}{selectedType === item.value && <Check className="h-4 w-4" />}
    </button>
  ));
  const regionOptions = (mobile = false) => regions.map((item) => (
    <button key={item.value} type="button" onClick={() => setSelectedRegion(item.value)} aria-pressed={selectedRegion === item.value}
      className={`${mobile ? "rounded-lg border px-3 py-2.5 text-left text-sm" : "flex min-h-10 w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm"} ${selectedRegion === item.value ? "border-teal-200 bg-teal-50 font-semibold text-teal-800" : "border-transparent text-slate-600 hover:bg-slate-50"}`}>
      {item.label}{selectedRegion === item.value && <Check className="h-4 w-4" />}
    </button>
  ));

  return <SectionPage section="Knowledge repository" title="Search research" intro="Find reports, datasets, publications, photographs and other resources from India's polar and ocean research programmes.">
    <div className="space-y-5">
      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5" aria-label="Research search controls">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><h2 className="font-bold text-[#143b5e]">Search the archive</h2><p className="mt-1 text-xs text-slate-500">Search by topic, station, expedition, year or resource type.</p></div>
          <div className="inline-flex rounded-lg bg-slate-100 p-1" role="group" aria-label="Search type">
            <button type="button" onClick={() => setActiveTab("hybrid")} aria-pressed={activeTab === "hybrid"} className={`rounded-md px-3 py-2 text-xs font-semibold transition-colors ${activeTab === "hybrid" ? "bg-white text-[#12679a] shadow-sm" : "text-slate-600 hover:text-[#143b5e]"}`}>Text and data</button>
            <button type="button" onClick={() => setActiveTab("images")} aria-pressed={activeTab === "images"} className={`rounded-md px-3 py-2 text-xs font-semibold transition-colors ${activeTab === "images" ? "bg-white text-[#12679a] shadow-sm" : "text-slate-600 hover:text-[#143b5e]"}`}>Image search</button>
          </div>
        </div>

        <form onSubmit={handleSearchSubmit} className="mt-4 flex gap-2">
          <label className="relative min-w-0 flex-1">
            <span className="sr-only">Search terms</span>
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={activeTab === "hybrid" ? "Search reports, datasets, stations, expeditions…" : "Describe the image you want to find…"}
              className="min-h-11 w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-10 pr-10 text-sm text-slate-800 placeholder:text-slate-400 focus:border-sky-600 focus:outline-none focus:ring-2 focus:ring-sky-100" />
            {query && <button type="button" onClick={() => setQuery("")} aria-label="Clear search" className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700"><X className="h-4 w-4" /></button>}
          </label>
          <button type="submit" className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-lg bg-[#12679a] px-4 text-sm font-semibold text-white hover:bg-[#0d527d]"><Search className="h-4 w-4" /><span className="hidden sm:inline">Search</span></button>
          <button type="button" onClick={() => setMobileFilterOpen(true)} className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 xl:hidden"><Filter className="h-4 w-4 text-[#277ba5]" /><span className="hidden sm:inline">Filters</span></button>
        </form>
        {parsedYears && <p className="mt-3 inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-900"><Calendar className="h-4 w-4" />Year range detected: {parsedYears.from ?? "Any"}–{parsedYears.to ?? "Any"}</p>}
      </section>

      <div className="grid gap-5 xl:grid-cols-4 xl:items-start">
        <aside className="hidden space-y-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm xl:block" aria-label="Search filters">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3"><h2 className="flex items-center gap-2 text-sm font-bold text-[#143b5e]"><SlidersHorizontal className="h-4 w-4 text-[#3282a8]" />Filters</h2>{(selectedType || selectedRegion || query) && <button type="button" onClick={clearFilters} className="text-xs font-semibold text-[#12679a] hover:underline">Clear all</button>}</div>
          <fieldset><legend className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">Resource type</legend><div className="space-y-1">{typeOptions()}</div></fieldset>
          <fieldset><legend className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">Region</legend><div className="space-y-1">{regionOptions()}</div></fieldset>
          <div className="border-t border-slate-100 pt-4"><label htmlFor="sort-results" className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">Sort results</label><select id="sort-results" value={selectedSort} onChange={(event) => setSelectedSort(event.target.value)} className="min-h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 focus:border-sky-600 focus:outline-none"><option value="relevance">Most relevant</option><option value="newest">Newest first</option><option value="oldest">Oldest first</option></select></div>
          <div className="rounded-lg bg-sky-50 p-3 text-xs leading-5 text-slate-600"><p className="font-semibold text-[#245b7c]">How search works</p><p className="mt-1">Results combine keyword matching, semantic relevance and record dates.</p></div>
        </aside>

        <main className="min-w-0 space-y-4 xl:col-span-3" aria-live="polite">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <p className="text-sm text-slate-600">{loading ? "Searching the archive…" : <><strong className="text-[#143b5e]">{totalCount}</strong> {totalCount === 1 ? "result" : "results"}</>}</p>
            <label className="flex items-center gap-2 text-xs text-slate-500 xl:hidden"><span>Sort</span><select value={selectedSort} onChange={(event) => setSelectedSort(event.target.value)} className="min-h-9 rounded-md border border-slate-300 bg-white px-2 text-xs text-slate-700"><option value="relevance">Most relevant</option><option value="newest">Newest first</option><option value="oldest">Oldest first</option></select></label>
          </div>

          {searchError ? <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900">Search is temporarily unavailable. Please try again.</div>
            : loading ? <div className="grid min-h-56 place-items-center rounded-xl border border-slate-200 bg-white text-slate-500"><div className="flex items-center gap-3 text-sm"><LoaderCircle className="h-5 w-5 animate-spin text-[#277ba5]" />Searching the repository</div></div>
            : activeTab === "hybrid" ? results.length === 0 ? <div className="rounded-xl border border-slate-200 bg-white px-6 py-14 text-center shadow-sm"><Database className="mx-auto h-8 w-8 text-slate-400" /><h2 className="mt-3 text-lg font-bold text-[#143b5e]">No matching records</h2><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">Try different search terms or broaden the selected filters.</p><button type="button" onClick={clearFilters} className="mt-5 rounded-lg bg-[#12679a] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#0d527d]">Clear filters</button></div>
              : <div className="space-y-4">{results.map((hit) => <article key={hit.asset_id} className="group flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-sky-300 hover:shadow-md sm:flex-row sm:p-5">
                {hit.thumb_key && <div className="relative h-44 shrink-0 overflow-hidden rounded-lg bg-slate-100 sm:h-32 sm:w-40"><img src={hit.thumb_key} alt={hit.title} className="h-full w-full object-cover transition-transform group-hover:scale-105" /><span className="absolute bottom-2 left-2 rounded bg-white/95 px-2 py-1 text-[10px] font-bold uppercase text-[#245b7c]">{hit.type || "Resource"}</span></div>}
                <div className="flex min-w-0 flex-1 flex-col justify-between gap-3">
                  <div><div className="mb-2 flex flex-wrap items-center justify-between gap-2"><span className="inline-flex items-center gap-1 text-xs text-slate-500"><MapPin className="h-3.5 w-3.5" />{hit.region || "Polar regions"}{hit.year ? ` · ${hit.year}` : ""}</span><button type="button" onClick={() => setActiveScoreBreakdown(hit)} className="inline-flex min-h-8 items-center gap-1.5 rounded-full bg-sky-50 px-2.5 text-xs font-semibold text-[#245b7c] hover:bg-sky-100" aria-label={`View relevance details for ${hit.title}`}><Sparkles className="h-3.5 w-3.5" />Relevance {typeof hit.score === "number" ? hit.score.toFixed(2) : "details"}<Info className="h-3 w-3" /></button></div>
                    <Link href={`/assets/${hit.asset_id}`} className="text-base font-bold leading-snug text-[#143b5e] hover:text-[#12679a]">{hit.title}</Link>
                    {hit.expedition && <p className="mt-1 text-xs text-slate-500">{hit.expedition}</p>}
                    {hit.snippet && <p className="mt-3 rounded-lg bg-slate-50 p-3 text-sm leading-6 text-slate-600">{hit.snippet}</p>}
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 text-xs text-slate-500"><span>{hit.page ? `Matched on page ${hit.page}` : "Research archive record"}</span><Link href={`/assets/${hit.asset_id}`} className="inline-flex min-h-8 items-center gap-1 font-semibold text-[#12679a] hover:underline">View record <ArrowRight className="h-3.5 w-3.5" /></Link></div>
                </div>
              </article>)}</div>
              : imageResults.length === 0 ? <div className="rounded-xl border border-slate-200 bg-white px-6 py-14 text-center shadow-sm"><ImageIcon className="mx-auto h-8 w-8 text-slate-400" /><h2 className="mt-3 text-lg font-bold text-[#143b5e]">No matching images</h2><p className="mt-2 text-sm text-slate-600">Try a different description or a broader search.</p></div>
                : <div className="grid gap-4 sm:grid-cols-2">{imageResults.map((photo) => <article key={photo.asset_id} className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"><div className="relative aspect-[4/3] bg-slate-100">{photo.thumb_key ? <img src={photo.thumb_key} alt={photo.title} className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center text-slate-400"><ImageIcon className="h-8 w-8" /></div>}<span className="absolute right-2 top-2 rounded-full bg-white/95 px-2.5 py-1 text-xs font-semibold text-teal-800">Similarity {typeof photo.similarity_score === "number" ? photo.similarity_score.toFixed(2) : "—"}</span></div><div className="p-4"><p className="text-xs text-slate-500">{photo.region || "Polar regions"}{photo.year ? ` · ${photo.year}` : ""}</p><h2 className="mt-1 font-bold text-[#143b5e]">{photo.title}</h2>{photo.description && <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-600">{photo.description}</p>}<Link href={`/assets/${photo.asset_id}`} className="mt-4 inline-flex min-h-9 items-center gap-1 text-sm font-semibold text-[#12679a] hover:underline">View image record <ArrowRight className="h-4 w-4" /></Link></div></article>)}</div>}
        </main>
      </div>
    </div>

    {mobileFilterOpen && <div className="fixed inset-0 z-50 flex items-end bg-slate-900/50 backdrop-blur-sm xl:hidden" onMouseDown={(event) => { if (event.target === event.currentTarget) setMobileFilterOpen(false); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="filter-dialog-title" className="max-h-[85vh] w-full space-y-5 overflow-y-auto rounded-t-2xl border border-slate-200 bg-white p-5 shadow-2xl sm:p-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3"><h2 id="filter-dialog-title" className="text-base font-bold text-[#143b5e]">Filter research</h2><button type="button" onClick={() => setMobileFilterOpen(false)} aria-label="Close filters" className="grid h-9 w-9 place-items-center rounded-lg text-slate-500 hover:bg-slate-100"><X className="h-5 w-5" /></button></div>
        <fieldset><legend className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">Resource type</legend><div className="grid grid-cols-2 gap-2">{typeOptions(true)}</div></fieldset>
        <fieldset><legend className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">Region</legend><div className="grid grid-cols-2 gap-2">{regionOptions(true)}</div></fieldset>
        <button type="button" onClick={() => setMobileFilterOpen(false)} className="min-h-11 w-full rounded-lg bg-[#12679a] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#0d527d]">Show {totalCount} results</button>
      </section>
    </div>}

    {activeScoreBreakdown && <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/50 p-4 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget) setActiveScoreBreakdown(null); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="relevance-dialog-title" className="w-full max-w-md space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3"><h2 id="relevance-dialog-title" className="flex items-center gap-2 text-sm font-bold text-[#143b5e]"><Sparkles className="h-4 w-4 text-[#3282a8]" />Relevance details</h2><button type="button" onClick={() => setActiveScoreBreakdown(null)} aria-label="Close relevance details" className="grid h-9 w-9 place-items-center rounded-lg text-slate-500 hover:bg-slate-100"><X className="h-4 w-4" /></button></div>
        <p className="text-sm text-slate-600">Result: <strong className="text-[#143b5e]">{activeScoreBreakdown.title}</strong></p>
        <dl className="space-y-2 rounded-lg bg-slate-50 p-4 text-sm"><div className="flex justify-between gap-4"><dt className="text-slate-600">Keyword match</dt><dd className="font-semibold text-[#143b5e]">{activeScoreBreakdown.score_breakdown?.w_kw_part ?? "—"}</dd></div><div className="flex justify-between gap-4"><dt className="text-slate-600">Semantic relevance</dt><dd className="font-semibold text-[#143b5e]">{activeScoreBreakdown.score_breakdown?.w_sem_part ?? "—"}</dd></div><div className="flex justify-between gap-4"><dt className="text-slate-600">Recency</dt><dd className="font-semibold text-[#143b5e]">{activeScoreBreakdown.score_breakdown?.w_rec_part ?? "—"}</dd></div><div className="flex justify-between gap-4 border-t border-slate-200 pt-2"><dt className="font-bold text-[#143b5e]">Combined score</dt><dd className="font-bold text-[#12679a]">{activeScoreBreakdown.score ?? "—"}</dd></div></dl>
        <button type="button" onClick={() => setActiveScoreBreakdown(null)} className="min-h-10 w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Close</button>
      </section>
    </div>}
  </SectionPage>;
}

export default function ExplorePage() {
  return <Suspense fallback={<SectionPage section="Knowledge repository" title="Search research" intro="Find resources from polar and ocean research programmes."><div className="grid min-h-52 place-items-center rounded-xl border border-slate-200 bg-white text-sm text-slate-500"><LoaderCircle className="mr-2 inline h-5 w-5 animate-spin text-[#277ba5]" />Loading search</div></SectionPage>}>
    <ExploreContent />
  </Suspense>;
}
