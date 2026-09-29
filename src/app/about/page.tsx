import Link from "next/link";
import {
  Compass,
  ShieldCheck,
  Globe,
  Radio,
  ExternalLink,
  Award,
  Navigation,
  Anchor,
  Layers,
  Thermometer,
} from "lucide-react";

export default function AboutPage() {
  const stations = [
    {
      name: "Maitri Station",
      realm: "Antarctica",
      established: "1989 (Operating 35+ years)",
      coords: "70°45'58\"S, 11°44'09\"E",
      location: "Schirmacher Oasis, Queen Maud Land",
      elevation: "117 m above sea level",
      focus: "Atmospheric electricity, meteorology, geomagnetism, seismology, human biology under isolated confinement, lake limnology.",
      status: "Active Permanent All-Year Overwintering",
    },
    {
      name: "Bharati Station",
      realm: "Antarctica",
      established: "2012 (State-of-the-Art Green Facility)",
      coords: "69°24'28\"S, 76°11'14\"E",
      location: "Larsemann Hills, East Antarctica",
      elevation: "35 m above sea level",
      focus: "Near-real-time satellite oceanography data acquisition (ISRO ground station), space weather, glaciology, coastal oceanography.",
      status: "Active Permanent All-Year Overwintering",
    },
    {
      name: "Himadri Station",
      realm: "Arctic Realm",
      established: "2008",
      coords: "78°55'N, 11°56'E",
      location: "Ny-Ålesund, Spitsbergen, Svalbard (Norway)",
      elevation: "Coastal Fjord (Kongsfjorden)",
      focus: "Arctic warming amplification, atmospheric aerosol optical depth, microbial biodiversity in sub-zero snow, fjord hydrography.",
      status: "Active Multi-Season Polar Research",
    },
    {
      name: "Himansh Station",
      realm: "High Himalayas (Third Pole)",
      established: "2016",
      coords: "32°24'N, 77°37'E",
      location: "Chandra Basin, Spiti Valley, Himachal Pradesh",
      elevation: "4,080 m above sea level",
      focus: "Himalayan glacier mass balance (Sutri Dhaka benchmark glacier), permafrost retreat, hydrological discharge models for downstream security.",
      status: "Active High-Altitude Alpine Station",
    },
    {
      name: "Dakshin Gangotri Memorial",
      realm: "Antarctica",
      established: "1983 (India's First Antarctic Base)",
      coords: "70°05'S, 12°00'E",
      location: "Ice Shelf of Queen Maud Land",
      elevation: "Ice Shelf",
      focus: "Decommissioned in 1990; currently designated as a historic site under Antarctic Treaty Annex V.",
      status: "Historic Monument & Memorial Site",
    },
  ];

  const fleet = [
    {
      name: "ORV Sagar Kanya",
      role: "Oceanographic Research Vessel",
      features: "Equipped for deep-sea CTD hydrography, multibeam bathymetry, atmospheric radiometer sounding across the Southern Ocean.",
    },
    {
      name: "ORV Sagar Nidhi",
      role: "Ice-Class Ocean Research Vessel",
      features: "Dynamic positioning system, capability to navigate in sub-polar icy waters, ROV handling systems.",
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-12">
      {/* Intro */}
      <div className="max-w-3xl space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-950/80 border border-sky-800 text-sky-300 text-xs font-mono">
          <Globe className="w-3.5 h-3.5" />
          GOVERNMENT OF INDIA • MINISTRY OF EARTH SCIENCES
        </div>
        <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight">
          National Centre for Polar and Ocean Research (NCPOR)
        </h1>
        <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
          NCPOR is India&apos;s premier autonomous R&amp;D institution responsible for spearheading the nation&apos;s polar expeditions across Antarctica, the Arctic, the Southern Ocean, and the High Himalayas (Third Pole).
        </p>
      </div>

      {/* Mandate & Treaty Compliance */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="polar-card rounded-2xl p-6 space-y-3 border-t-4 border-t-sky-500">
          <span className="font-mono text-xs text-sky-400 uppercase tracking-wider">01. Scientific Excellence</span>
          <h3 className="text-base font-bold text-white">Cryospheric & Planetary Research</h3>
          <p className="text-xs text-slate-300 leading-relaxed">
            Conducting continuous observations on global teleconnections between polar ice sheet dynamics and the Indian Summer Monsoon.
          </p>
        </div>

        <div className="polar-card rounded-2xl p-6 space-y-3 border-t-4 border-t-teal-500">
          <span className="font-mono text-xs text-teal-400 uppercase tracking-wider">02. Treaty Governance</span>
          <h3 className="text-base font-bold text-white">Antarctic Treaty & CEP Protocols</h3>
          <p className="text-xs text-slate-300 leading-relaxed">
            India is a Consultative Party to the Antarctic Treaty (1959) and strictly adheres to the Protocol on Environmental Protection (Madrid Protocol, Annex III).
          </p>
        </div>

        <div className="polar-card rounded-2xl p-6 space-y-3 border-t-4 border-t-indigo-500">
          <span className="font-mono text-xs text-indigo-400 uppercase tracking-wider">03. Open Science & Outreach</span>
          <h3 className="text-base font-bold text-white">FAIR Scientific Data Principles</h3>
          <p className="text-xs text-slate-300 leading-relaxed">
            All expedition technical reports, limnology datasets, and CTD transects are archived and disseminated openly for citizen science and academic study.
          </p>
        </div>
      </div>

      {/* Stations Breakdown */}
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">
            India&apos;s Polar Stations Network
          </h2>
          <p className="text-xs text-slate-400">
            Year-round operational bases situated across extreme latitudes.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {stations.map((s, idx) => (
            <div key={idx} className="polar-card rounded-2xl p-6 space-y-3">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-sky-400 font-bold uppercase">{s.realm}</span>
                <span className="text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800">
                  {s.status}
                </span>
              </div>

              <h3 className="text-lg font-bold text-white">{s.name}</h3>

              <div className="space-y-1 text-xs font-mono text-slate-400">
                <div>📍 {s.location}</div>
                <div>🌐 {s.coords} • Elev: {s.elevation}</div>
                <div>📅 {s.established}</div>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed pt-2 border-t border-[#142334]">
                {s.focus}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Fleet */}
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">
            Polar Ocean Research Fleet
          </h2>
          <p className="text-xs text-slate-400">
            Dedicated multi-purpose research vessels conducting Southern Ocean and polar cruises.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {fleet.map((v, idx) => (
            <div key={idx} className="polar-card rounded-2xl p-6 space-y-2">
              <div className="flex items-center gap-2 text-xs font-mono text-teal-400">
                <Anchor className="w-4 h-4" />
                <span>{v.role}</span>
              </div>
              <h3 className="text-lg font-bold text-white">{v.name}</h3>
              <p className="text-xs text-slate-300 leading-relaxed">{v.features}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Official Links */}
      <div className="border border-[#142334] bg-[#07111e] rounded-2xl p-6 space-y-4">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
          Official Institutional Links & Portals
        </h3>
        <div className="flex flex-wrap gap-4 text-xs font-mono">
          <a
            href="https://ncpor.res.in"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 text-sky-400 hover:underline"
          >
            NCPOR Official Portal <ExternalLink className="w-3 h-3" />
          </a>
          <a
            href="https://moes.gov.in"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 text-sky-400 hover:underline"
          >
            Ministry of Earth Sciences (MoES) <ExternalLink className="w-3 h-3" />
          </a>
          <a
            href="https://www.scar.org"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 text-sky-400 hover:underline"
          >
            SCAR (Scientific Committee on Antarctic Research) <ExternalLink className="w-3 h-3" />
          </a>
          <a
            href="https://iasc.info"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 text-sky-400 hover:underline"
          >
            IASC (International Arctic Science Committee) <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </div>
  );
}
