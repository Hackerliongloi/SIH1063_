"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  Compass,
  BookOpen,
  Sparkles,
  ClipboardList,
  UploadCloud,
  BarChart3,
  Info,
  Menu,
  X,
  Radio,
  ShieldCheck,
  ExternalLink,
} from "lucide-react";

export default function Navbar() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { href: "/explore", label: "Explore Repository", icon: Compass },
    { href: "/stories", label: "Science Stories", icon: BookOpen },
    { href: "/about", label: "Stations & About", icon: Info },
  ];

  const adminLinks = [
    { href: "/admin/generate", label: "AI Studio", icon: Sparkles },
    { href: "/admin/editorial", label: "Editorial Desk", icon: ClipboardList },
    { href: "/admin/content", label: "Content & Upload", icon: UploadCloud },
    { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  ];

  const isActive = (path: string) => pathname === path || pathname.startsWith(`${path}/`);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-[#18293d] bg-[#060d17]/95 backdrop-blur-md">
      {/* Official Government of India & Station Telemetry Strip */}
      <div className="bg-[#040911] border-b border-[#142334] px-4 py-1.5 text-[11px] text-slate-300 font-mono flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-sky-400 font-medium">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            NCPOR / MoES INDIA
          </span>
          <span className="hidden sm:inline text-slate-300">|</span>
          <span className="hidden sm:inline text-slate-300">
            National Centre for Polar and Ocean Research, Goa
          </span>
        </div>
        <div className="flex items-center gap-4 overflow-x-auto text-[10px]">
          <div className="flex items-center gap-1.5 whitespace-nowrap">
            <span className="text-slate-300">MAITRI (70°S):</span>
            <span className="text-sky-300 font-semibold">-26°C</span>
            <span className="text-slate-300">34kt Blizzard</span>
          </div>
          <div className="hidden md:flex items-center gap-1.5 whitespace-nowrap">
            <span className="text-slate-300">BHARATI (69°S):</span>
            <span className="text-emerald-300 font-semibold">-18°C</span>
            <span className="text-slate-300">Aurora Kp4</span>
          </div>
          <div className="hidden lg:flex items-center gap-1.5 whitespace-nowrap">
            <span className="text-slate-300">HIMADRI (78°N):</span>
            <span className="text-amber-300 font-semibold">-4°C</span>
            <span className="text-slate-300">Fjord Breakup</span>
          </div>
        </div>
      </div>

      {/* Main Navigation Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-sky-500 to-teal-700 flex items-center justify-center shadow-lg shadow-sky-950/50 border border-sky-400/30 group-hover:scale-105 transition-transform">
            <Radio className="w-5 h-5 text-white animate-pulse" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg tracking-tight text-white group-hover:text-sky-300 transition-colors">
                POLAR PORTAL
              </span>
              <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-sky-950 text-sky-400 border border-sky-800/60 font-mono">
                IAE
              </span>
            </div>
            <span className="text-[10px] text-slate-400 font-sans tracking-tight">
              Integrated Polar Science & Knowledge Repository
            </span>
          </div>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-md text-sm font-medium transition-colors ${
                  active
                    ? "bg-sky-950/70 text-sky-300 border border-sky-800/50"
                    : "text-slate-300 hover:text-white hover:bg-slate-800/50"
                }`}
              >
                <Icon className="w-4 h-4 text-sky-400" />
                {item.label}
              </Link>
            );
          })}

          <div className="h-5 w-px bg-slate-800 mx-2" />

          {/* Admin Navigation Badges */}
          <div className="flex items-center gap-1 bg-[#0b1726] border border-[#1b3149] rounded-lg p-1">
            {adminLinks.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium transition-all ${
                    active
                      ? "bg-sky-600 text-white shadow-sm"
                      : "text-slate-300 hover:text-white hover:bg-slate-800/60"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Mobile menu button */}
        <div className="flex items-center md:hidden">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg bg-[#0b1726] border border-[#1b3149] text-slate-300 hover:text-white"
            aria-label="Toggle navigation"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-[#18293d] bg-[#08121f] px-4 pt-3 pb-5 space-y-4">
          <div className="space-y-1">
            <p className="text-[10px] font-mono uppercase tracking-wider text-slate-300 px-2 py-1">
              Public Sections
            </p>
            {navLinks.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-200 hover:bg-slate-800/70"
                >
                  <Icon className="w-4 h-4 text-sky-400" />
                  {item.label}
                </Link>
              );
            })}
          </div>

          <div className="space-y-1 pt-2 border-t border-[#18293d]">
            <p className="text-[10px] font-mono uppercase tracking-wider text-slate-300 px-2 py-1">
              Editorial & Administration
            </p>
            {adminLinks.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-200 hover:bg-slate-800/70"
                >
                  <Icon className="w-4 h-4 text-teal-400" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </header>
  );
}
