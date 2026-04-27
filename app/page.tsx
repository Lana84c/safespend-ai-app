import Image from "next/image";
import Link from "next/link";
import LegalFooter from "@/components/LegalFooter";

const features = [
  {
    title: "Track every dollar",
    description:
      "Log income, spending, debt payments, savings, bills, and everyday money activity in one simple place.",
  },
  {
    title: "Know what is safe to spend",
    description:
      "See what is available after bills, budget pressure, and recent spending are considered.",
  },
  {
    title: "Ask before you buy",
    description:
      "Use SafeSpend Coach to check purchases, recover from overspending, and make better money decisions.",
  },
];

const tiers = [
  {
    name: "Free",
    price: "$0",
    description: "Start tracking your spending with basic limits.",
    features: [
      "100 transactions/month",
      "3 budgets max",
      "10 bills tracked",
      "10 coach messages/month",
      "No reports",
      "No exports",
    ],
  },
  {
    name: "Plus",
    price: "$7/mo",
    description: "Unlock the core SafeSpend system.",
    features: [
      "Unlimited transactions",
      "Unlimited budgets",
      "50 bills tracked",
      "Protected safe-to-spend",
      "20 reports/month",
      "100 coach messages/month",
    ],
    highlighted: true,
  },
  {
    name: "Pro",
    price: "$15/mo",
    description: "Get premium reporting, exports, and deeper insights.",
    features: [
      "Everything in Plus",
      "Unlimited bills",
      "Unlimited reports",
      "CSV exports",
      "Advanced insights",
      "Higher AI coaching",
    ],
  },
];

export default function HomePage() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-[#f4f8fb] text-[#061b3d]">
      <section className="relative px-3 py-4 sm:px-6 sm:py-6 lg:px-8">
        <div className="absolute left-1/2 top-0 h-72 w-72 -translate-x-1/2 rounded-full bg-cyan-200/30 blur-3xl sm:h-96 sm:w-96" />
        <div className="absolute right-0 top-40 h-64 w-64 rounded-full bg-green-200/30 blur-3xl sm:h-80 sm:w-80" />

        <div className="relative mx-auto max-w-7xl">
          <header className="mb-6 rounded-[1.5rem] border border-white/70 bg-white/90 p-3 shadow-xl backdrop-blur-xl sm:mb-8 sm:rounded-[2rem] sm:p-4">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <Link href="/" className="flex min-w-0 items-center gap-3 sm:gap-4">
                <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-[1.5rem] bg-white shadow-[0_18px_50px_rgba(0,183,199,0.35)] ring-1 ring-cyan-100 sm:h-24 sm:w-24 md:h-32 md:w-32 md:rounded-[2rem]">
                  <Image
                    src="/safespend-logo.png"
                    alt="SafeSpend AI logo"
                    width={220}
                    height={220}
                    className="h-full w-full scale-150 object-contain"
                    priority
                  />
                </div>

                <div className="min-w-0">
                  <p className="truncate text-xl font-black tracking-[-0.04em] text-[#061b3d] sm:text-2xl">
                    SafeSpend AI
                  </p>
                  <p className="truncate text-sm font-bold text-slate-500">
                    Spending Coach
                  </p>
                </div>
              </Link>

              <div className="grid w-full gap-3 sm:flex sm:w-auto sm:flex-wrap">
                <Link
                  href="/login"
                  className="rounded-full border border-slate-200 bg-white px-5 py-3 text-center text-sm font-black text-[#061b3d] shadow-sm transition hover:bg-slate-50"
                >
                  Log In
                </Link>

                <Link
                  href="/signup"
                  className="rounded-full bg-gradient-to-r from-[#0b4edb] via-[#00b7c7] to-[#5ce05c] px-5 py-3 text-center text-sm font-black text-white shadow-lg"
                >
                  Get Started
                </Link>
              </div>
            </div>
          </header>

          <section className="grid gap-6 lg:grid-cols-[1.05fr_.95fr] lg:items-center lg:gap-8">
            <div className="rounded-[2rem] border border-cyan-100 bg-gradient-to-br from-[#0637b8] via-[#0072b8] to-[#00a878] p-6 text-white shadow-2xl sm:rounded-[2.5rem] sm:p-8 md:p-10">
              <p className="mb-4 inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-black uppercase tracking-widest text-white">
                AI-powered spending clarity
              </p>

              <h1 className="max-w-4xl text-4xl font-black leading-[0.95] tracking-[-0.06em] sm:text-5xl md:text-7xl">
                Ask before the money disappears.
              </h1>

              <p className="mt-5 max-w-2xl text-sm leading-7 text-white/82 sm:mt-6 md:text-lg">
                SafeSpend AI helps you track spending, protect bills, manage
                budgets, and decide what is actually safe to spend before you
                make another purchase.
              </p>

              <div className="mt-7 grid gap-3 sm:mt-8 sm:flex sm:flex-wrap">
                <Link
                  href="/signup"
                  className="rounded-full bg-white px-6 py-4 text-center text-sm font-black text-[#061b3d] shadow-lg"
                >
                  Start Free
                </Link>

                <Link
                  href="/billing"
                  className="rounded-full border border-white/25 bg-white/10 px-6 py-4 text-center text-sm font-black text-white"
                >
                  View Plans
                </Link>
              </div>
            </div>

            <div className="rounded-[2rem] border border-slate-200 bg-white p-4 shadow-xl sm:rounded-[2.5rem] sm:p-6">
              <div className="rounded-[1.5rem] bg-slate-50 p-4 sm:rounded-[2rem] sm:p-5">
                <p className="mb-3 inline-flex rounded-full bg-cyan-50 px-4 py-2 text-xs font-black uppercase tracking-widest text-cyan-700">
                  Example Coach Check
                </p>

                <div className="space-y-4">
                  <div className="rounded-3xl bg-white p-5 shadow-sm">
                    <p className="text-sm font-black text-slate-500">
                      You ask:
                    </p>
                    <p className="mt-2 text-lg font-black tracking-[-0.03em] text-[#061b3d] sm:text-xl">
                      “Can I spend $150 on clothes?”
                    </p>
                  </div>

                  <div className="rounded-3xl bg-gradient-to-br from-[#eefbff] to-[#f4fff6] p-5 shadow-sm">
                    <p className="text-sm font-black text-cyan-700">
                      SafeSpend responds:
                    </p>
                    <p className="mt-2 text-base font-black leading-7 text-[#061b3d] sm:text-lg">
                      Wait for now. Your upcoming bills and current spending
                      pressure make this a risky purchase.
                    </p>
                    <p className="mt-3 text-sm leading-6 text-slate-600">
                      Next best action: protect bills first, reduce flexible
                      spending, and check again after your next income deposit.
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <MiniStat label="Bills" value="Protected" />
                <MiniStat label="Budgets" value="Tracked" />
                <MiniStat label="Coach" value="Ready" />
              </div>
            </div>
          </section>
        </div>
      </section>

      <section className="px-3 py-7 sm:px-6 sm:py-8 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-5 md:grid-cols-3">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl"
            >
              <h3 className="text-2xl font-black tracking-[-0.04em] text-[#061b3d]">
                {feature.title}
              </h3>
              <p className="mt-3 text-sm leading-6 text-slate-500">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="px-3 pb-10 pt-3 sm:px-6 sm:pb-12 sm:pt-4 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-6 text-center">
            <p className="mb-3 inline-flex rounded-full bg-cyan-50 px-4 py-2 text-xs font-black uppercase tracking-widest text-cyan-700">
              Simple plans
            </p>
            <h2 className="text-3xl font-black tracking-[-0.05em] text-[#061b3d] sm:text-4xl md:text-5xl">
              Choose the level of clarity you need.
            </h2>
          </div>

          <div className="grid gap-5 lg:grid-cols-3">
            {tiers.map((tier) => (
              <div
                key={tier.name}
                className={`rounded-[2rem] border p-6 shadow-xl ${
                  tier.highlighted
                    ? "border-cyan-200 bg-gradient-to-br from-white to-cyan-50"
                    : "border-slate-200 bg-white"
                }`}
              >
                {tier.highlighted && (
                  <p className="mb-3 inline-flex rounded-full bg-gradient-to-r from-[#0b4edb] via-[#00b7c7] to-[#5ce05c] px-4 py-2 text-xs font-black uppercase tracking-widest text-white">
                    Most Popular
                  </p>
                )}

                <h3 className="text-3xl font-black tracking-[-0.04em] text-[#061b3d]">
                  {tier.name}
                </h3>

                <p className="mt-2 text-4xl font-black tracking-[-0.05em] text-[#061b3d]">
                  {tier.price}
                </p>

                <p className="mt-3 min-h-12 text-sm leading-6 text-slate-500">
                  {tier.description}
                </p>

                <div className="mt-5 space-y-3">
                  {tier.features.map((feature) => (
                    <div
                      key={feature}
                      className="rounded-2xl bg-slate-50 px-4 py-3 text-sm font-bold text-[#061b3d]"
                    >
                      {feature}
                    </div>
                  ))}
                </div>

                <Link
                  href="/signup"
                  className={`mt-6 inline-flex w-full justify-center rounded-full px-5 py-3 text-sm font-black shadow-lg ${
                    tier.highlighted
                      ? "bg-gradient-to-r from-[#0b4edb] via-[#00b7c7] to-[#5ce05c] text-white"
                      : "border border-slate-200 bg-white text-[#061b3d]"
                  }`}
                >
                  Get Started
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      <LegalFooter />
    </main>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-slate-100 bg-white p-4 text-center shadow-sm">
      <p className="text-xs font-black uppercase tracking-widest text-slate-400">
        {label}
      </p>
      <p className="mt-1 text-sm font-black text-[#061b3d]">{value}</p>
    </div>
  );
}