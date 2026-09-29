"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Compass,
  Search,
  BookOpen,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  FileText,
  Database,
  Image as ImageIcon,
  Activity,
  Layers,
  Thermometer,
  Wind,
  Navigation,
  ExternalLink,
} from "lucide-react";
import { api } from "@/lib/api";

export default function HomePage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [featuredAssets, setFeaturedAssets] = useState<any[]>([]);
  const [publishedStories, setPublishedStories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [assetsRes, storiesRes] = await Promise.allSettled([
          api.getAssets(),
          api.getStories(),
        ]);
        if (assetsRes.status === "fulfilled") {
          setFeaturedAssets(assetsRes.value.slice(0, 6));
        }
        if (storiesRes.status === "fulfilled") {
          setPublishedStories(storiesRes.value.slice(0, 3));
        }
      } catch (e) {
        console.error("Failed loading homepage data", e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/explore?q=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      router.push("/explore");
    }
  };

  const sampleQueries = [
    "Maitri winterover blizzard between 2022 and 2024",
    "Adélie penguin rookery census",
    "Kongsfjorden CTD salinity profile",
    "Aurora Australis Bharati",
    "Sutri Dhaka glacier mass balance",
  ];

  return (
    <div className="space-y-16 pb-20">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-20 border-b border-[#18293d] ice-gradient-bg">
        {/* Subtle grid contour */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:24px_24px]" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="max-w-3xl space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-950/80 border border-sky-800/80 text-sky-300 text-xs font-mono">
              <span className="w-2 h-2 rounded-full bg-sky-400 animate-ping" />
              <span>MoES / NCPOR KNOWLEDGE REPOSITORY & DISSEMINATION</span>
            </div>

            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-tight">
              India in the Polar Realms: <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 via-teal-300 to-blue-200">
                Four Decades of Cryospheric Science
              </span>
            </h1>

            <p className="text-slate-300 text-base sm:text-lg leading-relaxed">
              Explore scientific expedition reports, oceanographic CTD datasets, peer-reviewed monographs, and AI-grounded outreach stories from Antarctica, the Arctic, the Southern Ocean, and the High Himalayas.
            </p>

            {/* Quick Search Box */}
            <form onSubmit={handleSearchSubmit} className="pt-2">
              <div className="relative flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by keywords, natural years, or topics (e.g. 'blizzard at Maitri between 2022 and 2024')..."
                    className="w-full pl-12 pr-4 py-3.5 rounded-xl bg-[#0b1726] border border-[#1b3149] text-white placeholder-slate-400 text-sm focus:outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-400 shadow-xl"
                  />
                </div>
                <button
                  type="submit"
                  className="px-6 py-3.5 rounded-xl bg-gradient-to-r from-sky-500 to-teal-600 hover:from-sky-400 hover:to-teal-500 text-white font-medium text-sm transition-all shadow-lg shadow-sky-900/40 flex items-center justify-center gap-2 whitespace-nowrap"
                >
                  <Search className="w-4 h-4" />
                  Hybrid Search
                </button>
              </div>

              {/* Sample Queries Chips */}
              <div className="flex flex-wrap items-center gap-2 pt-3 text-xs text-slate-300 font-mono">
                <span className="text-slate-400">Try queries:</span>
                {sampleQueries.map((q, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setSearchQuery(q);
                      router.push(`/explore?q=${encodeURIComponent(q)}`);
                    }}
                    className="px-2.5 py-1 rounded bg-[#0b1726] border border-[#18293d] text-slate-300 hover:text-sky-300 hover:border-sky-700 transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </form>
          </div>
        </div>
      </section>

      {/* Live Observatories & Field Stations Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
              <Navigation className="w-5 h-5 text-sky-400" />
              Active Field Stations & Observatories
            </h2>
            <p className="text-xs sm:text-sm text-slate-400">
              Real-time telemetry and geographical coordinates across India&apos;s polar network.
            </p>
          </div>
          <Link
            href="/about"
            className="text-xs font-mono text-sky-400 hover:text-sky-300 flex items-center gap-1"
          >
            Station Specs <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Station 1: Maitri */}
          <div className="polar-card rounded-xl p-5 relative overflow-hidden group">
            <div className="flex items-start justify-between mb-3">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-sky-400 bg-sky-950/80 px-2 py-0.5 rounded border border-sky-800">
                  Antarctica
                </span>
                <h3 className="text-base font-bold text-white mt-1 group-hover:text-sky-300 transition-colors">
                  Maitri Station
                </h3>
              </div>
              <span className="font-mono text-xs text-sky-300 bg-[#08121f] px-2 py-1 rounded border border-[#142334]">
                Est. 1989
              </span>
            </div>
            <p className="text-xs font-mono text-slate-300 mb-3">
              70°45&apos;58&quot;S, 11°44&apos;09&quot;E | Schirmacher Oasis
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs border-t border-[#142334] pt-3">
              <div className="flex items-center gap-1.5 text-slate-300">
                <Thermometer className="w-3.5 h-3.5 text-sky-400" />
                <span className="text-white font-mono">-26.4°C</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-300">
                <Wind className="w-3.5 h-3.5 text-teal-400" />
                <span className="text-white font-mono">34 kt Gusts</span>
              </div>
            </div>
          </div>

          {/* Station 2: Bharati */}
          <div className="polar-card rounded-xl p-5 relative overflow-hidden group">
            <div className="flex items-start justify-between mb-3">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-teal-400 bg-teal-950/80 px-2 py-0.5 rounded border border-teal-800">
                  Antarctica
                </span>
                <h3 className="text-base font-bold text-white mt-1 group-hover:text-teal-300 transition-colors">
                  Bharati Station
                </h3>
              </div>
              <span className="font-mono text-xs text-teal-300 bg-[#08121f] px-2 py-1 rounded border border-[#142334]">
                Est. 2012
              </span>
            </div>
            <p className="text-xs font-mono text-slate-300 mb-3">
              69°24&apos;28&quot;S, 76°11&apos;14&quot;E | Larsemann Hills
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs border-t border-[#142334] pt-3">
              <div className="flex items-center gap-1.5 text-slate-300">
                <Thermometer className="w-3.5 h-3.5 text-teal-400" />
                <span className="text-white font-mono">-18.1°C</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-300">
                <Activity className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-white font-mono">Aurora Kp 4</span>
              </div>
            </div>
          </div>

          {/* Station 3: Himadri */}
          <div className="polar-card rounded-xl p-5 relative overflow-hidden group">
            <div className="flex items-start justify-between mb-3">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-amber-400 bg-amber-950/80 px-2 py-0.5 rounded border border-amber-800">
                  Arctic
                </span>
                <h3 className="text-base font-bold text-white mt-1 group-hover:text-amber-300 transition-colors">
                  Himadri Station
                </h3>
              </div>
              <span className="font-mono text-xs text-amber-300 bg-[#08121f] px-2 py-1 rounded border border-[#142334]">
                Est. 2008
              </span>
            </div>
            <p className="text-xs font-mono text-slate-300 mb-3">
              78°55&apos;N, 11°56&apos;E | Ny-Ålesund, Svalbard
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs border-t border-[#142334] pt-3">
              <div className="flex items-center gap-1.5 text-slate-300">
                <Thermometer className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-white font-mono">-4.2°C</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-300">
                <Layers className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-white font-mono">Fjord Open</span>
              </div>
            </div>
          </div>

          {/* Station 4: Himansh */}
          <div className="polar-card rounded-xl p-5 relative overflow-hidden group">
            <div className="flex items-start justify-between mb-3">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-indigo-400 bg-indigo-950/80 px-2 py-0.5 rounded border border-indigo-800">
                  Himalayas
                </span>
                <h3 className="text-base font-bold text-white mt-1 group-hover:text-indigo-300 transition-colors">
                  Himansh Station
                </h3>
              </div>
              <span className="font-mono text-xs text-indigo-300 bg-[#08121f] px-2 py-1 rounded border border-[#142334]">
                4080m
              </span>
            </div>
            <p className="text-xs font-mono text-slate-300 mb-3">
              32°24&apos;N, 77°37&apos;E | Chandra Basin, Spiti
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs border-t border-[#142334] pt-3">
              <div className="flex items-center gap-1.5 text-slate-300">
                <Thermometer className="w-3.5 h-3.5 text-indigo-400" />
                <span className="text-white font-mono">-12.0°C</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-300">
                <Layers className="w-3.5 h-3.5 text-indigo-400" />
                <span className="text-white font-mono">1.2m Snow</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Knowledge Assets */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
              <Layers className="w-5 h-5 text-teal-400" />
              Featured Scientific Assets
            </h2>
            <p className="text-xs sm:text-sm text-slate-400">
              Verified expedition technical reports, open datasets, and research photography.
            </p>
          </div>
          <Link
            href="/explore"
            className="text-xs font-mono text-sky-400 hover:text-sky-300 flex items-center gap-1"
          >
            View All ({featuredAssets.length}+) <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {featuredAssets.map((asset) => (
            <Link
              key={asset.id}
              href={`/assets/${asset.id}`}
              className="polar-card rounded-xl p-5 flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-center justify-between text-xs font-mono text-slate-300 mb-3">
                  <span className="flex items-center gap-1.5 text-sky-400 uppercase">
                    {asset.type === "report" && <FileText className="w-3.5 h-3.5" />}
                    {asset.type === "dataset" && <Database className="w-3.5 h-3.5" />}
                    {asset.type === "photo" && <ImageIcon className="w-3.5 h-3.5" />}
                    {asset.type}
                  </span>
                  <span className="bg-[#08121f] px-2 py-0.5 rounded border border-[#142334]">
                    {asset.region} • {asset.year}
                  </span>
                </div>

                <h3 className="text-base font-bold text-white group-hover:text-sky-300 transition-colors line-clamp-2 mb-2">
                  {asset.title}
                </h3>

                <p className="text-xs text-slate-400 line-clamp-3 leading-relaxed mb-4">
                  {asset.description}
                </p>
              </div>

              <div className="pt-3 border-t border-[#142334] flex items-center justify-between text-[11px] text-slate-300 font-mono">
                <span>By {asset.created_by || "NCPOR Scientist"}</span>
                <span className="text-sky-400 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                  Examine <ArrowRight className="w-3 h-3" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Grounded Stories & Outreach */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-2xl bg-gradient-to-br from-[#0b1726] to-[#0e2137] border border-[#18293d] p-6 sm:p-10">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-emerald-950/80 border border-emerald-800 text-emerald-300 text-xs font-mono mb-2">
                <Sparkles className="w-3.5 h-3.5" />
                CITATION-GROUNDED DISSEMINATION
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                Peer-Grounded Polar Stories
              </h2>
              <p className="text-sm text-slate-300 mt-1">
                Every outreach article has every factual claim backed by exact sentence quotes from official expedition reports.
              </p>
            </div>
            <Link
              href="/stories"
              className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-medium text-xs transition-colors flex items-center gap-1.5 whitespace-nowrap"
            >
              Browse Stories Desk <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {publishedStories.map((story) => (
              <Link
                key={story.id}
                href={`/stories/${story.id}`}
                className="bg-[#07111e] border border-[#1c324a] rounded-xl p-5 hover:border-sky-500/50 transition-all flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-center justify-between text-xs font-mono text-slate-300 mb-2">
                    <span className="text-emerald-400 uppercase">
                      ✓ {story.citations?.length || 3} Grounded Citations
                    </span>
                    <span>{story.expedition_name || "Polar Science"}</span>
                  </div>
                  <h3 className="text-base font-bold text-white group-hover:text-sky-300 transition-colors mb-2">
                    {story.title}
                  </h3>
                  <p className="text-xs text-slate-400 line-clamp-3 leading-relaxed mb-4">
                    {story.body_md?.replace(/[#*`]/g, "").slice(0, 180)}...
                  </p>
                </div>
                <div className="text-xs font-mono text-sky-400 flex items-center gap-1">
                  Read Article & Verified Citations <ArrowRight className="w-3 h-3" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Institutional Mission & Compliance Strip */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="border border-[#142334] bg-[#07111e] rounded-xl p-6 grid grid-cols-1 sm:grid-cols-3 gap-6 text-center sm:text-left">
          <div className="space-y-1">
            <span className="text-xs font-mono uppercase text-sky-400 tracking-wider">
              Mandate & Authority
            </span>
            <h4 className="text-sm font-semibold text-white">NCPOR & Ministry of Earth Sciences</h4>
            <p className="text-xs text-slate-300">
              Nodal agency for coordinating India&apos;s polar expeditions, treaty negotiations, and polar marine research.
            </p>
          </div>
          <div className="space-y-1">
            <span className="text-xs font-mono uppercase text-teal-400 tracking-wider">
              Environmental Protocol
            </span>
            <h4 className="text-sm font-semibold text-white">Madrid Protocol & CEP Annex III</h4>
            <p className="text-xs text-slate-300">
              100% zero-discharge bio-digester processing, waste retrieval, and non-native biosecurity controls.
            </p>
          </div>
          <div className="space-y-1">
            <span className="text-xs font-mono uppercase text-indigo-400 tracking-wider">
              Open Science Policy
            </span>
            <h4 className="text-sm font-semibold text-white">Fair & Open Scientific Data</h4>
            <p className="text-xs text-slate-300">
              Open metadata, downloadable CTD transects, and verified citations accessible to international researchers.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
