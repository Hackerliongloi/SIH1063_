"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ChevronDown, ExternalLink, Menu, Search, X } from "lucide-react";
import { navigationGroups } from "@/lib/site-content";

const adminLinks = [
  { label: "Editorial", href: "/admin/editorial" },
  { label: "Content", href: "/admin/content" },
  { label: "AI Studio", href: "/admin/generate" },
];

export default function Navbar() {
  const pathname = usePathname();
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileGroup, setMobileGroup] = useState<string | null>(null);
  const [textSize, setTextSize] = useState(100);
  const [highContrast, setHighContrast] = useState(false);

  const adjustText = (amount: number) => {
    const next = Math.min(125, Math.max(90, textSize + amount));
    setTextSize(next);
    document.documentElement.style.fontSize = `${next}%`;
  };

  const toggleContrast = () => {
    const next = !highContrast;
    setHighContrast(next);
    document.documentElement.classList.toggle("high-contrast", next);
  };

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white text-slate-800 shadow-sm">
      <a href="#main-content" className="skip-link">Skip to main content</a>
      <div className="bg-[#123b63] text-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-5 gap-y-1 px-4 py-2 text-xs sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <span className="font-medium">Government of India</span>
            <span className="hidden h-3 w-px bg-white/40 sm:block" />
            <span className="hidden sm:inline">Ministry of Earth Sciences</span>
          </div>
          <div className="flex items-center gap-3 sm:gap-4">
            <Link href="/sitemap" className="hover:underline">Sitemap</Link>
            <Link href="/contact" className="hover:underline">Contact</Link>
            <Link href="https://ncpor.res.in/" className="font-semibold hover:underline" aria-label="Hindi website">हिंदी</Link>
            <span className="hidden sm:inline">Text size</span>
            <button onClick={() => adjustText(-5)} className="rounded px-1 hover:bg-white/15" aria-label="Decrease text size">A−</button>
            <button onClick={() => adjustText(5)} className="rounded px-1 hover:bg-white/15" aria-label="Increase text size">A+</button>
            <button onClick={toggleContrast} className="hidden rounded border border-white/40 px-2 py-1 hover:bg-white/15 sm:inline" aria-pressed={highContrast}>
              {highContrast ? "Normal theme" : "High contrast"}
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <Link href="/" className="flex min-w-0 items-center gap-3" aria-label="NCPOR home">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full border-2 border-[#1c5682] text-center text-[10px] font-bold leading-tight text-[#16466f]">
            NCPOR
            <span className="text-[7px] font-normal">MoES · INDIA</span>
          </div>
          <div className="min-w-0">
            <p className="truncate text-[10px] font-semibold uppercase tracking-[0.13em] text-[#55728a] sm:text-xs">राष्ट्रीय ध्रुवीय एवं समुद्री अनुसंधान केन्द्र</p>
            <p className="text-sm font-bold leading-tight text-[#143b5e] sm:text-lg">National Centre for Polar and Ocean Research</p>
            <p className="hidden text-xs text-slate-500 sm:block">Vasco-da-Gama, Goa · Ministry of Earth Sciences</p>
          </div>
        </Link>

        <div className="hidden items-center gap-3 lg:flex">
          <Link href="/news" className="text-sm font-medium text-slate-600 hover:text-[#12679a]">News & Updates</Link>
          <Link href="/login" className="text-sm font-medium text-slate-600 hover:text-[#12679a]">Staff sign in</Link>
          <Link href="/explore" className="inline-flex items-center gap-2 rounded-md bg-[#12679a] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#0d527d]">
            <Search className="h-4 w-4" /> Search research
          </Link>
        </div>

        <button onClick={() => setMobileOpen(!mobileOpen)} className="rounded-md border border-slate-300 p-2 text-[#143b5e] lg:hidden" aria-label={mobileOpen ? "Close menu" : "Open menu"} aria-expanded={mobileOpen}>
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      <nav aria-label="Main navigation" className="hidden border-t border-slate-200 lg:block" onMouseLeave={() => setOpenGroup(null)}>
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center">
            <Link href="/" className={`px-3 py-3 text-sm font-semibold ${pathname === "/" ? "text-[#12679a]" : "text-slate-700 hover:text-[#12679a]"}`}>Home</Link>
            <Link href="/discover" className={`px-3 py-3 text-sm font-semibold ${isActive("/discover") ? "text-[#12679a]" : "text-slate-700 hover:text-[#12679a]"}`}>Posts &amp; Reels</Link>
            {navigationGroups.map((group) => (
              <button key={group.label} type="button" onMouseEnter={() => setOpenGroup(group.label)} onFocus={() => setOpenGroup(group.label)} onClick={() => setOpenGroup(openGroup === group.label ? null : group.label)} aria-expanded={openGroup === group.label} className={`inline-flex items-center gap-1 px-3 py-3 text-sm font-semibold ${openGroup === group.label ? "text-[#12679a]" : "text-slate-700 hover:text-[#12679a]"}`}>
                {group.label}<ChevronDown className="h-3.5 w-3.5" />
              </button>
            ))}
            <Link href="/tenders" className={`px-3 py-3 text-sm font-semibold ${isActive("/tenders") ? "text-[#12679a]" : "text-slate-700 hover:text-[#12679a]"}`}>Tenders</Link>
            <Link href="/careers" className={`px-3 py-3 text-sm font-semibold ${isActive("/careers") ? "text-[#12679a]" : "text-slate-700 hover:text-[#12679a]"}`}>Careers</Link>
          </div>
          <Link href="/stories" className="py-3 text-sm font-semibold text-slate-700 hover:text-[#12679a]">Science stories</Link>
        </div>
        {openGroup && (
          <div className="absolute left-0 right-0 border-y border-slate-200 bg-white shadow-xl" onMouseEnter={() => setOpenGroup(openGroup)}>
            <div className="mx-auto grid max-w-7xl grid-cols-3 gap-8 px-8 py-7 lg:grid-cols-5">
              {navigationGroups.filter((group) => group.label === openGroup).map((group) => (
                <div key={group.label} className="col-span-3 grid grid-cols-3 gap-8 lg:col-span-5">
                  <div className="col-span-1 border-r border-slate-200 pr-6">
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#5682a2]">Explore</p>
                    <h2 className="mt-2 text-xl font-bold text-[#143b5e]">{group.label}</h2>
                    <p className="mt-2 text-sm leading-6 text-slate-600">Discover programmes, people, services and resources from India’s polar and ocean research community.</p>
                  </div>
                  <div className="col-span-2 grid grid-cols-2 gap-x-8 gap-y-1 lg:col-span-4 lg:grid-cols-3">
                    {group.links.map((item) => (
                      <Link key={item.href} href={item.href} onClick={() => setOpenGroup(null)} className="flex items-center justify-between rounded px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-sky-50 hover:text-[#12679a]">
                        {item.label}{item.external && <ExternalLink className="ml-2 h-3.5 w-3.5 shrink-0 text-slate-400" />}
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </nav>

      {mobileOpen && (
        <nav aria-label="Mobile navigation" className="max-h-[75vh] overflow-y-auto border-t border-slate-200 bg-white px-4 py-3 lg:hidden">
          <Link href="/" onClick={() => setMobileOpen(false)} className="block rounded px-3 py-3 font-semibold text-[#143b5e]">Home</Link>
          {navigationGroups.map((group) => (
            <section key={group.label} className="border-t border-slate-100">
              <button onClick={() => setMobileGroup(mobileGroup === group.label ? null : group.label)} className="flex w-full items-center justify-between px-3 py-3 text-left font-semibold text-[#143b5e]" aria-expanded={mobileGroup === group.label}>{group.label}<ChevronDown className={`h-4 w-4 transition-transform ${mobileGroup === group.label ? "rotate-180" : ""}`} /></button>
              {mobileGroup === group.label && <div className="grid grid-cols-1 gap-1 pb-2 pl-3">{group.links.map((item) => <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)} className="rounded px-3 py-2 text-sm text-slate-600 hover:bg-sky-50">{item.label}</Link>)}</div>}
            </section>
          ))}
          <div className="grid grid-cols-2 gap-1 border-t border-slate-100 pt-2">
            {[{ label: "Posts & Reels", href: "/discover" }, { label: "Tenders", href: "/tenders" }, { label: "Careers", href: "/careers" }, { label: "News", href: "/news" }, { label: "Photo gallery", href: "/gallery" }, { label: "Stories", href: "/stories" }, { label: "Staff sign in", href: "/login" }, ...adminLinks].map((item) => <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)} className="rounded px-3 py-3 text-sm text-slate-700 hover:bg-sky-50">{item.label}</Link>)}
          </div>
        </nav>
      )}
      <div className="border-t border-[#d8e7f1] bg-[#eaf4fa]">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-2 overflow-x-auto px-4 py-2 text-xs text-[#235576] sm:px-6 lg:px-8">
          <span className="whitespace-nowrap font-semibold">Research at the poles, oceans and high Himalaya</span>
          <div className="flex items-center gap-4 whitespace-nowrap">
            <Link href="/news?category=expeditions" className="hover:underline">Expedition updates</Link>
            <Link href="/news?category=vessels" className="hover:underline">Vessel movements</Link>
            <Link href="/gallery" className="hover:underline">Photo gallery</Link>
          </div>
        </div>
      </div>
    </header>
  );
}
