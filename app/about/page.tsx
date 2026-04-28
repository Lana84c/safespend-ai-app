import Link from "next/link";
import PublicShell from "@/components/PublicShell";

export default function AboutPage() {
  return (
    <PublicShell>
      <section className="mb-8 rounded-[2.25rem] bg-gradient-to-br from-[#0637b8] via-[#0072b8] to-[#00a878] p-8 text-white shadow-2xl md:p-12">
        <p className="mb-4 inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-bold">
          About SafeSpend AI
        </p>

        <h1 className="max-w-4xl text-5xl font-black leading-[0.95] tracking-[-0.055em] md:text-7xl">
          Helping people know what they can spend before they spend it.
        </h1>

        <p className="mt-6 max-w-3xl text-lg leading-8 text-white/82">
          SafeSpend AI is a spending-awareness tool designed to help everyday
          people track income, expenses, bills, budgets, and safe-to-spend
          decisions in one simple place.
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/signup"
            className="inline-flex items-center justify-center rounded-full bg-white px-7 py-4 text-base font-black text-[#061b3d] shadow-xl transition hover:-translate-y-0.5 hover:shadow-2xl"
          >
            Start Free →
          </Link>

          <Link
            href="/blog"
            className="inline-flex items-center justify-center rounded-full border border-white/25 bg-white/10 px-7 py-4 text-base font-black text-white backdrop-blur transition hover:-translate-y-0.5 hover:bg-white/15"
          >
            Read Money Tips
          </Link>
        </div>
      </section>

      {/* Keep the rest of the About page content here */}
    </PublicShell>
  );
}