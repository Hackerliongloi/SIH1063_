"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ChevronDown, ExternalLink, Menu, Search, X } from "lucide-react";
import { navigationGroups } from "@/lib/site-content";

export default function Navbar() {
  const pathname = usePathname();
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileGroup, setMobileGroup] = useState<string | null>(null);
  const [textSize, setTextSize] = useState(100);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpenGroup(null);
        setMobileOpen(false);
        setMobileGroup(null);
      }
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, []);

  const adjustText = (amount: number) => {
    const next = Math.min(125, Math.max(90, textSize + amount));
    setTextSize(next);
    document.documentElement.style.fontSize = `${next}%`;
  };
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
  const navClass = (href: string) => `rounded-md px-2.5 py-1.5 text-[13px] font-semibold transition-colors ${isActive(href) ? "bg-sky-50 text-[#12679a]" : "text-slate-700 hover:bg-slate-50 hover:text-[#12679a]"}`;

  return (
    <header className="relative z-50 border-b border-slate-200 bg-white text-slate-800 shadow-sm">
      <a href="#main-content" className="skip-link">Skip to main content</a>
      <div className="bg-[#123b63] text-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-1 text-[11px] sm:px-6 lg:px-8">
          <p className="truncate font-medium">Government of India <span className="mx-1.5 text-white/50">|</span> Ministry of Earth Sciences</p>
          <div className="flex shrink-0 items-center gap-3 sm:gap-4">
            <Link href="/sitemap" className="hover:underline">Sitemap</Link>
            <Link href="/contact" className="hover:underline">Contact</Link>
            <span className="hidden text-white/75 sm:inline">Text size</span>
            <button type="button" onClick={() => adjustText(-5)} className="rounded px-1.5 py-0.5 hover:bg-white/15" aria-label="Decrease text size">A−</button>
            <button type="button" onClick={() => adjustText(5)} className="rounded px-1.5 py-0.5 hover:bg-white/15" aria-label="Increase text size">A+</button>
          </div>
        </div>
      </div>

      <div className="mx-auto flex max-w-7xl items-center justify-between gap-5 px-4 py-2 sm:px-6 lg:px-8">
        <Link href="/" className="min-w-0 rounded-sm" aria-label="National Centre for Polar and Ocean Research home">
          <span className="block truncate text-sm font-bold leading-tight text-[#143b5e] sm:text-base">National Centre for Polar and Ocean Research</span>
          <span className="mt-0.5 block truncate text-[11px] leading-tight text-slate-500">Ministry of Earth Sciences · Government of India</span>
        </Link>
        <div className="hidden shrink-0 items-center gap-4 lg:flex">
          <Link href="/news" className="text-sm font-medium text-slate-600 hover:text-[#12679a]">News and updates</Link>
          <Link href="/login" className="text-sm font-medium text-slate-600 hover:text-[#12679a]">Staff sign in</Link>
          <Link href="/explore" className="inline-flex items-center gap-2 rounded-lg bg-[#12679a] px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#0d527d]">
            <Search className="h-4 w-4" />Search research
          </Link>
        </div>
        <button type="button" onClick={() => setMobileOpen((open) => !open)} className="rounded-lg border border-slate-300 p-2 text-[#143b5e] hover:bg-slate-50 lg:hidden" aria-label={mobileOpen ? "Close navigation menu" : "Open navigation menu"} aria-expanded={mobileOpen} aria-controls="mobile-navigation">
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      <nav aria-label="Main navigation" className="hidden border-t border-slate-200 lg:block" onMouseLeave={() => setOpenGroup(null)}>
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-0.5 sm:px-6 lg:px-8">
          <div className="flex items-center gap-0.5">
            <Link href="/" className={navClass("/")}>Home</Link>
            <Link href="/discover" className={navClass("/discover")}>Posts and reels</Link>
            {navigationGroups.map((group) => (
              <button key={group.label} type="button" onMouseEnter={() => setOpenGroup(group.label)} onFocus={() => setOpenGroup(group.label)} onClick={() => setOpenGroup((current) => current === group.label ? null : group.label)} aria-expanded={openGroup === group.label} className={`inline-flex items-center gap-1 rounded-md px-2.5 py-2 text-[13px] font-semibold transition-colors ${openGroup === group.label ? "bg-sky-50 text-[#12679a]" : "text-slate-700 hover:bg-slate-50 hover:text-[#12679a]"}`}>
                {group.label}<ChevronDown className={`h-3.5 w-3.5 transition-transform ${openGroup === group.label ? "rotate-180" : ""}`} />
              </button>
            ))}
            <Link href="/tenders" className={navClass("/tenders")}>Tenders</Link>
            <Link href="/careers" className={navClass("/careers")}>Careers</Link>
          </div>
          <Link href="/stories" className={navClass("/stories")}>Science stories</Link>
        </div>
        {openGroup && (
          <div className="absolute left-0 right-0 max-h-[calc(100vh-8rem)] overflow-y-auto border-y border-slate-200 bg-white shadow-xl" onMouseEnter={() => setOpenGroup(openGroup)}>
            {navigationGroups.filter((group) => group.label === openGroup).map((group) => (
              <div key={group.label} className="mx-auto grid max-w-7xl gap-8 px-6 py-7 lg:grid-cols-[minmax(220px,0.8fr)_2fr] lg:px-8">
                <div className="border-b border-slate-200 pb-4 lg:border-b-0 lg:border-r lg:pb-0 lg:pr-6">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#5682a2]">Explore</p>
                  <h2 className="mt-2 text-xl font-bold text-[#143b5e]">{group.label}</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600">Programmes, services and resources from India’s polar and ocean research community.</p>
                </div>
                <div className="grid gap-x-6 gap-y-1 sm:grid-cols-2 lg:grid-cols-3">
                  {group.links.map((item) => (
                    <Link key={item.href} href={item.href} onClick={() => setOpenGroup(null)} className="flex min-h-11 items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-sky-50 hover:text-[#12679a]">
                      {item.label}{item.external && <ExternalLink className="ml-2 h-3.5 w-3.5 shrink-0 text-slate-400" />}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </nav>

      {mobileOpen && (
        <nav id="mobile-navigation" aria-label="Mobile navigation" className="max-h-[75vh] overflow-y-auto border-t border-slate-200 bg-white px-4 py-3 lg:hidden">
          <Link href="/" onClick={() => setMobileOpen(false)} className="block rounded-lg px-3 py-3 font-semibold text-[#143b5e] hover:bg-sky-50">Home</Link>
          <Link href="/discover" onClick={() => setMobileOpen(false)} className="block rounded-lg px-3 py-3 font-semibold text-[#143b5e] hover:bg-sky-50">Posts and reels</Link>
          {navigationGroups.map((group) => (
            <section key={group.label} className="border-t border-slate-100">
              <button type="button" onClick={() => setMobileGroup((current) => current === group.label ? null : group.label)} className="flex min-h-12 w-full items-center justify-between px-3 py-3 text-left font-semibold text-[#143b5e]" aria-expanded={mobileGroup === group.label}>
                {group.label}<ChevronDown className={`h-4 w-4 transition-transform ${mobileGroup === group.label ? "rotate-180" : ""}`} />
              </button>
              {mobileGroup === group.label && <div className="grid grid-cols-1 gap-1 pb-2 pl-3">{group.links.map((item) => <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)} className="flex min-h-10 items-center rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-sky-50">{item.label}</Link>)}</div>}
            </section>
          ))}
          <div className="grid grid-cols-2 gap-1 border-t border-slate-100 pt-2">
            {[{ label: "Tenders", href: "/tenders" }, { label: "Careers", href: "/careers" }, { label: "News and updates", href: "/news" }, { label: "Photo gallery", href: "/gallery" }, { label: "Science stories", href: "/stories" }, { label: "Staff sign in", href: "/login" }].map((item) => <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)} className="rounded-lg px-3 py-3 text-sm text-slate-700 hover:bg-sky-50">{item.label}</Link>)}
          </div>
          <Link href="/explore" onClick={() => setMobileOpen(false)} className="mt-2 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#12679a] px-4 py-2.5 text-sm font-semibold text-white"><Search className="h-4 w-4" />Search research</Link>
        </nav>
      )}
    </header>
  );
}
