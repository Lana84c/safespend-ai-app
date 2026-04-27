import Link from "next/link";
import LegalFooter from "@/components/LegalFooter";

export default function DisclaimerPage() {
  return (
    <main className="min-h-screen bg-[#f4f8fb] text-[#061b3d]">
      <section className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
        <Link href="/" className="text-sm font-black text-cyan-700">
          ← Back to SafeSpend AI
        </Link>

        <div className="mt-6 rounded-[2rem] bg-white p-8 shadow-xl">
          <h1 className="text-4xl font-black tracking-[-0.05em]">
            Disclaimer
          </h1>

          <p className="mt-4 text-sm leading-7 text-slate-600">
            SafeSpend AI is designed for budgeting, spending awareness, and
            personal money organization.
          </p>

          <p className="mt-4 text-sm leading-7 text-slate-600">
            SafeSpend AI is not a bank, financial advisor, credit counselor,
            accountant, tax advisor, attorney, or investment advisor.
          </p>

          <p className="mt-4 text-sm leading-7 text-slate-600">
            Any coaching, reports, insights, or recommendations are informational
            only. Users should make financial decisions based on their own
            judgment and consult qualified professionals when needed.
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