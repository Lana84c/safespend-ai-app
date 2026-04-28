import Link from "next/link";
import PublicShell from "@/components/PublicShell";

export default function ResourcesPage() {
  return (
    <PublicShell>
      <section className="rounded-[2.25rem] bg-gradient-to-br from-[#0637b8] via-[#0072b8] to-[#00a878] p-8 text-white shadow-2xl md:p-12">
        <p className="mb-4 inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-bold">
          SafeSpend Resources
        </p>

        <h1 className="max-w-4xl text-5xl font-black leading-[0.95] tracking-[-0.055em] md:text-7xl">
          Learn how to manage everyday spending.
        </h1>

        <p className="mt-6 max-w-3xl text-lg leading-8 text-white/80">
          Helpful resources for paycheck budgeting, spending awareness, bills,
          and financial clarity.
        </p>
      </section>

      <section className="mt-8 grid gap-5 md:grid-cols-3">
        <ResourceCard
          title="Paycheck Budgeting"
          description="Learn how to plan around the money you actually receive."
          href="/blog/paycheck-budgeting-for-beginners"
        />

        <ResourceCard
          title="Safe-to-Spend Basics"
          description="Understand why your bank balance is not the same as your true spending money."
          href="/blog/what-is-safe-to-spend"
        />

        <ResourceCard
          title="Overspending Help"
          description="Learn how to recover when spending gets ahead of your plan."
          href="/blog/how-to-stop-overspending-before-payday"
        />
      </section>
    </PublicShell>
  );
}

function ResourceCard({
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
      <p className="mt-5 text-sm font-black text-cyan-700">Read more →</p>
    </Link>
  );
}