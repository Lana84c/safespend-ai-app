import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-[#eefbff] via-white to-[#f7fbfd] px-6 py-8 text-[#102033]">
      <section className="mx-auto max-w-6xl">
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

        <section className="mb-8 overflow-hidden rounded-[2.25rem] bg-gradient-to-br from-[#0637b8] via-[#0072b8] to-[#00a878] p-8 text-white shadow-2xl md:p-12">
          <div className="grid gap-10 md:grid-cols-[1.15fr_.85fr] md:items-center">
            <div>
              <p className="mb-4 inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-bold">
                AI Spending Coach + Safe-to-Spend Dashboard
              </p>

              <h2 className="max-w-4xl text-5xl font-black leading-[0.92] tracking-[-0.06em] md:text-7xl">
                Stop overspending before it happens.
              </h2>

              <p className="mt-6 max-w-2xl text-lg leading-8 text-white/82">
                SafeSpend AI helps you log income, track purchases, check your
                safe-to-spend amount, watch category pressure, and make smarter
                money decisions before the money disappears.
              </p>

              <div className="mt-8 flex flex-col gap-4">
                <div className="flex flex-col gap-3 sm:flex-row">
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

                <p className="text-sm font-medium text-white/75">
                  No credit card required. Start with free spending tracking and
                  upgrade when you want bills, reports, exports, and advanced
                  SafeSpend guidance.
                </p>
              </div>
            </div>

            <div className="rounded-[2rem] border border-white/20 bg-white/15 p-6 shadow-xl backdrop-blur">
              <p className="text-sm font-black uppercase tracking-widest text-white/70">
                Safe-to-Spend Preview
              </p>

              <div className="mt-5 space-y-4">
                <div className="rounded-3xl bg-white/12 p-5">
                  <p className="text-sm text-white/70">Safe to Spend</p>
                  <p className="mt-2 text-5xl font-black">$240</p>
                  <p className="mt-3 inline-flex rounded-full bg-green-400/20 px-3 py-1 text-sm font-bold text-green-100">
                    On track
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-3xl bg-white/12 p-4">
                    <p className="text-xs font-bold uppercase tracking-widest text-white/60">
                      Income
                    </p>
                    <p className="mt-2 text-2xl font-black">$1,200</p>
                  </div>

                  <div className="rounded-3xl bg-white/12 p-4">
                    <p className="text-xs font-bold uppercase tracking-widest text-white/60">
                      Spent
                    </p>
                    <p className="mt-2 text-2xl font-black">$960</p>
                  </div>
                </div>

                <div className="rounded-3xl bg-white/12 p-4">
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span className="font-bold text-white/80">Groceries</span>
                    <span className="font-bold text-white/70">72%</span>
                  </div>

                  <div className="h-3 overflow-hidden rounded-full bg-white/20">
                    <div className="h-full w-[72%] rounded-full bg-white" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mb-8 grid gap-5 md:grid-cols-3">
          <FeatureCard
            label="1"
            title="Log money activity"
            description="Add income, expenses, debt payments, bills, savings, and everyday purchases in a clean dashboard."
          />

          <FeatureCard
            label="2"
            title="Check before you spend"
            description="Ask SafeSpend whether a purchase fits your current safe-to-spend amount before you buy."
          />

          <FeatureCard
            label="3"
            title="Stay aware"
            description="Track category pressure, bill impact, spending risk, and reports so you can adjust before payday."
          />
        </section>

        <section className="mb-8 grid gap-6 lg:grid-cols-[.9fr_1.1fr]">
          <div className="rounded-[2rem] border border-slate-200 bg-white p-7 shadow-xl">
            <p className="mb-3 inline-flex rounded-full bg-cyan-50 px-4 py-2 text-xs font-black uppercase tracking-widest text-cyan-700">
              Built for real life
            </p>

            <h3 className="text-3xl font-black tracking-[-0.04em] text-[#061b3d]">
              Your bank balance does not tell the whole story.
            </h3>

            <p className="mt-4 leading-7 text-slate-600">
              A bank balance can look fine while bills, groceries, gas, debt,
              and upcoming expenses are already waiting. SafeSpend helps you see
              what is truly flexible before making another purchase.
            </p>

            <div className="mt-6">
              <Link
                href="/signup"
                className="inline-flex rounded-full bg-gradient-to-r from-[#0b4edb] via-[#00b7c7] to-[#5ce05c] px-6 py-3 font-black text-white shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl"
              >
                Try SafeSpend Free
              </Link>
            </div>
          </div>

          <div className="rounded-[2rem] border border-slate-200 bg-white p-7 shadow-xl">
            <h3 className="text-2xl font-black text-[#061b3d]">
              What SafeSpend helps with
            </h3>

            <div className="mt-5 grid gap-3">
              <BenefitRow text="Know what you can safely spend before your next paycheck." />
              <BenefitRow text="Track income, spending, bills, budgets, and debt payments." />
              <BenefitRow text="Spot overspending patterns before they become stressful." />
              <BenefitRow text="Use reports and exports to understand where your money is going." />
              <BenefitRow text="Get AI coaching that explains the impact of each decision." />
            </div>
          </div>
        </section>

        <section className="rounded-[2rem] bg-gradient-to-br from-[#061b3d] via-[#0b4edb] to-[#00b7c7] p-8 text-center text-white shadow-2xl">
          <h3 className="text-4xl font-black tracking-[-0.05em]">
            Start with clarity today.
          </h3>

          <p className="mx-auto mt-4 max-w-2xl text-white/80">
            Create your free account, add your first transaction, and see your
            safe-to-spend number in minutes.
          </p>

          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              href="/signup"
              className="inline-flex items-center justify-center rounded-full bg-white px-7 py-4 font-black text-[#061b3d] shadow-xl transition hover:-translate-y-0.5 hover:shadow-2xl"
            >
              Start Free →
            </Link>

            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-full border border-white/25 bg-white/10 px-7 py-4 font-black text-white transition hover:-translate-y-0.5 hover:bg-white/15"
            >
              I already have an account
            </Link>
          </div>
        </section>

        <footer className="mt-8 text-center text-sm text-slate-500">
          <p>
            SafeSpend AI is a spending-awareness tool, not financial, legal,
            tax, or investment advice.
          </p>

          <div className="mt-3 flex flex-wrap justify-center gap-4">
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
      </section>
    </main>
  );
}

function FeatureCard({
  label,
  title,
  description,
}: {
  label: string;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-r from-[#0b4edb] via-[#00b7c7] to-[#5ce05c] text-lg font-black text-white">
        {label}
      </div>

      <h3 className="text-xl font-black text-[#061b3d]">{title}</h3>

      <p className="mt-3 text-sm leading-6 text-slate-600">{description}</p>
    </div>
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