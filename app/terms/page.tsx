import Link from "next/link";
import LegalFooter from "@/components/LegalFooter";

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-[#f4f8fb] text-[#061b3d]">
      <section className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
        <Link href="/" className="text-sm font-black text-cyan-700">
          ← Back to SafeSpend AI
        </Link>

        <div className="mt-6 rounded-[2rem] bg-white p-8 shadow-xl">
          <h1 className="text-4xl font-black tracking-[-0.05em]">
            Terms of Service
          </h1>

          <p className="mt-4 text-sm leading-7 text-slate-600">
            By using SafeSpend AI, users agree to use the platform for personal
            budgeting, spending awareness, and organization purposes only.
          </p>

          <p className="mt-4 text-sm leading-7 text-slate-600">
            SafeSpend AI does not provide financial, legal, tax, investment,
            credit, banking, or accounting advice. Users remain responsible for
            their own financial decisions.
          </p>

          <p className="mt-4 text-sm leading-7 text-slate-600">
            Subscription features may vary by plan. We may update, modify, or
            discontinue features as the product develops.
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