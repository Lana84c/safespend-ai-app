import Link from "next/link";
import LegalFooter from "@/components/LegalFooter";

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-[#f4f8fb] text-[#061b3d]">
      <section className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
        <Link href="/" className="text-sm font-black text-cyan-700">
          ← Back to SafeSpend AI
        </Link>

        <div className="mt-6 rounded-[2rem] bg-white p-8 shadow-xl">
          <h1 className="text-4xl font-black tracking-[-0.05em]">
            Privacy Policy
          </h1>

          <p className="mt-4 text-sm leading-7 text-slate-600">
            SafeSpend AI collects information users provide, including account
            details, transactions, budgets, bills, settings, and usage activity,
            to operate the budgeting and spending coach features.
          </p>

          <p className="mt-4 text-sm leading-7 text-slate-600">
            We use this information to provide spending insights, coaching,
            reports, billing access, and account support. We do not sell personal
            financial data.
          </p>

          <p className="mt-4 text-sm leading-7 text-slate-600">
            Users may request data deletion by visiting the Data Deletion page.
            This policy may be updated as SafeSpend AI develops.
          </p>

          <p className="mt-6 text-xs font-bold text-slate-400">
            Last updated: April 2026
          </p>
        </div>
      </section>

      <LegalFooter />
    </main>
  );
}