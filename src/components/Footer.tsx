import Link from "next/link";
import { ArrowUpRight, Mail, MapPin } from "lucide-react";
import { navigationGroups } from "@/lib/site-content";

export default function Footer() {
  return (
    <footer className="bg-[#102f4c] text-white">
      <div className="mx-auto grid max-w-7xl gap-9 px-4 py-10 sm:px-6 md:grid-cols-2 lg:grid-cols-[1.25fr_1fr_1fr_1fr] lg:px-8 lg:py-12">
        <div>
          <div className="flex items-center gap-3"><div className="grid h-11 w-11 place-items-center rounded-full border border-white/50 text-[9px] font-bold">NCPOR</div><div><p className="text-sm font-bold">National Centre for Polar and Ocean Research</p><p className="mt-0.5 text-xs text-sky-100/75">Ministry of Earth Sciences · Government of India</p></div></div>
          <p className="mt-4 max-w-sm text-sm leading-6 text-white/75">Advancing research in the polar regions, the Southern Ocean and the high Himalaya.</p>
          <p className="mt-4 flex items-start gap-2 text-xs leading-5 text-white/70"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-sky-200" />Headland Sada, Vasco-da-Gama, Goa 403 804, India</p>
          <a href="mailto:info@ncpor.res.in" className="mt-2 inline-flex items-center gap-2 text-xs text-sky-100 hover:underline"><Mail className="h-3.5 w-3.5" />info@ncpor.res.in</a>
        </div>
        {navigationGroups.slice(0, 3).map((group) => <div key={group.label}><h2 className="text-xs font-bold uppercase tracking-[0.13em] text-sky-100">{group.label}</h2><ul className="mt-4 space-y-2">{group.links.slice(0, 6).map((item) => <li key={item.href}><Link href={item.href} className="text-sm text-white/75 hover:text-white hover:underline">{item.label}</Link></li>)}</ul></div>)}
      </div>
      <div className="border-t border-white/15">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-4 text-xs text-white/70 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
          <p>© National Centre for Polar and Ocean Research · Ministry of Earth Sciences, Government of India</p>
          <nav aria-label="Policies and help" className="flex flex-wrap gap-x-4 gap-y-2"><Link href="/institution/disclaimer" className="hover:text-white">Disclaimer</Link><Link href="/institution/copyright" className="hover:text-white">Copyright policy</Link><Link href="/accessibility" className="hover:text-white">Accessibility</Link><Link href="/sitemap" className="hover:text-white">Sitemap</Link><Link href="/rss.xml" className="inline-flex items-center gap-1 hover:text-white">RSS feed <ArrowUpRight className="h-3 w-3" /></Link></nav>
        </div>
      </div>
    </footer>
  );
}
