import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";

export default function SectionPage({
  section,
  title,
  intro,
  children,
}: {
  section: string;
  title: string;
  intro: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-[60vh] bg-[#f5f8fb] text-slate-800">
      <div className="border-b border-[#d6e4ee] bg-gradient-to-r from-[#eaf4fa] to-white">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
          <div className="mb-4 flex items-center gap-2 text-xs text-slate-500">
            <Link href="/" aria-label="Home" className="hover:text-[#12679a]"><Home className="h-3.5 w-3.5" /></Link>
            <ChevronRight className="h-3 w-3" />
            <span>{section}</span>
            <ChevronRight className="h-3 w-3" />
            <span className="font-medium text-[#245b7c]">{title}</span>
          </div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#3982a8]">{section}</p>
          <h1 className="mt-2 max-w-4xl text-3xl font-bold tracking-tight text-[#143b5e] sm:text-4xl">{title}</h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-slate-600">{intro}</p>
        </div>
      </div>
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,1fr)_280px] lg:px-8 lg:py-12">
        <div className="min-w-0">{children}</div>
        <aside className="space-y-5">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-bold text-[#143b5e]">Explore NCPOR</h2>
            <div className="mt-3 grid gap-2 text-sm">
              <Link href="/research" className="text-slate-600 hover:text-[#12679a]">Research programmes</Link>
              <Link href="/expeditions/antarctica" className="text-slate-600 hover:text-[#12679a]">Polar expeditions</Link>
              <Link href="/data-centre" className="text-slate-600 hover:text-[#12679a]">Data and services</Link>
              <Link href="/news" className="text-slate-600 hover:text-[#12679a]">News and updates</Link>
              <Link href="/contact" className="text-slate-600 hover:text-[#12679a]">Contact</Link>
            </div>
          </div>
          <div className="rounded-xl bg-[#143b5e] p-5 text-white">
            <p className="text-xs font-semibold uppercase tracking-wider text-sky-200">Knowledge repository</p>
            <p className="mt-2 text-sm leading-6 text-white/85">Find scientific reports, datasets, publications and media from India’s polar and ocean research programmes.</p>
            <Link href="/explore" className="mt-4 inline-flex rounded-md bg-white px-3 py-2 text-sm font-semibold text-[#143b5e] hover:bg-sky-50">Search resources</Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
