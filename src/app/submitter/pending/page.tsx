import Link from "next/link";
import { Clock } from "lucide-react";

export default function PendingApprovalPage() {
  return (
    <section className="grid min-h-[70vh] place-items-center bg-[#f3f7fa] px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-7 shadow-sm sm:p-9 text-center">
        <div className="mx-auto mb-7 grid h-12 w-12 place-items-center rounded-xl bg-amber-100 text-amber-700">
          <Clock className="h-6 w-6" />
        </div>
        <h1 className="mt-2 text-2xl font-bold text-[#143b5e]">Pending Approval</h1>
        <p className="mt-4 text-sm leading-6 text-slate-600">
          Your submitter account has been successfully verified, but requires administrator approval before you can upload or manage datasets.
        </p>
        <p className="mt-4 text-sm leading-6 text-slate-600">
          You will receive an email once your account is approved.
        </p>
        <div className="mt-8">
          <Link href="/" className="inline-block text-sm font-semibold text-[#12679a] hover:underline">
            Return to public site
          </Link>
        </div>
      </div>
    </section>
  );
}
