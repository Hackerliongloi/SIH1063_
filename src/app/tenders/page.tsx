import Link from "next/link";
import { ArrowUpRight, BriefcaseBusiness, FileText } from "lucide-react";
import SectionPage from "@/components/SectionPage";

const tenderResources = [
  { title: "Tender notices", description: "Current procurement invitations and tender documents issued by NCPOR.", href: "https://ncpor.res.in/tenders" },
  { title: "Corrigenda", description: "Amendments, clarifications and updates to published tender notices.", href: "https://ncpor.res.in/tenders" },
  { title: "e-Procurement", description: "Access the Government of India e-procurement platform for online tendering.", href: "https://eprocure.gov.in/eprocure/app" },
  { title: "Vendor empanelment", description: "Information related to vendor registration and empanelment notices.", href: "https://ncpor.res.in/tenders" },
  { title: "Enquiries", description: "Procurement enquiries and requests for quotation published by the centre.", href: "https://ncpor.res.in/tenders" },
  { title: "GeM tenders", description: "Government e-Marketplace procurement opportunities and notices.", href: "https://gem.gov.in/" },
  { title: "Tender archive", description: "Previous tender notices and procurement records.", href: "https://ncpor.res.in/tenders" },
];

export default function TendersPage() {
  return <SectionPage section="Opportunities & Notices" title="Tenders and procurement" intro="Find tender notices, corrigenda, vendor information, enquiries and procurement links for the National Centre for Polar and Ocean Research.">
    <div className="grid gap-4 sm:grid-cols-2">
      {tenderResources.map((item) => <article key={item.title} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between"><span className="grid h-10 w-10 place-items-center rounded-lg bg-sky-50 text-[#277ba5]"><FileText className="h-5 w-5" /></span><BriefcaseBusiness className="h-4 w-4 text-slate-400" /></div>
        <h2 className="mt-4 text-lg font-bold text-[#143b5e]">{item.title}</h2>
        <p className="mt-2 min-h-12 text-sm leading-6 text-slate-600">{item.description}</p>
        <Link href={item.href} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[#12679a]">Open resource <ArrowUpRight className="h-4 w-4" /></Link>
      </article>)}
    </div>
    <p className="mt-6 rounded-lg bg-amber-50 p-4 text-sm leading-6 text-amber-900">Tender deadlines and document versions can change. Always verify the live notice on the official NCPOR or Government e-Procurement portal.</p>
  </SectionPage>;
}
