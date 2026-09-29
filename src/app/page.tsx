"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, ArrowUpRight, BookOpen, ChevronRight, Compass, Database, FileText, Images, Microscope, Ship, UsersRound } from "lucide-react";
import { api } from "@/lib/api";
import { expeditions, researchPrograms } from "@/lib/site-content";
import { newsItems } from "@/lib/news-data";

const quickLinks = [
  { title: "Expedition updates", description: "Follow field campaigns and programme notices.", href: "/news?category=expeditions", icon: Compass },
  { title: "Research vessel movements", description: "Find vessel and ocean expedition updates.", href: "/news?category=vessels", icon: Ship },
  { title: "Careers & opportunities", description: "Explore recruitment, internships and PhD programmes.", href: "/careers", icon: UsersRound },
  { title: "Photo gallery", description: "View research environments and programme highlights.", href: "/gallery", icon: Images },
  { title: "Right to Information", description: "Find transparency and public information resources.", href: "/institution/rti", icon: FileText },
  { title: "Results framework", description: "Browse institutional objectives and performance information.", href: "/institution/result-framework", icon: BookOpen },
];

export default function HomePage() {
  const [assets, setAssets] = useState<any[]>([]);
  const [stories, setStories] = useState<any[]>([]);

  useEffect(() => {
    Promise.allSettled([api.getAssets(), api.getStories()]).then(([assetResult, storyResult]) => {
      if (assetResult.status === "fulfilled" && Array.isArray(assetResult.value)) setAssets(assetResult.value.slice(0, 4));
      if (storyResult.status === "fulfilled" && Array.isArray(storyResult.value)) setStories(storyResult.value.slice(0, 3));
    });
  }, []);

  return (
    <div className="bg-white text-slate-800">
      <section className="relative overflow-hidden bg-[#143b5e] text-white">
        <div className="absolute inset-0 bg-cover bg-center opacity-40" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1517299321609-52687d1bc55a?auto=format&fit=crop&w=2200&q=90')" }} />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0d2c48]/95 via-[#143b5e]/70 to-[#143b5e]/15" />
        <div className="relative mx-auto grid min-h-[480px] max-w-7xl items-center gap-10 px-4 py-14 sm:px-6 lg:min-h-[560px] lg:grid-cols-[1.25fr_0.75fr] lg:px-8">
          <div className="max-w-3xl">
            <p className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.13em] text-sky-100">Ministry of Earth Sciences · Government of India</p>
            <h1 className="mt-5 text-4xl font-bold leading-tight tracking-tight sm:text-5xl lg:text-6xl">Exploring the polar regions and the ocean realm</h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-white/90 sm:text-lg">The National Centre for Polar and Ocean Research advances India’s scientific research in Antarctica, the Arctic, the Southern Ocean and the high Himalaya.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/institution/overview" className="inline-flex items-center gap-2 rounded-md bg-white px-5 py-3 text-sm font-bold text-[#143b5e] hover:bg-sky-50">Discover NCPOR <ArrowRight className="h-4 w-4" /></Link>
              <Link href="/explore" className="inline-flex items-center gap-2 rounded-md border border-white/60 px-5 py-3 text-sm font-semibold text-white hover:bg-white/10"><Database className="h-4 w-4" />Search research archive</Link>
            </div>
          </div>
          <div className="hidden lg:block">
            <div className="rounded-2xl border border-white/25 bg-[#0c2b45]/70 p-6 shadow-2xl backdrop-blur-sm">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-sky-200">India’s research frontiers</p>
              <div className="mt-5 space-y-2">{expeditions.slice(0, 4).map((item) => <Link href={`/expeditions/${item.slug}`} key={item.slug} className="flex items-center justify-between rounded-lg px-3 py-3 hover:bg-white/10"><span><span className="block font-semibold">{item.title}</span><span className="mt-0.5 block text-xs text-white/70">{item.kicker}</span></span><ChevronRight className="h-4 w-4 text-sky-200" /></Link>)}</div>
              <Link href="/expeditions/southern-ocean" className="mt-3 flex items-center justify-between border-t border-white/15 px-3 pt-4 text-sm font-semibold text-sky-100">Southern Ocean<ChevronRight className="h-4 w-4" /></Link>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-slate-200 bg-[#f1f7fb]">
        <div className="mx-auto grid max-w-7xl gap-0 px-4 sm:px-6 md:grid-cols-3 lg:px-8">
          {[{ title: "Polar Science & Cryosphere", body: "Understanding polar regions and a changing cryosphere.", href: "/research/polar-science" }, { title: "Geoscience", body: "Systematic study of ocean basins and marine geology.", href: "/research/geoscience" }, { title: "Ocean research", body: "Observations of the ocean realm and its global connections.", href: "/research/ocean-sciences" }].map((item, index) => <Link key={item.title} href={item.href} className={`group px-5 py-6 md:px-7 ${index < 2 ? "md:border-r md:border-slate-200" : ""}`}><p className="text-xs font-bold uppercase tracking-wider text-[#5590ae]">Research focus 0{index + 1}</p><h2 className="mt-2 text-lg font-bold text-[#143b5e] group-hover:text-[#12679a]">{item.title}</h2><p className="mt-1 text-sm leading-6 text-slate-600">{item.body}</p></Link>)}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-16">
        <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-[#3982a8]">Discover our work</p><h2 className="mt-2 text-2xl font-bold text-[#143b5e] sm:text-3xl">Research across changing environments</h2></div><Link href="/research" className="inline-flex items-center gap-2 text-sm font-semibold text-[#12679a]">All research programmes <ArrowRight className="h-4 w-4" /></Link></div>
        <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{researchPrograms.slice(0, 4).map((program) => <Link href={`/research/${program.slug}`} key={program.slug} className="group rounded-xl border border-slate-200 bg-white p-5 transition hover:-translate-y-0.5 hover:border-sky-300 hover:shadow-lg"><span className="grid h-10 w-10 place-items-center rounded-lg bg-sky-50 text-[#277ba5]"><Microscope className="h-5 w-5" /></span><h3 className="mt-4 font-bold text-[#143b5e] group-hover:text-[#12679a]">{program.title}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{program.description}</p><span className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-[#3282a8]">Explore <ChevronRight className="h-3.5 w-3.5" /></span></Link>)}</div>
      </section>

      <section className="bg-[#f4f8fb] py-14 lg:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-[#3982a8]">Field programmes</p><h2 className="mt-2 text-2xl font-bold text-[#143b5e] sm:text-3xl">From polar stations to the open ocean</h2></div><Link href="/expeditions/antarctica" className="inline-flex items-center gap-2 text-sm font-semibold text-[#12679a]">View all expeditions <ArrowRight className="h-4 w-4" /></Link></div>
          <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">{expeditions.map((item) => <Link href={`/expeditions/${item.slug}`} key={item.slug} className="group overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"><div className="h-36 bg-cover bg-center transition duration-500 group-hover:scale-[1.02]" style={{ backgroundImage: `url('${item.image}')` }} /><div className="p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-[#3982a8]">{item.kicker}</p><h3 className="mt-1 text-lg font-bold text-[#143b5e]">{item.title}</h3><p className="mt-2 line-clamp-3 text-xs leading-5 text-slate-600">{item.description}</p></div></Link>)}</div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[1fr_0.8fr] lg:px-8 lg:py-16">
        <div><div className="flex items-end justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-[#3982a8]">From the knowledge archive</p><h2 className="mt-2 text-2xl font-bold text-[#143b5e]">Research resources</h2></div><Link href="/explore" className="text-sm font-semibold text-[#12679a]">Browse all</Link></div>
          <div className="mt-5 divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white px-5">{assets.length ? assets.map((asset) => <Link href={`/assets/${asset.id}`} key={asset.id} className="flex items-center justify-between gap-4 py-4"><span><span className="block text-xs font-semibold uppercase text-[#3982a8]">{asset.type} {asset.year ? `· ${asset.year}` : ""}</span><span className="mt-1 block font-semibold text-[#143b5e]">{asset.title}</span><span className="mt-1 line-clamp-1 block text-sm text-slate-500">{asset.description}</span></span><ChevronRight className="h-4 w-4 shrink-0 text-slate-400" /></Link>) : <div className="py-6 text-sm text-slate-500">Explore reports, datasets, publications and media in the repository.</div>}</div>
        </div>
        <div><div className="flex items-end justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-[#3982a8]">Institutional updates</p><h2 className="mt-2 text-2xl font-bold text-[#143b5e]">Latest news</h2></div><Link href="/news" className="text-sm font-semibold text-[#12679a]">All news</Link></div>
          <div className="mt-5 divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white px-5">{newsItems.slice(0, 4).map((item) => <Link href="/news" key={item.title} className="block py-4"><span className="text-[10px] font-bold uppercase tracking-wider text-[#3982a8]">{item.category}</span><span className="mt-1 block text-sm font-semibold leading-5 text-[#143b5e] hover:text-[#12679a]">{item.title}</span></Link>)}</div>
        </div>
      </section>

      <section className="bg-[#143b5e] py-12 text-white">
        <div className="mx-auto grid max-w-7xl gap-6 px-4 sm:px-6 md:grid-cols-4 lg:px-8">{quickLinks.map(({ title, description, href, icon: Icon }) => <Link key={title} href={href} className="group rounded-xl border border-white/20 p-5 hover:bg-white/10"><Icon className="h-5 w-5 text-sky-200" /><h2 className="mt-3 font-bold">{title}</h2><p className="mt-1 text-sm leading-5 text-white/75">{description}</p><span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-sky-100">Open <ChevronRight className="h-3 w-3 transition-transform group-hover:translate-x-1" /></span></Link>)}</div>
      </section>

      {stories.length > 0 && <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8"><div className="flex items-end justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-[#3982a8]">Science communication</p><h2 className="mt-2 text-2xl font-bold text-[#143b5e]">Stories from research</h2></div><Link href="/stories" className="inline-flex items-center gap-2 text-sm font-semibold text-[#12679a]">Read all stories <ArrowRight className="h-4 w-4" /></Link></div><div className="mt-6 grid gap-4 md:grid-cols-3">{stories.map((story) => <Link key={story.id} href={`/stories/${story.id}`} className="rounded-xl border border-slate-200 bg-white p-5 hover:border-sky-300 hover:shadow-md"><BookOpen className="h-5 w-5 text-[#3282a8]" /><h3 className="mt-3 font-bold text-[#143b5e]">{story.title}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{story.excerpt}</p></Link>)}</div></section>}

      <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8"><div className="flex flex-col justify-between gap-5 rounded-2xl bg-[#eaf4fa] p-6 sm:flex-row sm:items-center sm:p-9"><div><p className="text-xs font-bold uppercase tracking-[0.15em] text-[#3982a8]">Scientific information services</p><h2 className="mt-2 text-2xl font-bold text-[#143b5e]">Explore data from India’s polar programmes</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Visit the National Polar Data Center, meteorological data service, or search the Polar Portal archive.</p></div><Link href="/data-centre" className="inline-flex shrink-0 items-center gap-2 rounded-md bg-[#12679a] px-5 py-3 text-sm font-semibold text-white hover:bg-[#0d527d]">Data services <ArrowUpRight className="h-4 w-4" /></Link></div></section>
    </div>
  );
}
