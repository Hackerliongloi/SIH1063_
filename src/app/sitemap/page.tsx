import Link from "next/link";
import { ExternalLink, Map } from "lucide-react";
import SectionPage from "@/components/SectionPage";
import { navigationGroups } from "@/lib/site-content";

const portalLinks = [
  { label: "Home", href: "/" }, { label: "News & updates", href: "/news" },
  { label: "Tenders", href: "/tenders" }, { label: "Careers", href: "/careers" },
  { label: "Photo gallery", href: "/gallery" }, { label: "Discover", href: "/discover" },
  { label: "Science stories", href: "/stories" }, { label: "Research archive", href: "/explore" },
  { label: "Data centre", href: "/data-centre" }, { label: "Accessibility", href: "/accessibility" },
  { label: "Contact", href: "/contact" }, { label: "RSS feed", href: "/rss.xml" },
];

export default function SitemapPage() {
  return <SectionPage section="Website" title="Sitemap" intro="Browse the main sections, programmes, services and information pages available on the NCPOR portal.">
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"><section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="flex items-center gap-2 font-bold text-[#143b5e]"><Map className="h-4 w-4 text-[#3282a8]" />Main pages</h2><ul className="mt-3 space-y-1">{portalLinks.map((item) => <li key={item.href}>{item.href === "/rss.xml" ? <a href={item.href} className="inline-block py-1.5 text-sm text-slate-600 hover:text-[#12679a]">{item.label}</a> : <Link href={item.href} className="inline-block py-1.5 text-sm text-slate-600 hover:text-[#12679a]">{item.label}</Link>}</li>)}</ul></section>{navigationGroups.map((group) => <section key={group.label} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="flex items-center gap-2 font-bold text-[#143b5e]"><Map className="h-4 w-4 text-[#3282a8]" />{group.label}</h2><ul className="mt-3 space-y-1">{group.links.map((item) => <li key={item.href}><Link href={item.href} target={item.external ? "_blank" : undefined} rel={item.external ? "noreferrer" : undefined} className="inline-flex items-center gap-1.5 py-1.5 text-sm text-slate-600 hover:text-[#12679a]">{item.label}{item.external && <ExternalLink className="h-3 w-3" />}</Link></li>)}</ul>
    </section>)}</div>
  </SectionPage>;
}
