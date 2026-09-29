import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowUpRight, FileText } from "lucide-react";
import SectionPage from "@/components/SectionPage";
import { institutionalPages } from "@/lib/site-content";

export function generateStaticParams() {
  return Object.keys(institutionalPages).map((slug) => ({ slug }));
}

export default async function InstitutionalPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = institutionalPages[slug];
  if (!page) notFound();

  return (
    <SectionPage section={page.section} title={page.title} intro={page.intro}>
      <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
        <h2 className="text-lg font-bold text-[#143b5e]">About this section</h2>
        <div className="mt-5 space-y-4">
          {page.details.map((detail) => (
            <p key={detail} className="flex gap-3 text-sm leading-7 text-slate-600">
              <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[#2f84ad]" />{detail}
            </p>
          ))}
        </div>
        {page.links?.length ? (
          <div className="mt-8 border-t border-slate-100 pt-5">
            <h3 className="text-sm font-bold text-[#143b5e]">Related links and resources</h3>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {page.links.map((item) => (
                <Link key={item.href} href={item.href} target={item.external ? "_blank" : undefined} rel={item.external ? "noreferrer" : undefined} className="flex items-center justify-between rounded-lg border border-slate-200 px-4 py-3 text-sm font-medium text-[#245b7c] hover:border-sky-300 hover:bg-sky-50">
                  <span className="flex items-center gap-2"><FileText className="h-4 w-4" />{item.label}</span>
                  {item.external && <ArrowUpRight className="h-4 w-4" />}
                </Link>
              ))}
            </div>
          </div>
        ) : null}
        <p className="mt-8 rounded-lg bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-900">
          Official notices, names and downloadable documents should be verified against the latest NCPOR publication before use.
        </p>
      </article>
    </SectionPage>
  );
}
