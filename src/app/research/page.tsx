import Link from "next/link";
import { ArrowRight, Microscope } from "lucide-react";
import SectionPage from "@/components/SectionPage";
import { researchPrograms } from "@/lib/site-content";

export default function ResearchPage() {
  return (
    <SectionPage section="Science" title="Research programmes" intro="NCPOR coordinates interdisciplinary research across the polar regions, oceans and the high Himalaya. Explore programme areas and related knowledge resources.">
      <div className="grid gap-4 md:grid-cols-2">
        {researchPrograms.map((program, index) => (
          <Link key={program.slug} href={`/research/${program.slug}`} className="group rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-sky-300 hover:shadow-md">
            <div className="flex items-start justify-between gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-lg bg-sky-50 text-[#277ba5]"><Microscope className="h-5 w-5" /></span>
              <span className="font-mono text-xs text-slate-400">0{index + 1}</span>
            </div>
            <h2 className="mt-4 text-lg font-bold text-[#143b5e] group-hover:text-[#12679a]">{program.title}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">{program.description}</p>
            <span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[#277ba5]">Explore programme <ArrowRight className="h-4 w-4" /></span>
          </Link>
        ))}
      </div>
    </SectionPage>
  );
}
