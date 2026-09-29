import Link from "next/link";
import { Clock3, Mail, MapPin, Phone } from "lucide-react";
import SectionPage from "@/components/SectionPage";

export default function ContactPage() {
  return <SectionPage section="About NCPOR" title="Contact NCPOR" intro="Reach the National Centre for Polar and Ocean Research at its headquarters in Goa.">
    <div className="grid gap-5 md:grid-cols-2">
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-start gap-4"><span className="grid h-11 w-11 place-items-center rounded-lg bg-sky-50 text-[#277ba5]"><MapPin className="h-5 w-5" /></span><div><h2 className="text-lg font-bold text-[#143b5e]">Headquarters</h2><p className="mt-2 text-sm leading-6 text-slate-600">National Centre for Polar and Ocean Research<br />Ministry of Earth Sciences, Government of India<br />Headland Sada, Vasco-da-Gama<br />Goa 403 804, India</p><Link href="https://maps.google.com/?q=National+Centre+for+Polar+and+Ocean+Research+Goa" target="_blank" rel="noreferrer" className="mt-3 inline-block text-sm font-semibold text-[#12679a]">View map</Link></div></div>
      </section>
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-[#143b5e]">General enquiries</h2>
        <div className="mt-4 space-y-4 text-sm text-slate-600">
          <p className="flex items-center gap-3"><Phone className="h-4 w-4 text-[#3282a8]" /><a href="tel:+918322520876" className="hover:text-[#12679a]">+91-832-2520876 / 2525511</a></p>
          <p className="flex items-center gap-3"><Mail className="h-4 w-4 text-[#3282a8]" /><a href="mailto:info@ncpor.res.in" className="hover:text-[#12679a]">info@ncpor.res.in</a></p>
          <p className="flex items-center gap-3"><Mail className="h-4 w-4 text-[#3282a8]" /><a href="mailto:director@ncpor.res.in" className="hover:text-[#12679a]">director@ncpor.res.in</a></p>
          <p className="flex items-center gap-3"><Clock3 className="h-4 w-4 text-[#3282a8]" />After office hours: +91-832-2525600 / 2525601</p>
        </div>
      </section>
    </div>
    <p className="mt-5 text-xs text-slate-500">Contact information is based on the public NCPOR contact page. Please verify before time-sensitive correspondence.</p>
  </SectionPage>;
}
