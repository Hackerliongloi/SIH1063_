import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Database, FileText } from "lucide-react";
import SectionPage from "@/components/SectionPage";
import { researchPrograms } from "@/lib/site-content";

export function generateStaticParams() { return researchPrograms.map(({ slug }) => ({ program: slug })); }

export default async function ResearchProgramPage({ params }: { params: Promise<{ program: string }> }) {
  const { program: slug } = await params;
  const program = researchPrograms.find((item) => item.slug === slug);
  if (!program) notFound();
  return (
    <SectionPage section="Science & Research" title={program.title} intro={program.description}>
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <h2 className="text-xl font-bold text-[#143b5e]">Research themes</h2>
        <p className="mt-3 text-sm leading-7 text-slate-600">NCPOR research combines field observations, laboratory analysis, satellite and geospatial information, long-term monitoring and international scientific collaboration. Programme scope and current activities are updated through official reports and expedition records.</p>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <Link href="/explore?type=report" className="flex items-center gap-3 rounded-lg bg-[#f2f8fc] p-4 text-sm font-semibold text-[#245b7c]"><FileText className="h-5 w-5" />Programme reports</Link>
          <Link href="/explore?type=dataset" className="flex items-center gap-3 rounded-lg bg-[#f2f8fc] p-4 text-sm font-semibold text-[#245b7c]"><Database className="h-5 w-5" />Research datasets</Link>
        </div>
        <Link href="/expeditions/antarctica" className="mt-7 inline-flex items-center gap-2 text-sm font-semibold text-[#12679a]">View expeditions <ArrowRight className="h-4 w-4" /></Link>
      </div>
    </SectionPage>
  );
}
