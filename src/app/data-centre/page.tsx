import Link from "next/link";
import { ArrowUpRight, Database, Globe2, RadioTower } from "lucide-react";
import SectionPage from "@/components/SectionPage";

const services = [
  { title: "National Polar Data Center", description: "Discover and access polar research data resources and services.", href: "https://npdc.ncpor.res.in/npdc/", icon: Database },
  { title: "Meteorological Data", description: "Explore weather and meteorological information from NCPOR research environments.", href: "https://data.ncpor.res.in/", icon: RadioTower },
  { title: "Live Access Server", description: "Access mapped and gridded ocean and environmental datasets through the live data service.", href: "https://las.ncaor.gov.in/", icon: Globe2 },
];

export default function DataCentrePage() {
  return <SectionPage section="Data & Services" title="Data centre" intro="NCPOR’s data services support the discovery, stewardship and use of observations from polar and ocean research programmes.">
    <div className="grid gap-4 md:grid-cols-3">{services.map(({ title, description, href, icon: Icon }) => <article key={title} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <span className="grid h-11 w-11 place-items-center rounded-lg bg-sky-50 text-[#277ba5]"><Icon className="h-5 w-5" /></span><h2 className="mt-4 text-lg font-bold text-[#143b5e]">{title}</h2><p className="mt-2 min-h-16 text-sm leading-6 text-slate-600">{description}</p><Link href={href} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[#12679a]">Open data service <ArrowUpRight className="h-4 w-4" /></Link>
    </article>)}</div>
    <div className="mt-6 rounded-xl bg-[#eaf4fa] p-5"><h2 className="font-bold text-[#143b5e]">Research archive</h2><p className="mt-2 text-sm leading-6 text-slate-600">This portal complements NCPOR’s specialist data systems with a searchable archive of reports, datasets, publications, photographs and outreach stories.</p><Link href="/explore" className="mt-3 inline-block text-sm font-semibold text-[#12679a]">Search the archive →</Link></div>
  </SectionPage>;
}
