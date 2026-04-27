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

export default function CoachPage() {
  const router = useRouter();

  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState("");

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [userSettings, setUserSettings] = useState<UserSettings | null>(null);

  const [filterRange, setFilterRange] = useState<FilterRange>("week");
  const [message, setMessage] = useState("");
  const [response, setResponse] = useState<SafeSpendCoachResponse | null>(null);

  const [loading, setLoading] = useState(true);
  const [thinking, setThinking] = useState(false);
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

    return {
      totalIncome,
      totalSpent,
      safeToSpend: totalIncome - totalSpent,
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

  const upcomingBillsTotal = useMemo(() => {
    return upcomingBills.reduce(
      (sum, bill) => sum + Number(bill.amount || 0),
      0
    );
  }, [upcomingBills]);

  const protectedSafeToSpend = totals.safeToSpend - upcomingBillsTotal;

  async function handleAskCoach(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!message.trim()) {
      setError("Please enter a question or spending situation.");
      return;
    }

    setThinking(true);
    setError("");
    setResponse(null);

    try {
      const apiResponse = await fetch("/api/safespend-coach", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message,
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

      const data = await apiResponse.json();

      if (!apiResponse.ok) {
        setError(data.error || "SafeSpend AI could not respond.");
        setThinking(false);
        return;
      }

      setResponse(data);
      setThinking(false);
    } catch {
      setError("SafeSpend AI could not connect. Please try again.");
      setThinking(false);
    }
  }

  async function handleSaveDetectedTransaction() {
    if (!userId || !response?.transaction || !response.shouldAutofillTransaction) {
      return;
    }

    setThinking(true);
    setError("");

    const tx = response.transaction;
    const numericAmount = Number(tx.amount || 0);

    if (!numericAmount || numericAmount <= 0) {
      setError("The detected transaction does not have a valid amount.");
      setThinking(false);
      return;
    }

    const finalAmount =
      tx.type === "Income" ? numericAmount : -Math.abs(numericAmount);

    const { error } = await supabase.from("transactions").insert({
      user_id: userId,
      date: tx.date || getTodayDate(),
      type: tx.type || "Expense",
      category: tx.category || "Other",
      merchant: tx.merchant || null,
      description: tx.description || null,
      amount: finalAmount,
    });

    if (error) {
      setError(error.message);
      setThinking(false);
      return;
    }

    await loadTransactions(userId);

    setMessage("");
    setResponse(null);
    setThinking(false);
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f4f8fb]">
        <p className="text-lg font-bold text-[#061b3d]">
          Loading SafeSpend Coach...
        </p>
      </main>
    );
  }

  return (
    <AppShell
      email={email}
      title="Ask before the money disappears."
      subtitle="Use SafeSpend Coach for purchase checks, overspending recovery, bill-aware guidance, and natural-language transaction logging."
    >
      <section className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Safe to Spend"
          value={money(totals.safeToSpend)}
          helper="Before upcoming bills"
        />

        <MetricCard
          label="Protected Safe"
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
          label="Spending"
          value={money(totals.totalSpent)}
          helper={`Selected period: ${filterRange}`}
        />
      </section>

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

      <section className="grid gap-6 xl:grid-cols-[1fr_.9fr]">
        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl">
          <div className="mb-5">
            <p className="mb-2 inline-flex rounded-full bg-cyan-50 px-4 py-2 text-xs font-black uppercase tracking-widest text-cyan-700">
              SafeSpend AI Coach
            </p>

            <h3 className="text-2xl font-black text-[#061b3d]">
              What do you need to check?
            </h3>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Ask in plain English. SafeSpend will use your spending, budgets,
              bills, and settings to give guidance.
            </p>
          </div>

          <form onSubmit={handleAskCoach}>
            <textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              className="min-h-36 w-full rounded-3xl border border-slate-200 bg-slate-50 px-5 py-4 text-base outline-none focus:ring-4 focus:ring-cyan-100"
              placeholder="Example: Can I spend $150 on clothes this week?"
            />

            <button
              type="submit"
              disabled={thinking || !message.trim()}
              className="mt-4 w-full rounded-full bg-gradient-to-r from-[#0b4edb] via-[#00b7c7] to-[#5ce05c] px-6 py-3 font-black text-white shadow-lg disabled:opacity-60"
            >
              {thinking ? "Thinking..." : "Ask SafeSpend"}
            </button>
          </form>

          <div className="mt-5 flex flex-wrap gap-2">
            {[
              "Can I spend $150 on clothes?",
              "I overspent by $80 this week. Help me recover.",
              "What should I avoid spending on until payday?",
              "I got paid $1200 and have bills due. What should I do first?",
              "I spent $64 at Publix yesterday.",
            ].map((example) => (
              <button
                key={example}
                type="button"
                onClick={() => setMessage(example)}
                className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-bold text-[#061b3d]"
              >
                {example}
              </button>
            ))}
          </div>

          {error && (
            <p className="mt-4 rounded-2xl bg-red-50 p-3 text-sm font-bold text-red-600">
              {error}
            </p>
          )}

          {response && (
            <div className="mt-6 rounded-[2rem] border border-slate-100 bg-slate-50 p-5">
              <div className="mb-4 flex flex-wrap gap-2">
                <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-700">
                  {formatIntentLabel(response.intent)}
                </span>

                <span className="rounded-full bg-cyan-50 px-3 py-1 text-xs font-black text-cyan-700">
                  Risk: {response.coach.riskLevel}
                </span>

                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
                  Impact: {response.coach.safeToSpendImpact}
                </span>

                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
                  Category: {response.coach.categoryStatus}
                </span>
              </div>

              <h4 className="text-2xl font-black text-[#061b3d]">
                SafeSpend Guidance
              </h4>

              <p className="mt-3 text-sm leading-6 text-slate-600">
                {response.coach.summary}
              </p>

              <div className="mt-5 grid gap-3 md:grid-cols-2">
                <CoachCard
                  label="Weekly Impact"
                  text={response.coach.weeklyImpact}
                />

                <CoachCard
                  label="Recommendation"
                  text={response.coach.recommendation}
                />

                <div className="rounded-2xl bg-gradient-to-r from-[#eefbff] to-[#f4fff6] p-4 md:col-span-2">
                  <p className="text-xs font-black uppercase tracking-widest text-[#061b3d]">
                    Next Best Action
                  </p>
                  <p className="mt-1 text-sm font-bold leading-6 text-[#061b3d]">
                    {response.coach.nextBestAction}
                  </p>
                </div>
              </div>

              <div className="mt-5 rounded-2xl bg-white p-4">
                <p className="text-xs font-black uppercase tracking-widest text-slate-500">
                  Detected Transaction
                </p>

                <div className="mt-3 grid gap-2 text-sm text-slate-600 md:grid-cols-2">
                  <p>
                    <strong>Type:</strong> {response.transaction.type}
                  </p>
                  <p>
                    <strong>Category:</strong> {response.transaction.category}
                  </p>
                  <p>
                    <strong>Merchant:</strong> {response.transaction.merchant}
                  </p>
                  <p>
                    <strong>Amount:</strong>{" "}
                    {money(Number(response.transaction.amount))}
                  </p>
                  <p>
                    <strong>Date:</strong> {response.transaction.date}
                  </p>
                  <p>
                    <strong>Description:</strong>{" "}
                    {response.transaction.description}
                  </p>
                </div>

                {response.shouldAutofillTransaction ? (
                  <button
                    type="button"
                    onClick={handleSaveDetectedTransaction}
                    disabled={thinking}
                    className="mt-4 rounded-full bg-gradient-to-r from-[#0b4edb] via-[#00b7c7] to-[#5ce05c] px-5 py-3 text-sm font-black text-white shadow-lg disabled:opacity-60"
                  >
                    {thinking ? "Saving..." : "Save Detected Transaction"}
                  </button>
                ) : (
                  <p className="mt-4 rounded-2xl bg-yellow-50 p-3 text-sm font-bold text-yellow-700">
                    This is guidance only, so SafeSpend will not save it as a
                    transaction.
                  </p>
                )}
              </div>
            </div>
          )}
        </section>

        <aside className="space-y-6">
          <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl">
            <h3 className="text-2xl font-black text-[#061b3d]">
              Money Context
            </h3>

            <div className="mt-4 space-y-3">
              <ContextRow label="Income" value={money(totals.totalIncome)} />
              <ContextRow label="Spent" value={money(totals.totalSpent)} />
              <ContextRow
                label="Bills Due Soon"
                value={money(upcomingBillsTotal)}
              />
              <ContextRow
                label="Protected Safe"
                value={money(protectedSafeToSpend)}
              />
            </div>
          </section>

          <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl">
            <h3 className="text-2xl font-black text-[#061b3d]">
              Upcoming Bills
            </h3>

            {upcomingBills.length === 0 ? (
              <p className="mt-3 rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-500">
                No unpaid bills due in the next 14 days.
              </p>
            ) : (
              <div className="mt-4 space-y-3">
                {upcomingBills.slice(0, 5).map((bill) => {
                  const days = daysUntil(bill.due_date);

                  return (
                    <div
                      key={bill.id}
                      className="rounded-2xl border border-slate-100 bg-slate-50 p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-black text-[#061b3d]">
                            {bill.bill_name}
                          </p>
                          <p className="text-sm text-slate-500">
                            Due{" "}
                            {days === 0
                              ? "today"
                              : days === 1
                                ? "tomorrow"
                                : `in ${days} days`}
                            {bill.is_autopay ? " · Autopay" : ""}
                          </p>
                        </div>

                        <p className="font-black text-[#061b3d]">
                          {money(Number(bill.amount))}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl">
            <h3 className="text-2xl font-black text-[#061b3d]">
              Personal Settings
            </h3>

            {userSettings ? (
              <div className="mt-4 space-y-3">
                <ContextRow
                  label="Spending Style"
                  value={userSettings.spending_style}
                />
                <ContextRow
                  label="Top Priority"
                  value={userSettings.top_priority.replaceAll("_", " ")}
                />
                <ContextRow
                  label="Paycheck"
                  value={userSettings.paycheck_frequency}
                />
                <ContextRow
                  label="Reset Day"
                  value={userSettings.weekly_reset_day}
                />
              </div>
            ) : (
              <div className="mt-4 rounded-2xl bg-yellow-50 p-4">
                <p className="text-sm font-bold leading-6 text-yellow-700">
                  Add personal settings so SafeSpend can tailor its guidance.
                </p>
                <a
                  href="/settings"
                  className="mt-3 inline-flex rounded-full bg-white px-4 py-2 text-xs font-black text-yellow-700"
                >
                  Open Settings
                </a>
              </div>
            )}
          </section>
        </aside>
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
        danger ? "border-red-100 bg-red-50" : "border-slate-200 bg-white"
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

function CoachCard({ label, text }: { label: string; text: string }) {
  return (
    <div className="rounded-2xl bg-white p-4">
      <p className="text-xs font-black uppercase tracking-widest text-slate-500">
        {label}
      </p>
      <p className="mt-1 text-sm leading-6 text-slate-600">{text}</p>
    </div>
  );
}

function ContextRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl bg-slate-50 p-4">
      <p className="text-sm font-bold text-slate-500">{label}</p>
      <p className="text-right text-sm font-black capitalize text-[#061b3d]">
        {value}
      </p>
    </div>
  );
}