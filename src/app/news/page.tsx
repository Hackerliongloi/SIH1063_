"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, CalendarDays, Newspaper, Search } from "lucide-react";
import SectionPage from "@/components/SectionPage";
import { newsItems } from "@/lib/news-data";

const categories = ["All updates", ...Array.from(new Set(newsItems.map((item) => item.category)))];

export default function NewsPage() {
  const [category, setCategory] = useState("All updates");
  const [query, setQuery] = useState("");
  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get("category");
    if (requested) {
      const match = categories.find((item) => item.toLowerCase() === requested.toLowerCase());
      if (match) setCategory(match);
    }
  }, []);
  const filtered = useMemo(() => newsItems.filter((item) => (category === "All updates" || item.category === category) && item.title.toLowerCase().includes(query.toLowerCase())), [category, query]);

  return (
    <SectionPage section="News & Media" title="News and science updates" intro="Follow institutional news, research highlights, expedition updates and outreach from India’s polar and ocean research programmes.">
      <div className="mb-6 flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">{categories.map((item) => <button key={item} onClick={() => setCategory(item)} className={`rounded-full px-3 py-2 text-xs font-semibold ${category === item ? "bg-[#12679a] text-white" : "bg-slate-100 text-slate-600 hover:bg-sky-50"}`}>{item}</button>)}</div>
        <label className="flex min-w-52 items-center gap-2 rounded-lg border border-slate-200 px-3 py-2"><Search className="h-4 w-4 text-slate-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search updates" className="w-full bg-transparent text-sm outline-none" /></label>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {filtered.map((item, index) => <article key={item.title} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3 text-xs text-slate-500"><span className="rounded-full bg-sky-50 px-2.5 py-1 font-semibold text-[#277ba5]">{item.category}</span><span className="inline-flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" />{item.date}</span></div>
          <h2 className="mt-4 text-lg font-bold leading-snug text-[#143b5e]">{item.title}</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">{item.summary}</p>
          <Link href="https://ncpor.res.in/" target="_blank" rel="noreferrer" className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[#12679a]">Read official update <ArrowUpRight className="h-4 w-4" /></Link>
        </article>)}
      </div>
      {!filtered.length && <div className="rounded-xl bg-white p-10 text-center text-sm text-slate-500"><Newspaper className="mx-auto mb-3 h-8 w-8" />No updates match your search.</div>}
      <p className="mt-6 text-xs leading-5 text-slate-500">This portal highlights NCPOR updates. For authoritative dates, documents and current notices, follow the official NCPOR website.</p>
    </SectionPage>
  );
}
