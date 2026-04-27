"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import AppShell from "@/components/AppShell";

export default function HelpPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkUser();
  }, []);

  async function checkUser() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/login");
      return;
    }

    setEmail(user.email || "");
    setLoading(false);
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f4f8fb]">
        <p className="text-lg font-bold text-[#061b3d]">Loading help...</p>
      </main>
    );
  }

  return (
    <AppShell
      email={email}
      title="How to use SafeSpend AI."
      subtitle="Use this guide to understand the dashboard, transactions, budgets, bills, reports, settings, and AI coach."
    >
      <section className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <QuickCard
          title="Start Here"
          description="Add income, bills, and budgets first so SafeSpend has enough context."
          href="#start"
        />

        <QuickCard
          title="Ask the Coach"
          description="Use plain English to check purchases or log spending."
          href="#coach"
        />

        <QuickCard
          title="Protect Bills"
          description="Add upcoming bills so SafeSpend protects money before you spend it."
          href="#bills"
        />

        <QuickCard
          title="Review Reports"
          description="Use reports to find spending patterns and pressure points."
          href="#reports"
        />
      </section>

      <section
        id="start"
        className="mb-6 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl"
      >
        <p className="mb-2 inline-flex rounded-full bg-cyan-50 px-4 py-2 text-xs font-black uppercase tracking-widest text-cyan-700">
          Getting Started
        </p>

        <h3 className="text-2xl font-black text-[#061b3d]">
          Set up SafeSpend in the right order.
        </h3>

        <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-600">
          SafeSpend works best when it knows your income, expenses, upcoming
          bills, spending limits, and personal money priorities. You do not need
          everything perfect on day one — just start with the basics.
        </p>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StepCard
            number="1"
            title="Add income"
            description="Go to Transactions and add your paycheck, deposits, or other income."
            href="/transactions"
            action="Open Transactions"
          />

          <StepCard
            number="2"
            title="Add bills"
            description="Go to Bills and enter rent, utilities, subscriptions, credit cards, and due dates."
            href="/bills"
            action="Open Bills"
          />

          <StepCard
            number="3"
            title="Set budgets"
            description="Go to Budgets and set weekly limits for groceries, shopping, dining, and other categories."
            href="/budgets"
            action="Open Budgets"
          />

          <StepCard
            number="4"
            title="Personalize AI"
            description="Go to Settings and choose paycheck rhythm, spending style, and top priority."
            href="/settings"
            action="Open Settings"
          />
        </div>
      </section>

      <section className="mb-6 grid gap-6 xl:grid-cols-2">
        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl">
          <h3 className="text-2xl font-black text-[#061b3d]">
            What each page does
          </h3>

          <div className="mt-5 space-y-3">
            <PageGuide
              page="Dashboard"
              description="Your overview page. It shows safe-to-spend, protected safe-to-spend, bills due soon, category pressure, recent transactions, and quick AI checks."
              href="/dashboard"
            />

            <PageGuide
              page="Transactions"
              description="Where you add, edit, delete, search, and review income, expenses, transfers, savings, debt payments, and events."
              href="/transactions"
            />

            <PageGuide
              page="Budgets"
              description="Where you set weekly and monthly category spending limits so SafeSpend can warn you before overspending."
              href="/budgets"
            />

            <PageGuide
              page="Bills"
              description="Where you track upcoming obligations like rent, power, phone, insurance, subscriptions, and credit card minimums."
              href="/bills"
            />

            <PageGuide
              page="Coach"
              description="The full AI workspace for purchase checks, overspending recovery, bill-aware guidance, and natural-language transaction logging."
              href="/coach"
            />

            <PageGuide
              page="Reports"
              description="Where you review income, spending, categories, top merchants, budget pressure, and bill pressure."
              href="/reports"
            />

            <PageGuide
              page="Settings"
              description="Where you personalize paycheck frequency, reset day, spending style, emergency buffer, and AI coaching priorities."
              href="/settings"
            />

            <PageGuide
              page="Account"
              description="Where you review your account details, data summary, and password/security options."
              href="/account"
            />
          </div>
        </section>

        <section
          id="coach"
          className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl"
        >
          <h3 className="text-2xl font-black text-[#061b3d]">
            What to ask SafeSpend AI
          </h3>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            You can speak naturally. SafeSpend will try to identify whether you
            are logging money, checking a purchase, or asking for recovery help.
          </p>

          <div className="mt-5 space-y-3">
            <PromptExample
              label="Log spending"
              prompt="I spent $64 at Publix yesterday."
            />

            <PromptExample
              label="Log income"
              prompt="I got paid $1,200 today."
            />

            <PromptExample
              label="Check a purchase"
              prompt="Can I spend $150 on clothes this week?"
            />

            <PromptExample
              label="Overspending recovery"
              prompt="I overspent by $80 this week. Help me recover."
            />

            <PromptExample
              label="Bill-aware guidance"
              prompt="I have bills due soon. What should I avoid spending on?"
            />

            <PromptExample
              label="Paycheck planning"
              prompt="I got paid $1,200 and have bills due. What should I do first?"
            />
          </div>

          <a
            href="/coach"
            className="mt-6 inline-flex rounded-full bg-gradient-to-r from-[#0b4edb] via-[#00b7c7] to-[#5ce05c] px-5 py-3 text-sm font-black text-white shadow-lg"
          >
            Open SafeSpend Coach
          </a>
        </section>
      </section>

      <section
        id="bills"
        className="mb-6 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl"
      >
        <p className="mb-2 inline-flex rounded-full bg-blue-50 px-4 py-2 text-xs font-black uppercase tracking-widest text-blue-700">
          Bills + Protected Safe-to-Spend
        </p>

        <h3 className="text-2xl font-black text-[#061b3d]">
          Why bills matter.
        </h3>

        <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-600">
          Your regular safe-to-spend number looks at income minus spending. Your
          protected safe-to-spend number also subtracts unpaid bills due soon.
          That helps prevent you from spending money that is already needed for
          rent, utilities, subscriptions, debt minimums, or other obligations.
        </p>

        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <InfoCard
            title="Safe to Spend"
            description="Income minus tracked spending for the selected period."
          />

          <InfoCard
            title="Upcoming Bills"
            description="Unpaid bills due soon, usually within the next 14 days."
          />

          <InfoCard
            title="Protected Safe"
            description="Safe-to-spend after setting aside money for upcoming bills."
          />
        </div>
      </section>

      <section
        id="reports"
        className="mb-6 grid gap-6 xl:grid-cols-[.9fr_1.1fr]"
      >
        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl">
          <h3 className="text-2xl font-black text-[#061b3d]">
            How to read your reports
          </h3>

          <div className="mt-5 space-y-3">
            <InfoRow
              title="Spending by Category"
              description="Shows where most of your money is going by category."
            />

            <InfoRow
              title="Top Merchants"
              description="Shows which stores, bills, people, or services receive the most spending."
            />

            <InfoRow
              title="Budget Pressure"
              description="Shows whether category spending is OK, close to the limit, or over budget."
            />

            <InfoRow
              title="Bills & Obligations"
              description="Shows overdue bills and bills due soon that affect safe-to-spend."
            />
          </div>
        </section>

        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl">
          <h3 className="text-2xl font-black text-[#061b3d]">
            Best practices
          </h3>

          <div className="mt-5 space-y-3">
            <Tip
              title="Log transactions as close to real time as possible."
              description="The more current your transactions are, the more useful SafeSpend becomes."
            />

            <Tip
              title="Ask before discretionary purchases."
              description="Use the Coach before clothes, Amazon, Target, beauty, eating out, or impulse spending."
            />

            <Tip
              title="Keep bills updated."
              description="Mark bills paid when they are handled so protected safe-to-spend stays accurate."
            />

            <Tip
              title="Review reports weekly."
              description="Look for spending patterns, budget pressure, and recurring problem categories."
            />
          </div>
        </section>
      </section>

      <section className="mb-6 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl">
        <h3 className="text-2xl font-black text-[#061b3d]">
          Common questions
        </h3>

        <div className="mt-5 space-y-4">
          <Faq
            question="Is SafeSpend financial advice?"
            answer="No. SafeSpend is a spending-awareness and budgeting support tool. It is not financial, legal, tax, investment, credit repair, or debt settlement advice."
          />

          <Faq
            question="Why did SafeSpend tell me not to buy something?"
            answer="SafeSpend looks at your safe-to-spend, upcoming bills, category pressure, and personal settings. If a purchase could put pressure on bills or goals, it may recommend waiting."
          />

          <Faq
            question="Why does protected safe-to-spend differ from safe-to-spend?"
            answer="Protected safe-to-spend subtracts unpaid bills due soon. It is the more cautious number for purchase decisions."
          />

          <Faq
            question="Can SafeSpend log transactions automatically?"
            answer="Right now, SafeSpend can detect transactions from plain language and save them when you confirm. Automatic bank syncing can be added later as an advanced feature."
          />

          <Faq
            question="What should I do if numbers look wrong?"
            answer="Check Transactions for missing or duplicate entries, check Bills for unpaid bills that are actually paid, and check Budgets for outdated category limits."
          />
        </div>
      </section>

      <section className="rounded-[2rem] border border-slate-200 bg-gradient-to-br from-[#0637b8] via-[#0072b8] to-[#00a878] p-6 text-white shadow-2xl">
        <h3 className="text-2xl font-black">Ready to use SafeSpend?</h3>

        <p className="mt-2 max-w-3xl text-sm leading-6 text-white/80">
          Start with the dashboard, then use the Coach before purchases. Keep
          transactions and bills updated so SafeSpend can give better guidance.
        </p>

        <div className="mt-5 flex flex-wrap gap-3">
          <a
            href="/dashboard"
            className="rounded-full bg-white px-5 py-3 text-sm font-black text-[#061b3d]"
          >
            Open Dashboard
          </a>

          <a
            href="/coach"
            className="rounded-full border border-white/25 bg-white/10 px-5 py-3 text-sm font-black text-white"
          >
            Ask SafeSpend
          </a>
        </div>
      </section>
    </AppShell>
  );
}

function QuickCard({
  title,
  description,
  href,
}: {
  title: string;
  description: string;
  href: string;
}) {
  return (
    <a
      href={href}
      className="rounded-3xl border border-slate-200 bg-white p-5 shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl"
    >
      <p className="font-black text-[#061b3d]">{title}</p>
      <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
    </a>
  );
}

function StepCard({
  number,
  title,
  description,
  href,
  action,
}: {
  number: string;
  title: string;
  description: string;
  href: string;
  action: string;
}) {
  return (
    <div className="rounded-3xl border border-slate-100 bg-slate-50 p-5">
      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-r from-[#0b4edb] via-[#00b7c7] to-[#5ce05c] text-sm font-black text-white">
        {number}
      </div>

      <h4 className="font-black text-[#061b3d]">{title}</h4>

      <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>

      <a
        href={href}
        className="mt-4 inline-flex rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-black text-[#061b3d]"
      >
        {action}
      </a>
    </div>
  );
}

function PageGuide({
  page,
  description,
  href,
}: {
  page: string;
  description: string;
  href: string;
}) {
  return (
    <a
      href={href}
      className="block rounded-3xl border border-slate-100 bg-slate-50 p-4 transition hover:-translate-y-0.5 hover:shadow-lg"
    >
      <p className="font-black text-[#061b3d]">{page}</p>
      <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>
    </a>
  );
}

function PromptExample({ label, prompt }: { label: string; prompt: string }) {
  return (
    <div className="rounded-3xl border border-slate-100 bg-slate-50 p-4">
      <p className="text-xs font-black uppercase tracking-widest text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-sm font-bold leading-6 text-[#061b3d]">
        “{prompt}”
      </p>
    </div>
  );
}

function InfoCard({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-3xl border border-slate-100 bg-slate-50 p-5">
      <h4 className="font-black text-[#061b3d]">{title}</h4>
      <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
    </div>
  );
}

function InfoRow({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-3xl border border-slate-100 bg-slate-50 p-4">
      <p className="font-black text-[#061b3d]">{title}</p>
      <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>
    </div>
  );
}

function Tip({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-3xl border border-green-100 bg-green-50 p-4">
      <p className="font-black text-green-800">{title}</p>
      <p className="mt-1 text-sm leading-6 text-green-700">{description}</p>
    </div>
  );
}

function Faq({ question, answer }: { question: string; answer: string }) {
  return (
    <div className="rounded-3xl border border-slate-100 bg-slate-50 p-5">
      <p className="font-black text-[#061b3d]">{question}</p>
      <p className="mt-2 text-sm leading-6 text-slate-600">{answer}</p>
    </div>
  );
}