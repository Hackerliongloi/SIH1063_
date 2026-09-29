import Link from "next/link";
import { ArrowUpRight, GraduationCap, UsersRound } from "lucide-react";
import SectionPage from "@/components/SectionPage";

const opportunities = [
  { title: "Career advertisements & results", description: "Recruitment notifications, eligibility details, application instructions and published results.", href: "https://ncpor.res.in/" },
  { title: "Internship and dissertation", description: "Research internships and dissertation opportunities for eligible undergraduate and postgraduate students.", href: "/careers/internships" },
  { title: "PhD programme", description: "Doctoral research opportunities and programme information through NCPOR and partner universities.", href: "/careers/phd" },
];

export default function CareersPage() {
  return <SectionPage section="Opportunities" title="Careers, internships and PhD" intro="Explore opportunities to contribute to polar, ocean, atmospheric and Earth science research with NCPOR.">
    <div className="grid gap-4 md:grid-cols-3">
      {opportunities.map((item, index) => <article key={item.title} className="flex flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <span className="grid h-11 w-11 place-items-center rounded-lg bg-sky-50 text-[#277ba5]">{index === 0 ? <UsersRound className="h-5 w-5" /> : <GraduationCap className="h-5 w-5" />}</span>
        <h2 className="mt-4 text-lg font-bold text-[#143b5e]">{item.title}</h2>
        <p className="mt-2 flex-1 text-sm leading-6 text-slate-600">{item.description}</p>
        <Link href={item.href} target={item.href.startsWith("http") ? "_blank" : undefined} rel={item.href.startsWith("http") ? "noreferrer" : undefined} className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[#12679a]">View details <ArrowUpRight className="h-4 w-4" /></Link>
      </article>)}
    </div>
    <div className="mt-6 rounded-xl border border-slate-200 bg-white p-5 sm:p-7">
      <h2 className="text-lg font-bold text-[#143b5e]">Working at the edge of discovery</h2>
      <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-600">NCPOR’s work spans field science in polar environments, ocean research, geoscience, data management, engineering, logistics and institutional services. Read each official notice carefully for eligibility, timelines and application procedures.</p>
    </div>
  </SectionPage>;
}
