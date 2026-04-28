import Link from "next/link";
import PublicShell from "@/components/PublicShell";

export default function ToolsPage() {
  return (
    <PublicShell>
      <section className="rounded-[2.25rem] bg-gradient-to-br from-[#0637b8] via-[#0072b8] to-[#00a878] p-8 text-white shadow-2xl md:p-12">
        <p className="mb-4 inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-bold">
          SafeSpend Tools
        </p>

        <h1 className="max-w-4xl text-5xl font-black leading-[0.95] tracking-[-0.055em] md:text-7xl">
          Free tools for smarter spending.
        </h1>

        <p className="mt-6 max-w-3xl text-lg leading-8 text-white/80">
          Simple calculators and resources to help you understand your spending
          before payday.
        </p>
      </section>

      <section className="mt-8 grid gap-5 md:grid-cols-3">
        <ToolCard
          title="Safe-to-Spend Calculator"
          description="Estimate what you can safely spend after income, bills, and essentials."
          href="/signup"
        />

        <ToolCard
          title="Weekly Spending Check"
          description="Review whether your current weekly spending is on track."
          href="/signup"
        />

        <ToolCard
          title="Overspending Recovery Plan"
          description="Create a simple plan after overspending for the week."
          href="/signup"
        />
      </section>
    </PublicShell>
  );
}

function ToolCard({
  title,
  description,
  href,
}: {
  title: string;
  description: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl transition hover:-translate-y-1 hover:shadow-2xl"
    >
      <h2 className="text-2xl font-black text-[#061b3d]">{title}</h2>
      <p className="mt-3 text-sm leading-6 text-slate-600">{description}</p>
      <p className="mt-5 text-sm font-black text-cyan-700">Try it free →</p>
    </Link>
  );
}