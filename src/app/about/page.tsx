import Link from "next/link";
import { Anchor, ArrowUpRight, MapPin } from "lucide-react";
import SectionPage from "@/components/SectionPage";

const stations = [
  { name: "Maitri", region: "Antarctica", location: "Schirmacher Oasis, Queen Maud Land", coordinates: "70° 45′ 58″ S, 11° 44′ 09″ E", established: "1989", summary: "India's year-round Antarctic research station supporting atmospheric, geological, biological and other scientific observations." },
  { name: "Bharati", region: "Antarctica", location: "Larsemann Hills, East Antarctica", coordinates: "69° 24′ 28″ S, 76° 11′ 14″ E", established: "2012", summary: "India's coastal Antarctic research station supporting multidisciplinary polar and ocean science." },
  { name: "Himadri", region: "Arctic", location: "Ny-Ålesund, Svalbard, Norway", coordinates: "78° 55′ N, 11° 56′ E", established: "2008", summary: "India's Arctic research station, supporting studies of the atmosphere, fjords, snow and polar ecosystems." },
  { name: "Himansh", region: "Himalaya", location: "Chandra Basin, Spiti Valley, Himachal Pradesh", coordinates: "32° 24′ N, 77° 37′ E", established: "2016", summary: "A high-altitude field station supporting research on Himalayan glaciers, snow, permafrost and hydrology." },
  { name: "Dakshin Gangotri", region: "Antarctica", location: "Queen Maud Land, Antarctica", coordinates: "70° 05′ S, 12° 00′ E", established: "1983", summary: "India's first Antarctic station. It was decommissioned in 1990 and is preserved as a historic site." },
];

const vessels = [
  { name: "ORV Sagar Kanya", role: "Oceanographic research vessel", summary: "Supports oceanographic surveys and scientific cruises." },
  { name: "ORV Sagar Nidhi", role: "Ocean research vessel", summary: "Supports multidisciplinary marine research and operations in challenging sea conditions." },
];

export default function AboutPage() {
  return (
    <SectionPage section="About NCPOR" title="India's polar and ocean research" intro="The National Centre for Polar and Ocean Research coordinates and advances India's research across Antarctica, the Arctic, the Southern Ocean and the high Himalaya.">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {[
          { title: "Polar and cryosphere science", description: "Field observations and long-term research help improve understanding of polar regions and a changing cryosphere." },
          { title: "Ocean research", description: "Research programmes study the oceans, their environments and their connections with the wider Earth system." },
          { title: "Research infrastructure", description: "Stations, vessels, logistics and data services support scientific work in remote environments." },
        ].map((item) => <article key={item.title} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-xs font-bold uppercase tracking-wider text-[#3982a8]">NCPOR mandate</p><h2 className="mt-2 text-lg font-bold text-[#143b5e]">{item.title}</h2><p className="mt-2 text-sm leading-6 text-slate-600">{item.description}</p></article>)}
      </div>

      <section className="mt-10" aria-labelledby="stations-heading">
        <div className="mb-5"><h2 id="stations-heading" className="text-2xl font-bold text-[#143b5e]">Research stations</h2><p className="mt-1 text-sm text-slate-600">Facilities supporting Indian research across polar and high-altitude environments.</p></div>
        <div className="grid gap-4 md:grid-cols-2">
          {stations.map((station) => <article key={station.name} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-wider text-[#3982a8]">{station.region}</p><h3 className="mt-1 text-lg font-bold text-[#143b5e]">{station.name}</h3></div><span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-[#245b7c]">Established {station.established}</span></div>
            <p className="mt-3 flex items-start gap-2 text-sm text-slate-600"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#3982a8]" />{station.location}</p>
            <p className="mt-1 pl-6 text-xs text-slate-500">{station.coordinates}</p>
            <p className="mt-3 border-t border-slate-100 pt-3 text-sm leading-6 text-slate-600">{station.summary}</p>
          </article>)}
        </div>
      </section>

      <section className="mt-10" aria-labelledby="fleet-heading">
        <div className="mb-5"><h2 id="fleet-heading" className="text-2xl font-bold text-[#143b5e]">Research vessels</h2><p className="mt-1 text-sm text-slate-600">Vessel platforms support oceanographic field research and surveys.</p></div>
        <div className="grid gap-4 sm:grid-cols-2">{vessels.map((vessel) => <article key={vessel.name} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#3982a8]"><Anchor className="h-4 w-4" />{vessel.role}</p><h3 className="mt-2 text-lg font-bold text-[#143b5e]">{vessel.name}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{vessel.summary}</p></article>)}</div>
      </section>

      <section className="mt-10 rounded-xl border border-slate-200 bg-white p-5 shadow-sm" aria-labelledby="official-links-heading">
        <h2 id="official-links-heading" className="text-lg font-bold text-[#143b5e]">Official institutional links</h2>
        <div className="mt-4 flex flex-wrap gap-x-6 gap-y-3 text-sm font-semibold">
          {[{ label: "NCPOR", href: "https://ncpor.res.in/" }, { label: "Ministry of Earth Sciences", href: "https://moes.gov.in/" }, { label: "Scientific Committee on Antarctic Research", href: "https://www.scar.org/" }, { label: "International Arctic Science Committee", href: "https://iasc.info/" }].map((item) => <Link key={item.href} href={item.href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-[#12679a] hover:underline">{item.label}<ArrowUpRight className="h-3.5 w-3.5" /></Link>)}
        </div>
      </section>
    </SectionPage>
  );
}
