import Link from "next/link";
import { Compass, ShieldCheck, Globe, Database, FileText, ExternalLink } from "lucide-react";

export default function Footer() {
  return (
    <footer className="border-t border-[#18293d] bg-[#040911] text-slate-400 text-sm mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          {/* Institutional Info */}
          <div className="space-y-3 md:col-span-1">
            <div className="flex items-center gap-2 text-white font-bold text-base tracking-tight">
              <span>POLAR PORTAL</span>
              <span className="text-[10px] font-mono bg-sky-950 text-sky-400 px-1.5 py-0.5 rounded border border-sky-800">
                MoES
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              National Centre for Polar and Ocean Research (NCPOR), Ministry of Earth Sciences, Government of India.
              Headquartered at Headland Sada, Vasco-da-Gama, Goa - 403804.
            </p>
            <div className="pt-2 flex items-center gap-2 text-xs font-mono text-emerald-400">
              <ShieldCheck className="w-4 h-4" />
              <span>Antarctic Treaty CEP Annex III Compliant</span>
            </div>
          </div>

          {/* Expeditions & Stations */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-300 font-mono mb-3">
              Research Stations
            </h4>
            <ul className="space-y-2 text-xs">
              <li className="flex justify-between">
                <span className="text-slate-300">Maitri (Antarctica)</span>
                <span className="font-mono text-slate-300">Est. 1989</span>
              </li>
              <li className="flex justify-between">
                <span className="text-slate-300">Bharati (Antarctica)</span>
                <span className="font-mono text-slate-300">Est. 2012</span>
              </li>
              <li className="flex justify-between">
                <span className="text-slate-300">Himadri (Arctic Svalbard)</span>
                <span className="font-mono text-slate-300">Est. 2008</span>
              </li>
              <li className="flex justify-between">
                <span className="text-slate-300">Himansh (Spiti Himalaya)</span>
                <span className="font-mono text-slate-300">Est. 2016</span>
              </li>
              <li className="flex justify-between">
                <span className="text-slate-300">Dakshin Gangotri Memorial</span>
                <span className="font-mono text-slate-300">Est. 1983</span>
              </li>
            </ul>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-300 font-mono mb-3">
              Knowledge Repository
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/explore?type=report" className="hover:text-sky-300 transition-colors">
                  Winterover Technical Reports
                </Link>
              </li>
              <li>
                <Link href="/explore?type=dataset" className="hover:text-sky-300 transition-colors">
                  Fjord CTD & Limnology Datasets
                </Link>
              </li>
              <li>
                <Link href="/explore?type=publication" className="hover:text-sky-300 transition-colors">
                  Peer-Reviewed Polar Publications
                </Link>
              </li>
              <li>
                <Link href="/explore?type=photo" className="hover:text-sky-300 transition-colors">
                  CLIP Semantic Image Archive
                </Link>
              </li>
              <li>
                <Link href="/stories" className="hover:text-sky-300 transition-colors">
                  Grounded Outreach Stories
                </Link>
              </li>
            </ul>
          </div>

          {/* System Transparency */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-300 font-mono mb-3">
              System Architecture
            </h4>
            <p className="text-xs text-slate-400 mb-3 leading-relaxed">
              FastAPI Modular Monolith with strict Pydantic contracts, hybrid ranking (BM25 + 384d vector + recency), and grounded generation with verbatim citation validation.
            </p>
            <div className="flex flex-wrap gap-1.5 font-mono text-[10px]">
              <span className="bg-[#0b1726] border border-[#1b3149] px-2 py-0.5 rounded text-sky-300">
                FastAPI
              </span>
              <span className="bg-[#0b1726] border border-[#1b3149] px-2 py-0.5 rounded text-teal-300">
                Next.js Mobile-First
              </span>
              <span className="bg-[#0b1726] border border-[#1b3149] px-2 py-0.5 rounded text-indigo-300">
                C1..Cn Grounding
              </span>
            </div>
          </div>
        </div>

        <div className="pt-8 border-t border-[#142334] flex flex-col sm:flex-row items-center justify-between text-xs text-slate-300 gap-4">
          <p>© 2024 National Centre for Polar and Ocean Research, Ministry of Earth Sciences, Govt. of India.</p>
          <div className="flex items-center gap-6">
            <Link href="/about" className="hover:text-slate-300">Scientific Disclaimer</Link>
            <Link href="/about" className="hover:text-slate-300">Open Access License</Link>
            <Link href="/about" className="hover:text-slate-300">Contact NCPOR Goa</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
