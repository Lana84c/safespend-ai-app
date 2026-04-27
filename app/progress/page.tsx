"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";
import { supabase } from "@/lib/supabase/client";

type Transaction = {
  id: string;
  user_id: string;
  date: string;
  type: "Income" | "Expense" | "Transfer" | "Debt" | "Savings" | "Event";
  category: string;
  merchant: string | null;
  description: string | null;
  amount: number;
  created_at: string;
};

function money(value: number) {
  return Number(value || 0).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });
}

function getTodayDate() {
  return new Date().toISOString().split("T")[0];
}

function getWeekStart() {
  const now = new Date();
  const start = new Date(now);
  const day = start.getDay();
  start.setDate(start.getDate() - day);
  start.setHours(0, 0, 0, 0);
  return start;
}

export default function ProgressPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    checkUser();
  }, []);

  async function checkUser() {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error) {
      console.error("Auth session error:", error.message);
    }

    if (!session?.user) {
      router.push("/login");
      return;
    }

    setEmail(session.user.email || "");
    await loadTransactions(session.user.id);
    setLoading(false);
  }

  async function loadTransactions(userId: string) {
    const { data, error } = await supabase
      .from("transactions")
      .select("*")
      .eq("user_id", userId)
      .order("date", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) {
      setError(error.message);
      return;
    }

    setTransactions((data || []) as Transaction[]);
  }

  const progress = useMemo(() => {
    const weekStart = getWeekStart();

    const weeklyTransactions = transactions.filter((tx) => {
      const txDate = new Date(`${tx.date}T00:00:00`);
      return txDate >= weekStart;
    });

    const weeklyLoggedCount = weeklyTransactions.length;

    const income = weeklyTransactions
      .filter((tx) => Number(tx.amount) > 0)
      .reduce((sum, tx) => sum + Number(tx.amount), 0);

    const spent = weeklyTransactions
      .filter((tx) => Number(tx.amount) < 0)
      .reduce((sum, tx) => sum + Math.abs(Number(tx.amount)), 0);

    const safeToSpend = income - spent;

    const savingsOrDebtPayments = weeklyTransactions
      .filter((tx) => tx.type === "Savings" || tx.type === "Debt")
      .reduce((sum, tx) => sum + Math.abs(Number(tx.amount)), 0);

    const today = getTodayDate();
    const loggedToday = weeklyTransactions.some((tx) => tx.date === today);

    const points =
      weeklyLoggedCount * 10 +
      (loggedToday ? 25 : 0) +
      (safeToSpend >= 0 ? 30 : 0) +
      (savingsOrDebtPayments > 0 ? 25 : 0);

    const level =
      points >= 250
        ? "Level 4 — Spending Strategist"
        : points >= 150
          ? "Level 3 — Money Guardian"
          : points >= 75
            ? "Level 2 — Budget Builder"
            : "Level 1 — Getting Started";

    return {
      weeklyLoggedCount,
      income,
      spent,
      safeToSpend,
      savingsOrDebtPayments,
      loggedToday,
      points,
      level,
    };
  }, [transactions]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f4f8fb] px-6">
        <p className="text-lg font-bold text-[#061b3d]">
          Loading progress...
        </p>
      </main>
    );
  }

  return (
    <AppShell
      email={email}
      title="Progress"
      subtitle="Track your SafeSpend consistency, money habits, and weekly wins."
    >
      <section className="mb-6 rounded-[2rem] bg-gradient-to-br from-[#0637b8] via-[#0072b8] to-[#00a878] p-8 text-white shadow-2xl">
        <div className="grid gap-6 md:grid-cols-[1.2fr_.8fr] md:items-center">
          <div>
            <p className="mb-3 inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-bold">
              Weekly Progress
            </p>

            <h2 className="text-5xl font-black leading-[0.95] tracking-[-0.05em] md:text-6xl">
              Build better money habits one check-in at a time.
            </h2>

            <p className="mt-5 max-w-2xl text-white/80">
              Earn progress by logging transactions, checking in daily, staying
              safe-to-spend positive, and putting money toward savings or debt.
            </p>
          </div>

          <div className="rounded-3xl border border-white/20 bg-white/15 p-6 backdrop-blur">
            <p className="text-sm font-black uppercase tracking-widest text-white/70">
              Current Level
            </p>

            <p className="mt-3 text-3xl font-black">{progress.level}</p>

            <p className="mt-4 inline-flex rounded-full bg-white/15 px-4 py-2 text-sm font-bold">
              {progress.points} points this week
            </p>
          </div>
        </div>
      </section>

      {error && (
        <section className="mb-6 rounded-2xl bg-red-50 p-4 text-sm font-bold text-red-600">
          {error}
        </section>
      )}

      <section className="mb-6 grid gap-4 md:grid-cols-4">
        <MetricCard
          label="Transactions Logged"
          value={String(progress.weeklyLoggedCount)}
          helper="This week"
        />

        <MetricCard
          label="Daily Check-In"
          value={progress.loggedToday ? "Done" : "Not Yet"}
          helper={progress.loggedToday ? "You checked in today" : "Log one item today"}
          warning={!progress.loggedToday}
        />

        <MetricCard
          label="Safe to Spend"
          value={money(progress.safeToSpend)}
          helper="This week"
          danger={progress.safeToSpend < 0}
        />

        <MetricCard
          label="Savings/Debt Wins"
          value={money(progress.savingsOrDebtPayments)}
          helper="Progress payments"
        />
      </section>

      <section className="mb-6 grid gap-6 md:grid-cols-2">
        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl">
          <h3 className="text-2xl font-black text-[#061b3d]">
            Weekly Challenges
          </h3>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            Complete these actions to build consistency and make SafeSpend more
            accurate.
          </p>

          <div className="mt-5 space-y-3">
            <ChallengeRow
              title="Log at least 5 transactions"
              description="Keep your spending picture current."
              complete={progress.weeklyLoggedCount >= 5}
            />

            <ChallengeRow
              title="Check in today"
              description="Log income, spending, or ask SafeSpend before buying."
              complete={progress.loggedToday}
            />

            <ChallengeRow
              title="Stay safe-to-spend positive"
              description="Keep your available money above zero."
              complete={progress.safeToSpend >= 0}
            />

            <ChallengeRow
              title="Make a savings or debt move"
              description="Log a savings transfer or debt payment."
              complete={progress.savingsOrDebtPayments > 0}
            />
          </div>
        </div>

        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl">
          <h3 className="text-2xl font-black text-[#061b3d]">
            SafeSpend Streak Builder
          </h3>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            Your first gamified habit loop is live. This gives users a reason to
            come back, log transactions, and check spending before purchases.
          </p>

          <div className="mt-5 rounded-3xl bg-slate-50 p-5">
            <p className="text-xs font-black uppercase tracking-widest text-slate-500">
              This Week’s Score
            </p>

            <p className="mt-2 text-5xl font-black text-[#061b3d]">
              {progress.points}
            </p>

            <div className="mt-4 h-3 overflow-hidden rounded-full bg-white">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#0b4edb] via-[#00b7c7] to-[#5ce05c]"
                style={{ width: `${Math.min((progress.points / 250) * 100, 100)}%` }}
              />
            </div>

            <p className="mt-3 text-sm font-bold text-slate-500">
              Reach 250 points to hit Level 4 this week.
            </p>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <a
              href="/dashboard"
              className="rounded-full bg-gradient-to-r from-[#0b4edb] via-[#00b7c7] to-[#5ce05c] px-5 py-3 text-sm font-black text-white shadow-lg"
            >
              Log a Transaction
            </a>

            <a
              href="/coach"
              className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-black text-[#061b3d]"
            >
              Ask SafeSpend
            </a>
          </div>
        </div>
      </section>
    </AppShell>
  );
}

function MetricCard({
  label,
  value,
  helper,
  danger = false,
  warning = false,
}: {
  label: string;
  value: string;
  helper: string;
  danger?: boolean;
  warning?: boolean;
}) {
  return (
    <div
      className={`rounded-3xl border p-5 shadow-lg ${
        danger
          ? "border-red-100 bg-red-50"
          : warning
            ? "border-yellow-100 bg-yellow-50"
            : "border-slate-200 bg-white"
      }`}
    >
      <p
        className={`text-xs font-black uppercase tracking-widest ${
          danger
            ? "text-red-500"
            : warning
              ? "text-yellow-600"
              : "text-slate-500"
        }`}
      >
        {label}
      </p>

      <p
        className={`mt-2 text-2xl font-black ${
          danger
            ? "text-red-700"
            : warning
              ? "text-yellow-800"
              : "text-[#061b3d]"
        }`}
      >
        {value}
      </p>

      <p
        className={`mt-1 text-xs ${
          danger
            ? "text-red-600"
            : warning
              ? "text-yellow-700"
              : "text-slate-500"
        }`}
      >
        {helper}
      </p>
    </div>
  );
}

function ChallengeRow({
  title,
  description,
  complete,
}: {
  title: string;
  description: string;
  complete: boolean;
}) {
  return (
    <div
      className={`rounded-3xl border p-4 ${
        complete
          ? "border-green-100 bg-green-50"
          : "border-slate-200 bg-slate-50"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p
            className={`font-black ${
              complete ? "text-green-700" : "text-[#061b3d]"
            }`}
          >
            {title}
          </p>

          <p
            className={`mt-1 text-sm leading-6 ${
              complete ? "text-green-600" : "text-slate-500"
            }`}
          >
            {description}
          </p>
        </div>

        <span
          className={`rounded-full px-3 py-1 text-xs font-black ${
            complete
              ? "bg-green-100 text-green-700"
              : "bg-white text-slate-500"
          }`}
        >
          {complete ? "Done" : "Open"}
        </span>
      </div>
    </div>
  );
}