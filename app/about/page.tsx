import Link from "next/link";

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-[#eefbff] via-white to-[#f7fbfd] px-6 py-8 text-[#102033]">
      <section className="mx-auto max-w-6xl">
        <SiteHeader />

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

        <section className="mb-8 grid gap-6 lg:grid-cols-[.95fr_1.05fr]">
          <div className="rounded-[2rem] border border-slate-200 bg-white p-7 shadow-xl">
            <p className="mb-3 inline-flex rounded-full bg-cyan-50 px-4 py-2 text-xs font-black uppercase tracking-widest text-cyan-700">
              Why it exists
            </p>

            <h2 className="text-3xl font-black tracking-[-0.04em] text-[#061b3d]">
              Most people do not overspend because they are careless.
            </h2>

            <p className="mt-4 leading-7 text-slate-600">
              They overspend because their bank balance does not show the full
              picture. Bills may be coming up. Groceries may still need to be
              bought. Gas, debt payments, subscriptions, and emergency buffers
              may already be spoken for.
            </p>

            <p className="mt-4 leading-7 text-slate-600">
              SafeSpend AI was built to make that picture easier to understand.
              Instead of only asking, “How much is in my account?” SafeSpend
              helps users ask, “What can I safely spend today?”
            </p>
          </div>

          <div className="rounded-[2rem] border border-slate-200 bg-white p-7 shadow-xl">
            <h2 className="text-3xl font-black tracking-[-0.04em] text-[#061b3d]">
              What SafeSpend helps with
            </h2>

            <div className="mt-5 grid gap-3">
              <BenefitRow text="Track income, expenses, bills, budgets, savings, and debt payments." />
              <BenefitRow text="Check whether a purchase fits before spending money." />
              <BenefitRow text="See category pressure before a budget is blown." />
              <BenefitRow text="Use reports and exports to understand spending patterns." />
              <BenefitRow text="Get AI-powered guidance for everyday spending decisions." />
            </div>
          </div>
        </section>

        <section className="mb-8 rounded-[2rem] border border-slate-200 bg-white p-7 shadow-xl">
          <p className="mb-3 inline-flex rounded-full bg-green-50 px-4 py-2 text-xs font-black uppercase tracking-widest text-green-700">
            Our approach
          </p>

          <h2 className="text-3xl font-black tracking-[-0.04em] text-[#061b3d]">
            Financial clarity without shame.
          </h2>

          <p className="mt-4 max-w-4xl leading-7 text-slate-600">
            SafeSpend is designed to be practical, clear, and supportive. It is
            not built to shame users for spending money. It is built to help
            users understand the impact of each decision, protect important
            obligations, and recover faster when spending gets off track.
          </p>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <ValueCard
              title="Clarity"
              description="Show the money picture in plain language, not confusing financial jargon."
            />

            <ValueCard
              title="Control"
              description="Help users pause before risky purchases and make better spending choices."
            />

            <ValueCard
              title="Confidence"
              description="Give users a calmer way to manage paycheck spending and everyday decisions."
            />
          </div>
        </section>

        <section className="rounded-[2rem] bg-gradient-to-br from-[#061b3d] via-[#0b4edb] to-[#00b7c7] p-8 text-center text-white shadow-2xl">
          <h2 className="text-4xl font-black tracking-[-0.05em]">
            Start with your safe-to-spend number.
          </h2>

          <p className="mx-auto mt-4 max-w-2xl text-white/80">
            Create a free account, add your first income or expense, and begin
            seeing how your money decisions affect your available spending.
          </p>

          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              href="/signup"
              className="inline-flex items-center justify-center rounded-full bg-white px-7 py-4 font-black text-[#061b3d] shadow-xl transition hover:-translate-y-0.5 hover:shadow-2xl"
            >
              Start Free →
            </Link>

            <Link
              href="/contact"
              className="inline-flex items-center justify-center rounded-full border border-white/25 bg-white/10 px-7 py-4 font-black text-white transition hover:-translate-y-0.5 hover:bg-white/15"
            >
              Contact Us
            </Link>
          </div>
        </section>

        <SiteFooter />
      </section>
    </main>
  );
}

function SiteHeader() {
  return (
    <header className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <Link href="/" className="flex items-center gap-4">
        <img
          src="/safespend-logo.png"
          alt="SafeSpend AI logo"
          className="h-14 w-14 rounded-2xl shadow-lg"
        />

        <div>
          <h1 className="text-2xl font-black text-[#061b3d]">
            SafeSpend AI
          </h1>
          <p className="text-sm text-slate-500">
            Know what you can spend before you spend it.
          </p>
        </div>
      </Link>

      <nav className="flex flex-wrap gap-3">
        <Link
          href="/"
          className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-black text-[#061b3d] shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
        >
          Home
        </Link>

        <Link
          href="/blog"
          className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-black text-[#061b3d] shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
        >
          Blog
        </Link>

        <Link
          href="/login"
          className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-black text-[#061b3d] shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
        >
          Log In
        </Link>

        <Link
          href="/signup"
          className="rounded-full bg-gradient-to-r from-[#0b4edb] via-[#00b7c7] to-[#5ce05c] px-5 py-3 text-sm font-black text-white shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl"
        >
          Start Free
        </Link>
      </nav>
    </header>
  );
}

function BenefitRow({ text }: { text: string }) {
  return (
    <div className="flex gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4">
      <div className="mt-1 h-5 w-5 rounded-full bg-gradient-to-r from-[#0b4edb] via-[#00b7c7] to-[#5ce05c]" />
      <p className="text-sm font-bold leading-6 text-slate-700">{text}</p>
    </div>
  );
}

function ValueCard({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-3xl border border-slate-100 bg-slate-50 p-5">
      <h3 className="text-xl font-black text-[#061b3d]">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
    </div>
  );
}

function SiteFooter() {
  return (
    <footer className="mt-8 text-center text-sm text-slate-500">
      <p>
        SafeSpend AI is a spending-awareness tool, not financial, legal, tax, or
        investment advice.
      </p>

      <div className="mt-3 flex flex-wrap justify-center gap-4">
        <Link href="/about" className="font-bold text-[#061b3d]">
          About
        </Link>

        <Link href="/contact" className="font-bold text-[#061b3d]">
          Contact
        </Link>

        <Link href="/privacy" className="font-bold text-[#061b3d]">
          Privacy Policy
        </Link>

        <Link href="/terms" className="font-bold text-[#061b3d]">
          Terms
        </Link>

        <Link href="/disclaimer" className="font-bold text-[#061b3d]">
          Disclaimer
        </Link>

        <Link href="/blog" className="font-bold text-[#061b3d]">
          Blog
        </Link>
      </div>
    </footer>
  );
}