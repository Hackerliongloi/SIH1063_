import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowUpRight, CheckCircle2 } from "lucide-react";
import SectionPage from "@/components/SectionPage";

const details: Record<string, { title: string; intro: string; points: string[] }> = {
  internships: { title: "Internship and dissertation", intro: "NCPOR offers selected students opportunities to engage with polar, ocean and Earth science research as part of their academic curriculum.", points: ["Internships and dissertation work are generally available to eligible science, technology and engineering students.", "Applicants should review current eligibility, duration and document requirements in the official notice.", "The reference site advises students to contact a prospective NCPOR scientist and obtain consent before applying.", "Application periods and required documents change; confirm current information on the official NCPOR page."] },
  phd: { title: "PhD programme", intro: "NCPOR is an R&D institution that collaborates with universities and research partners for doctoral programmes.", points: ["Research opportunities span polar science, oceanography, geoscience, atmospheric science and related fields.", "Admission and eligibility are governed by the partner institution and current programme notification.", "Consult official programme notices for supervisors, application procedures and timelines."] },
};

export function generateStaticParams() { return Object.keys(details).map((opportunity) => ({ opportunity })); }

export default async function OpportunityPage({ params }: { params: Promise<{ opportunity: string }> }) {
  const { opportunity } = await params;
  const item = details[opportunity];
  if (!item) notFound();
  return <SectionPage section="Careers" title={item.title} intro={item.intro}>
    <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
      <h2 className="text-lg font-bold text-[#143b5e]">Applicant information</h2>
      <ul className="mt-4 space-y-3">{item.points.map((point) => <li key={point} className="flex gap-3 text-sm leading-6 text-slate-600"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#3282a8]" />{point}</li>)}</ul>
      <Link href="https://ncpor.res.in/" target="_blank" rel="noreferrer" className="mt-7 inline-flex items-center gap-2 rounded-md bg-[#12679a] px-4 py-3 text-sm font-semibold text-white">Check official NCPOR notice <ArrowUpRight className="h-4 w-4" /></Link>
    </article>
  </SectionPage>;
}
