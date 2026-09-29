import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Compass, FileText, MapPin } from "lucide-react";
import SectionPage from "@/components/SectionPage";
import { expeditions } from "@/lib/site-content";

export function generateStaticParams() { return expeditions.map(({ slug }) => ({ region: slug })); }

export default async function ExpeditionPage({ params }: { params: Promise<{ region: string }> }) {
  const { region } = await params;
  const expedition = expeditions.find((item) => item.slug === region);
  if (!expedition) notFound();
  return (
    <div className="bg-[#f5f8fb] text-slate-800">
      <div className="relative min-h-[360px] overflow-hidden bg-[#143b5e] sm:min-h-[440px]">
        <div className="absolute inset-0 bg-cover bg-center opacity-45" style={{ backgroundImage: `url('${expedition.image}')` }} />
        <div className="absolute inset-0 bg-gradient-to-r from-[#102e49]/95 via-[#143b5e]/75 to-transparent" />
        <div className="relative mx-auto flex min-h-[360px] max-w-7xl items-end px-4 pb-10 pt-12 sm:min-h-[440px] sm:px-6 sm:pb-14 lg:px-8">
          <div className="max-w-2xl text-white">
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-sky-200">{expedition.kicker}</p>
            <h1 className="mt-3 text-4xl font-bold sm:text-6xl">{expedition.title}</h1>
            <p className="mt-4 text-base leading-7 text-white/90">{expedition.description}</p>
          </div>
        </div>
      </div>
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[1fr_300px] lg:px-8 lg:py-14">
        <section>
          <div className="flex items-center gap-2 text-xs text-slate-500"><Link href="/" className="hover:text-sky-700">Home</Link><span>/</span><span>Expeditions</span><span>/</span><span>{expedition.title}</span></div>
          <h2 className="mt-5 text-2xl font-bold text-[#143b5e]">Research in {expedition.title}</h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">NCPOR’s expedition programmes bring together scientists, engineers, logistics teams and partner institutions. Field campaigns support observations, sample collection, instrument deployment and long-term monitoring.</p>
          <h3 className="mt-7 text-lg font-bold text-[#143b5e]">Programme highlights</h3>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            {expedition.facts.map((fact) => <div key={fact} className="rounded-lg border border-slate-200 bg-white p-4 text-sm font-semibold text-slate-700"><Compass className="mb-3 h-5 w-5 text-[#3282a8]" />{fact}</div>)}
          </div>
          <Link href={`/explore?expedition=${encodeURIComponent(expedition.title)}`} className="mt-7 inline-flex items-center gap-2 rounded-md bg-[#12679a] px-4 py-3 text-sm font-semibold text-white hover:bg-[#0d527d]"><FileText className="h-4 w-4" />Search expedition records<ArrowRight className="h-4 w-4" /></Link>
        </section>
        <aside className="h-fit rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="font-bold text-[#143b5e]">Explore expeditions</h2>
          <ul className="mt-3 space-y-1">{expeditions.map((item) => <li key={item.slug}><Link href={`/expeditions/${item.slug}`} className={`flex items-center gap-2 rounded px-3 py-2.5 text-sm ${item.slug === region ? "bg-sky-50 font-semibold text-[#12679a]" : "text-slate-600 hover:bg-slate-50"}`}><MapPin className="h-4 w-4" />{item.title}</Link></li>)}</ul>
        </aside>
      </div>
    </div>
  );
}
