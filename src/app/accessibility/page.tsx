import Link from "next/link";
import { Accessibility, Keyboard, Type } from "lucide-react";
import SectionPage from "@/components/SectionPage";

export default function AccessibilityPage() {
  return <SectionPage section="Website" title="Accessibility" intro="NCPOR aims to make its website and research information usable by people with diverse abilities and access needs.">
    <div className="grid gap-4 md:grid-cols-3">{[{ title: "Keyboard access", text: "Navigate menus and page content using a keyboard. Use the skip link at the top of each page to reach the main content.", icon: Keyboard }, { title: "Readable text", text: "Use the A− and A+ controls in the utility bar to adjust text size.", icon: Type }, { title: "Contrast options", text: "The high-contrast control in the utility bar increases visual contrast across the site.", icon: Accessibility }].map(({ title, text, icon: Icon }) => <article key={title} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><Icon className="h-6 w-6 text-[#3282a8]" /><h2 className="mt-3 font-bold text-[#143b5e]">{title}</h2><p className="mt-2 text-sm leading-6 text-slate-600">{text}</p></article>)}</div>
    <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6"><h2 className="font-bold text-[#143b5e]">Feedback and assistance</h2><p className="mt-2 text-sm leading-6 text-slate-600">If you encounter an accessibility barrier, contact the NCPOR web team with the page URL, the issue encountered and the assistive technology or browser being used.</p><Link href="mailto:ictd@ncaor.org" className="mt-4 inline-block text-sm font-semibold text-[#12679a]">Email the website team</Link></div>
  </SectionPage>;
}
