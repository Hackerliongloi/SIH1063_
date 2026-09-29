import Link from "next/link";
import { ArrowUpRight, Building2, Compass } from "lucide-react";
import SectionPage from "@/components/SectionPage";

export default function VirtualTourPage() {
  return <SectionPage section="About NCPOR" title="Virtual tour" intro="Take a look around NCPOR’s research campus and learn about the facilities that support polar and ocean science.">
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="relative flex min-h-[300px] items-end bg-[linear-gradient(120deg,#123b63,#3481a0_55%,#b5d8e7)] p-7 sm:min-h-[420px] sm:p-10">
        <div className="absolute right-8 top-8 grid h-36 w-36 place-items-center rounded-full border border-white/40 bg-white/10 text-white/80 sm:right-16 sm:top-12 sm:h-56 sm:w-56"><Building2 className="h-20 w-20 sm:h-28 sm:w-28" strokeWidth={1} /></div>
        <div className="relative max-w-xl text-white"><p className="text-xs font-bold uppercase tracking-[0.16em] text-sky-100">Headland Sada · Goa</p><h2 className="mt-2 text-3xl font-bold">Research begins here</h2><p className="mt-3 text-sm leading-6 text-white/90">NCPOR’s headquarters brings together researchers, laboratories, operations and information services supporting India’s polar and ocean programmes.</p><Link href="https://ncpor.res.in/" target="_blank" rel="noreferrer" className="mt-5 inline-flex items-center gap-2 rounded-md bg-white px-4 py-3 text-sm font-semibold text-[#143b5e]">Visit official virtual tour <ArrowUpRight className="h-4 w-4" /></Link></div>
      </div>
      <div className="grid gap-4 p-5 sm:grid-cols-3 sm:p-7">{["Research laboratories", "Campus and facilities", "Scientific operations"].map((item) => <div key={item} className="flex items-center gap-3 rounded-lg bg-slate-50 p-4 text-sm font-semibold text-[#245b7c]"><Compass className="h-5 w-5 text-[#3282a8]" />{item}</div>)}</div>
    </div>
  </SectionPage>;
}
