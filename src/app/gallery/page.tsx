"use client";

import { useMemo, useState } from "react";
import SectionPage from "@/components/SectionPage";
import { Images } from "lucide-react";

const photos = [
  { title: "Polar fieldwork", place: "Antarctica", category: "Antarctica", src: "photo-1517299321609-52687d1bc55a" },
  { title: "Research at the ice edge", place: "Southern Ocean", category: "Ocean research", src: "photo-1518837695005-2083093ee35b" },
  { title: "Northern lights", place: "Arctic", category: "Arctic", src: "photo-1531366936337-7c912a4589a7" },
  { title: "Mountain glacier", place: "Himalaya", category: "Himalaya", src: "photo-1464822759023-fed622ff2c3b" },
  { title: "Ice formations", place: "Polar regions", category: "Antarctica", src: "photo-1483347756197-71ef80e95f73" },
  { title: "Ocean expedition", place: "Open ocean", category: "Ocean research", src: "photo-1500375592092-40eb2168fd21" },
];
const filters = ["All photos", "Antarctica", "Arctic", "Himalaya", "Ocean research"];

export default function GalleryPage() {
  const [filter, setFilter] = useState("All photos");
  const visible = useMemo(() => photos.filter((photo) => filter === "All photos" || photo.category === filter), [filter]);
  return <SectionPage section="News & Media" title="Photo gallery" intro="A visual introduction to research environments, expedition work and the polar and ocean regions studied by NCPOR.">
    <div className="mb-5 flex flex-wrap gap-2">{filters.map((item) => <button key={item} onClick={() => setFilter(item)} className={`rounded-full px-4 py-2 text-xs font-semibold ${filter === item ? "bg-[#12679a] text-white" : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-sky-50"}`}>{item}</button>)}</div>
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {visible.map((photo) => <figure key={photo.title} className="group overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div role="img" aria-label={photo.title} className="aspect-[4/3] bg-cover bg-center transition duration-500 group-hover:scale-[1.02]" style={{ backgroundImage: `url(https://images.unsplash.com/${photo.src}?auto=format&fit=crop&w=900&q=80)` }} />
        <figcaption className="flex items-start justify-between gap-2 p-4"><div><p className="font-bold text-[#143b5e]">{photo.title}</p><p className="mt-1 text-xs text-slate-500">{photo.place}</p></div><Images className="h-4 w-4 shrink-0 text-[#3282a8]" /></figcaption>
      </figure>)}
    </div>
    <p className="mt-5 text-xs text-slate-500">Illustrative gallery imagery. Official expedition photographs should be credited to their source and used with permission.</p>
  </SectionPage>;
}
