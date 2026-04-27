"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import AppShell from "@/components/AppShell";

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

type Budget = {
  id: string;
  user_id: string;
  category: string;
  weekly_limit: number;
  monthly_limit: number;
  created_at: string;
};

type Bill = {
  id: string;
  user_id: string;
  bill_name: string;
  category: string;
  amount: number;
  due_date: string;
  frequency: string;
  is_autopay: boolean;
  is_paid: boolean;
  notes: string | null;
};

type UserSettings = {
  paycheck_frequency: string;
  weekly_reset_day: string;
  monthly_income_target: number;
  emergency_buffer_goal: number;
  spending_style: string;
  top_priority: string;
  notes: string | null;
};

type FilterRange = "week" | "month" | "all";

type SafeSpendIntent =
  | "log_transaction"
  | "purchase_check"
  | "overspending_help"
  | "general_guidance";

type SafeSpendCoachResponse = {
  intent: SafeSpendIntent;
  shouldAutofillTransaction: boolean;
  transaction: {
    date: string;
    type: Transaction["type"];
    category: string;
    merchant: string;
    description: string;
    amount: number;
  };
  coach: {
    summary: string;
    safeToSpendImpact: string;
    categoryStatus: string;
    weeklyImpact: string;
    riskLevel: string;
    recommendation: string;
    nextBestAction: string;
  };
};

function getTodayDate() {
  return new Date().toISOString().split("T")[0];
}

function money(value: number) {
  return Number(value || 0).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });
}

function formatDate(dateValue: string) {
  return new Date(`${dateValue}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function daysUntil(dateValue: string) {
  const today = new Date(`${getTodayDate()}T00:00:00`);
  const due = new Date(`${dateValue}T00:00:00`);
  const diff = due.getTime() - today.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function formatIntentLabel(intent: SafeSpendIntent) {
  return intent
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export default function DashboardPage() {
  const router = useRouter();

  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState("");

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [userSettings, setUserSettings] = useState<UserSettings | null>(null);

  const [filterRange, setFilterRange] = useState<FilterRange>("week");

  const [aiMessage, setAiMessage] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResponse, setAiResponse] =
    useState<SafeSpendCoachResponse | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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

    setUserId(user.id);
    setEmail(user.email || "");

    await Promise.all([
      loadTransactions(user.id),
      loadBudgets(user.id),
      loadBills(user.id),
      loadUserSettings(user.id),
    ]);

    setLoading(false);
  }

  async function loadTransactions(currentUserId: string) {
    const { data, error } = await supabase
      .from("transactions")
      .select("*")
      .eq("user_id", currentUserId)
      .order("date", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) {
      setError(error.message);
      return;
    }

    setTransactions((data || []) as Transaction[]);
  }

  async function loadBudgets(currentUserId: string) {
    const { data, error } = await supabase
      .from("budgets")
      .select("*")
      .eq("user_id", currentUserId)
      .order("category", { ascending: true });

    if (error) {
      setError(error.message);
      return;
    }

    setBudgets((data || []) as Budget[]);
  }

  async function loadBills(currentUserId: string) {
    const { data, error } = await supabase
      .from("bills")
      .select("*")
      .eq("user_id", currentUserId)
      .order("is_paid", { ascending: true })
      .order("due_date", { ascending: true });

    if (error) {
      setError(error.message);
      return;
    }

    setBills((data || []) as Bill[]);
  }

  async function loadUserSettings(currentUserId: string) {
    const { data, error } = await supabase
      .from("user_settings")
      .select(
        "paycheck_frequency, weekly_reset_day, monthly_income_target, emergency_buffer_goal, spending_style, top_priority, notes"
      )
      .eq("user_id", currentUserId)
      .maybeSingle();

    if (error) {
      setError(error.message);
      return;
    }

    setUserSettings((data || null) as UserSettings | null);
  }

  function getFilterStartDate(range: FilterRange) {
    const now = new Date();

    if (range === "all") return null;

    if (range === "week") {
      const start = new Date(now);
      const day = start.getDay();
      const diff = start.getDate() - day;
      start.setDate(diff);
      start.setHours(0, 0, 0, 0);
      return start;
    }

    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    start.setHours(0, 0, 0, 0);
    return start;
  }

  const filteredTransactions = useMemo(() => {
    const startDate = getFilterStartDate(filterRange);

    if (!startDate) return transactions;

    return transactions.filter((tx) => {
      const txDate = new Date(`${tx.date}T00:00:00`);
      return txDate >= startDate;
    });
  }, [transactions, filterRange]);

  const totals = useMemo(() => {
    const totalIncome = filteredTransactions
      .filter((tx) => Number(tx.amount) > 0)
      .reduce((sum, tx) => sum + Number(tx.amount), 0);

    const totalSpent = filteredTransactions
      .filter((tx) => Number(tx.amount) < 0)
      .reduce((sum, tx) => sum + Math.abs(Number(tx.amount)), 0);

    const safeToSpend = totalIncome - totalSpent;

    const risk =
      safeToSpend <= 0
        ? "Critical"
        : safeToSpend < 100
          ? "High"
          : safeToSpend < 250
            ? "Medium"
            : "Low";

    return {
      totalIncome,
      totalSpent,
      safeToSpend,
      risk,
    };
  }, [filteredTransactions]);

  const categoryPressure = useMemo(() => {
    return budgets
      .filter((budget) => Number(budget.weekly_limit) > 0)
      .map((budget) => {
        const spent = filteredTransactions
          .filter(
            (tx) => tx.category === budget.category && Number(tx.amount) < 0
          )
          .reduce((sum, tx) => sum + Math.abs(Number(tx.amount)), 0);

        const limit = Number(budget.weekly_limit || 0);
        const percentUsed = limit > 0 ? Math.round((spent / limit) * 100) : 0;

        const status =
          percentUsed >= 100
            ? "Over Budget"
            : percentUsed >= 80
              ? "Close"
              : "OK";

        return {
          category: budget.category,
          spent,
          limit,
          percentUsed,
          status,
        };
      })
      .sort((a, b) => b.percentUsed - a.percentUsed);
  }, [budgets, filteredTransactions]);

  const upcomingBills = useMemo(() => {
    return bills
      .filter((bill) => !bill.is_paid)
      .filter((bill) => {
        const days = daysUntil(bill.due_date);
        return days >= 0 && days <= 14;
      })
      .sort((a, b) => a.due_date.localeCompare(b.due_date));
  }, [bills]);

  const overdueBills = useMemo(() => {
    return bills
      .filter((bill) => !bill.is_paid)
      .filter((bill) => daysUntil(bill.due_date) < 0)
      .sort((a, b) => a.due_date.localeCompare(b.due_date));
  }, [bills]);

  const upcomingBillsTotal = useMemo(() => {
    return upcomingBills.reduce(
      (sum, bill) => sum + Number(bill.amount || 0),
      0
    );
  }, [upcomingBills]);

  const protectedSafeToSpend = totals.safeToSpend - upcomingBillsTotal;

  const recentTransactions = filteredTransactions.slice(0, 6);

  const dashboardRisk =
    protectedSafeToSpend <= 0
      ? "Critical"
      : protectedSafeToSpend < 100
        ? "High"
        : protectedSafeToSpend < 250
          ? "Medium"
          : "Low";

  async function handleSafeSpendCoach(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!aiMessage.trim()) {
      setError("Please enter a message for SafeSpend AI.");
      return;
    }

    setAiLoading(true);
    setError("");
    setAiResponse(null);

    try {
      const response = await fetch("/api/safespend-coach", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: aiMessage,
          safeToSpend: totals.safeToSpend,
          protectedSafeToSpend,
          totalIncome: totals.totalIncome,
          totalSpent: totals.totalSpent,
          filterRange,
          categoryPressure,
          userSettings,
          upcomingBills,
          upcomingBillsTotal,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "SafeSpend AI could not respond.");
        setAiLoading(false);
        return;
      }

      setAiResponse(data);
      setAiLoading(false);
    } catch {
      setError("SafeSpend AI could not connect. Please try again.");
      setAiLoading(false);
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f4f8fb]">
        <p className="text-lg font-bold text-[#061b3d]">
          Loading dashboard...
        </p>
      </main>
    );
  }

  return (
    <AppShell
      email={email}
      title="Your spending control center."
      subtitle="See what is safe to spend, what is already spoken for, and what SafeSpend recommends before you buy."
    >
      <section className="mb-6 flex flex-wrap gap-3 rounded-[2rem] border border-slate-200 bg-white p-4 shadow-lg">
        <FilterButton
          label="This Week"
          active={filterRange === "week"}
          onClick={() => setFilterRange("week")}
        />

        <FilterButton
          label="This Month"
          active={filterRange === "month"}
          onClick={() => setFilterRange("month")}
        />

        <FilterButton
          label="All Time"
          active={filterRange === "all"}
          onClick={() => setFilterRange("all")}
        />
      </section>

      <section className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Safe to Spend"
          value={money(totals.safeToSpend)}
          helper="Before upcoming bills"
        />

        <MetricCard
          label="Protected Safe to Spend"
          value={money(protectedSafeToSpend)}
          helper="After bills due soon"
          danger={protectedSafeToSpend <= 0}
        />

        <MetricCard
          label="Upcoming Bills"
          value={money(upcomingBillsTotal)}
          helper={`${upcomingBills.length} due within 14 days`}
        />

        <MetricCard
          label="Risk Level"
          value={dashboardRisk}
          helper="Based on protected safe-to-spend"
          danger={dashboardRisk === "Critical" || dashboardRisk === "High"}
        />
      </section>

      {(overdueBills.length > 0 || protectedSafeToSpend <= 0) && (
        <section className="mb-6 rounded-[2rem] border border-red-100 bg-red-50 p-5 shadow-lg">
          <h3 className="text-xl font-black text-red-700">
            Spending Alert
          </h3>

          <p className="mt-2 text-sm leading-6 text-red-700">
            {overdueBills.length > 0
              ? `You have ${overdueBills.length} overdue bill${
                  overdueBills.length === 1 ? "" : "s"
                }. Handle those before making discretionary purchases.`
              : "Your protected safe-to-spend is at or below zero after upcoming bills. Pause non-essential spending until more income is added or bills are covered."}
          </p>
        </section>
      )}

      <section className="mb-6 grid gap-6 xl:grid-cols-[1.15fr_.85fr]">
        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl">
          <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="text-2xl font-black text-[#061b3d]">
                SafeSpend AI Quick Check
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                Ask before you spend, or log what happened from the dedicated
                Transactions page.
              </p>
            </div>

            <a
              href="/coach"
              className="rounded-full border border-slate-200 bg-slate-50 px-5 py-3 text-center text-sm font-black text-[#061b3d]"
            >
              Open Full Coach
            </a>
          </div>

          {userSettings ? (
            <p className="mb-4 inline-flex rounded-full bg-green-50 px-4 py-2 text-xs font-black text-green-700">
              Personal settings active
            </p>
          ) : (
            <a
              href="/settings"
              className="mb-4 inline-flex rounded-full bg-yellow-50 px-4 py-2 text-xs font-black text-yellow-700"
            >
              Add personal settings for better guidance →
            </a>
          )}

          <form
            onSubmit={handleSafeSpendCoach}
            className="grid gap-3 md:grid-cols-[1fr_auto]"
          >
            <input
              value={aiMessage}
              onChange={(event) => setAiMessage(event.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:ring-4 focus:ring-cyan-100"
              placeholder="Example: Can I spend 150 on clothes?"
            />

            <button
              type="submit"
              disabled={aiLoading || !aiMessage.trim()}
              className="rounded-full bg-gradient-to-r from-[#0b4edb] via-[#00b7c7] to-[#5ce05c] px-6 py-3 font-black text-white shadow-lg disabled:opacity-60"
            >
              {aiLoading ? "Thinking..." : "Ask SafeSpend"}
            </button>
          </form>

          <div className="mt-4 flex flex-wrap gap-2">
            {[
              "Can I spend 150 on clothes?",
              "I overspent by 80 this week",
              "Should I eat out tonight?",
              "I have bills due soon. What should I avoid spending on?",
            ].map((example) => (
              <button
                key={example}
                type="button"
                onClick={() => setAiMessage(example)}
                className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-bold text-[#061b3d]"
              >
                {example}
              </button>
            ))}
          </div>

          {aiResponse && (
            <div className="mt-5 rounded-3xl border border-slate-100 bg-slate-50 p-5">
              <div className="mb-4 flex flex-wrap gap-2">
                <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-700">
                  {formatIntentLabel(aiResponse.intent)}
                </span>

                <span className="rounded-full bg-cyan-50 px-3 py-1 text-xs font-black text-cyan-700">
                  Risk: {aiResponse.coach.riskLevel}
                </span>

                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
                  Impact: {aiResponse.coach.safeToSpendImpact}
                </span>
              </div>

              <h4 className="text-xl font-black text-[#061b3d]">
                SafeSpend Guidance
              </h4>

              <p className="mt-2 text-sm leading-6 text-slate-600">
                {aiResponse.coach.summary}
              </p>

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <div className="rounded-2xl bg-white p-4">
                  <p className="text-xs font-black uppercase tracking-widest text-slate-500">
                    Recommendation
                  </p>
                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    {aiResponse.coach.recommendation}
                  </p>
                </div>

                <div className="rounded-2xl bg-gradient-to-r from-[#eefbff] to-[#f4fff6] p-4">
                  <p className="text-xs font-black uppercase tracking-widest text-[#061b3d]">
                    Next Best Action
                  </p>
                  <p className="mt-1 text-sm font-bold leading-6 text-[#061b3d]">
                    {aiResponse.coach.nextBestAction}
                  </p>
                </div>
              </div>
            </div>
          )}

          {error && (
            <p className="mt-4 rounded-2xl bg-red-50 p-3 text-sm font-bold text-red-600">
              {error}
            </p>
          )}
        </section>

        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-2xl font-black text-[#061b3d]">
                Quick Actions
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                Jump to the right workspace.
              </p>
            </div>
          </div>

          <div className="grid gap-3">
            <QuickLink
              href="/transactions"
              title="Add or edit transactions"
              description="Income, expenses, transfers, debt, and savings."
            />

            <QuickLink
              href="/bills"
              title="Manage bills"
              description="Track due dates, autopay, and upcoming obligations."
            />

            <QuickLink
              href="/budgets"
              title="Adjust budgets"
              description="Set weekly and monthly category guardrails."
            />

            <QuickLink
              href="/settings"
              title="Personalize AI guidance"
              description="Paycheck rhythm, spending style, and priorities."
            />
          </div>
        </section>
      </section>

      <section className="mb-6 grid gap-6 xl:grid-cols-2">
        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl">
          <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="text-2xl font-black text-[#061b3d]">
                Bills Due Soon
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                Money SafeSpend treats as already spoken for.
              </p>
            </div>

            <a
              href="/bills"
              className="rounded-full bg-gradient-to-r from-[#0b4edb] via-[#00b7c7] to-[#5ce05c] px-5 py-3 text-center text-sm font-black text-white shadow-lg"
            >
              Manage Bills
            </a>
          </div>

          {upcomingBills.length === 0 ? (
            <EmptyState
              title="No bills due soon"
              description="Add upcoming bills so SafeSpend can protect that money before you spend it."
              href="/bills"
              action="Add Bills"
            />
          ) : (
            <div className="space-y-3">
              {upcomingBills.slice(0, 5).map((bill) => {
                const days = daysUntil(bill.due_date);

                return (
                  <div
                    key={bill.id}
                    className="flex flex-col gap-2 rounded-2xl border border-slate-100 bg-slate-50 p-4 md:flex-row md:items-center md:justify-between"
                  >
                    <div>
                      <p className="font-black text-[#061b3d]">
                        {bill.bill_name}
                      </p>

                      <p className="text-sm text-slate-500">
                        {bill.category} · Due{" "}
                        {days === 0
                          ? "today"
                          : days === 1
                            ? "tomorrow"
                            : `in ${days} days`}
                        {bill.is_autopay ? " · Autopay" : ""}
                      </p>
                    </div>

                    <p className="text-lg font-black text-[#061b3d]">
                      {money(Number(bill.amount))}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl">
          <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="text-2xl font-black text-[#061b3d]">
                Category Pressure
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                Based on your selected time filter.
              </p>
            </div>

            <a
              href="/budgets"
              className="rounded-full bg-gradient-to-r from-[#0b4edb] via-[#00b7c7] to-[#5ce05c] px-5 py-3 text-center text-sm font-black text-white shadow-lg"
            >
              Edit Budgets
            </a>
          </div>

          {categoryPressure.length === 0 ? (
            <EmptyState
              title="No budget limits yet"
              description="Add weekly category limits so SafeSpend can warn you before you overspend."
              href="/budgets"
              action="Set Budgets"
            />
          ) : (
            <div className="space-y-4">
              {categoryPressure.slice(0, 5).map((item) => (
                <div
                  key={item.category}
                  className="rounded-3xl border border-slate-100 bg-slate-50 p-4"
                >
                  <div className="mb-2 flex items-center justify-between gap-4">
                    <div>
                      <p className="font-black text-[#061b3d]">
                        {item.category}
                      </p>

                      <p className="text-sm text-slate-500">
                        {money(item.spent)} spent of {money(item.limit)}
                      </p>
                    </div>

                    <span
                      className={`rounded-full px-3 py-1 text-xs font-black ${
                        item.status === "Over Budget"
                          ? "bg-red-100 text-red-600"
                          : item.status === "Close"
                            ? "bg-yellow-100 text-yellow-700"
                            : "bg-green-100 text-green-700"
                      }`}
                    >
                      {item.status}
                    </span>
                  </div>

                  <div className="h-3 overflow-hidden rounded-full bg-white">
                    <div
                      className={`h-full rounded-full ${
                        item.percentUsed >= 100
                          ? "bg-red-500"
                          : item.percentUsed >= 80
                            ? "bg-yellow-400"
                            : "bg-gradient-to-r from-[#00b7c7] to-[#5ce05c]"
                      }`}
                      style={{
                        width: `${Math.min(item.percentUsed, 100)}%`,
                      }}
                    />
                  </div>

                  <p className="mt-2 text-right text-xs font-black text-slate-500">
                    {item.percentUsed}%
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>
      </section>

      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl">
        <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="text-2xl font-black text-[#061b3d]">
              Recent Transactions
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Latest activity from the selected period.
            </p>
          </div>

          <a
            href="/transactions"
            className="rounded-full bg-gradient-to-r from-[#0b4edb] via-[#00b7c7] to-[#5ce05c] px-5 py-3 text-center text-sm font-black text-white shadow-lg"
          >
            Manage Transactions
          </a>
        </div>

        {recentTransactions.length === 0 ? (
          <EmptyState
            title="No recent transactions"
            description="Add income, expenses, savings, transfers, or debt payments from the Transactions page."
            href="/transactions"
            action="Add Transaction"
          />
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {recentTransactions.map((tx) => (
              <div
                key={tx.id}
                className="rounded-2xl border border-slate-100 bg-slate-50 p-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-black text-[#061b3d]">
                      {tx.merchant || tx.category}
                    </p>

                    <p className="text-sm text-slate-500">
                      {tx.type} · {tx.category} · {formatDate(tx.date)}
                    </p>

                    {tx.description && (
                      <p className="mt-1 text-xs text-slate-400">
                        {tx.description}
                      </p>
                    )}
                  </div>

                  <p
                    className={`whitespace-nowrap font-black ${
                      Number(tx.amount) < 0
                        ? "text-red-500"
                        : "text-green-600"
                    }`}
                  >
                    {money(Number(tx.amount))}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </AppShell>
  );
}

function MetricCard({
  label,
  value,
  helper,
  danger = false,
}: {
  label: string;
  value: string;
  helper: string;
  danger?: boolean;
}) {
  return (
    <div
      className={`rounded-3xl border p-5 shadow-lg ${
        danger
          ? "border-red-100 bg-red-50"
          : "border-slate-200 bg-white"
      }`}
    >
      <p
        className={`text-xs font-black uppercase tracking-widest ${
          danger ? "text-red-500" : "text-slate-500"
        }`}
      >
        {label}
      </p>

      <p
        className={`mt-2 text-2xl font-black ${
          danger ? "text-red-700" : "text-[#061b3d]"
        }`}
      >
        {value}
      </p>

      <p className={`mt-1 text-xs ${danger ? "text-red-600" : "text-slate-500"}`}>
        {helper}
      </p>
    </div>
  );
}

function FilterButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-5 py-3 font-black ${
        active
          ? "bg-gradient-to-r from-[#0b4edb] via-[#00b7c7] to-[#5ce05c] text-white shadow-lg"
          : "border border-slate-200 bg-white text-[#061b3d]"
      }`}
    >
      {label}
    </button>
  );
}

function QuickLink({
  href,
  title,
  description,
}: {
  href: string;
  title: string;
  description: string;
}) {
  return (
    <a
      href={href}
      className="rounded-3xl border border-slate-200 bg-slate-50 p-4 transition hover:-translate-y-0.5 hover:shadow-lg"
    >
      <p className="font-black text-[#061b3d]">{title}</p>
      <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>
    </a>
  );
}

function EmptyState({
  title,
  description,
  href,
  action,
}: {
  title: string;
  description: string;
  href: string;
  action: string;
}) {
  return (
    <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
      <h4 className="text-xl font-black text-[#061b3d]">{title}</h4>

      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
        {description}
      </p>

      <a
        href={href}
        className="mt-5 inline-flex rounded-full bg-gradient-to-r from-[#0b4edb] via-[#00b7c7] to-[#5ce05c] px-5 py-3 text-sm font-black text-white shadow-lg"
      >
        {action}
      </a>
    </div>
  );
}