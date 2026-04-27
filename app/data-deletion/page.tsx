import Link from "next/link";
import LegalFooter from "@/components/LegalFooter";

export default function DataDeletionPage() {
  return (
    <main className="min-h-screen bg-[#f4f8fb] text-[#061b3d]">
      <section className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
        <Link href="/" className="text-sm font-black text-cyan-700">
          ← Back to SafeSpend AI
        </Link>

        <div className="mt-6 rounded-[2rem] bg-white p-8 shadow-xl">
          <h1 className="text-4xl font-black tracking-[-0.05em]">
            Data Deletion Request
          </h1>

          <p className="mt-4 text-sm leading-7 text-slate-600">
            Users may request deletion of their SafeSpend AI account data,
            including transaction records, budgets, bills, settings, and usage
            history.
          </p>

          <p className="mt-4 text-sm leading-7 text-slate-600">
            To request deletion, email us from the email address associated with
            your SafeSpend AI account and include “Data Deletion Request” in the
            subject line.
          </p>

          <div className="mt-6 rounded-2xl bg-slate-50 p-5">
            <p className="text-sm font-black text-[#061b3d]">
              Contact:
            </p>
            <p className="mt-1 text-sm font-bold text-slate-600">
              support@safespend.ai
            </p>
          </div>

          <p className="mt-6 text-xs font-bold text-slate-400">
            Last updated: April 2026
          </p>
        </div>
      </section>

      <LegalFooter />
    </main>
  );
}