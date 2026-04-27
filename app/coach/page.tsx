"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import AppShell from "@/components/AppShell";

type PlanKey = "free" | "plus" | "pro";

type BillingStatus =
  | "free"
  | "active"
  | "trialing"
  | "past_due"
  | "canceled"
  | "incomplete"
  | "incomplete_expired"
  | "unpaid";

type BillingRecord = {
  plan: PlanKey;
  status: BillingStatus;
};

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

const categories = [
  "Income",
  "Groceries",
  "Bills",
  "Shopping",
  "Transportation",
  "Dining",
  "Debt",
  "Savings",
  "Subscriptions",
  "Personal",
  "Other",
];

const COACH_LIMITS: Record<PlanKey, number | null> = {
  free: 10,
  plus: 100,
  pro: null,
};

function getTodayDate() {
  return new Date().toISOString().split("T")[0];
}

function getMonthStartIso() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
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

function formatIntentLabel(intent: SafeSpendIntent) {
  return intent
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function formatPlanLabel(plan: string) {
  return plan.charAt(0).toUpperCase() + plan.slice(1);
}

function isPaidStatus(status?: string | null) {
  return status === "active" || status === "trialing";
}

function getEffectivePlan(billing: BillingRecord | null): PlanKey {
  if (!billing) return "free";
  if (!isPaidStatus(billing.status)) return "free";
  if (billing.plan === "pro") return "pro";
  if (billing.plan === "plus") return "plus";
  return "free";
}

function daysUntil(dateValue: string) {
  const today = new Date(`${getTodayDate()}T00:00:00`);
  const due = new Date(`${dateValue}T00:00:00`);
  const diff = due.getTime() - today.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export default function CoachPage() {
  const router = useRouter();

  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState("");

  const [billing, setBilling] = useState<BillingRecord | null>(null);
  const [monthlyCoachUsage, setMonthlyCoachUsage] = useState(0);

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [userSettings, setUserSettings] = useState<UserSettings | null>(null);

  const [filterRange, setFilterRange] = useState<FilterRange>("week");

  const [message, setMessage] = useState("");
  const [coachLoading, setCoachLoading] = useState(false);
  const [coachResponse, setCoachResponse] =
    useState<SafeSpendCoachResponse | null>(null);

  const [transactionDate, setTransactionDate] = useState(getTodayDate());
  const [type, setType] = useState<Transaction["type"]>("Expense");
  const [category, setCategory] = useState("Groceries");
  const [merchant, setMerchant] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");

  const [loading, setLoading] = useState(true);
  const [savingTransaction, setSavingTransaction] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  const effectivePlan = getEffectivePlan(billing);
  const coachLimit = COACH_LIMITS[effectivePlan];
  const coachRemaining =
    coachLimit === null ? null : Math.max(coachLimit - monthlyCoachUsage, 0);
  const coachLimitReached =
    coachLimit !== null && monthlyCoachUsage >= coachLimit;

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
      loadBilling(user.id),
      loadCoachUsage(user.id),
      loadTransactions(user.id),
      loadBudgets(user.id),
      loadBills(user.id),
      loadUserSettings(user.id),
    ]);

    setLoading(false);
  }

  async function loadBilling(currentUserId: string) {
    const { data, error } = await supabase
      .from("user_billing")
      .select("plan, status")
      .eq("user_id", currentUserId)
      .maybeSingle();

    if (error) {
      setError(error.message);
      return;
    }

    setBilling(
      data
        ? (data as BillingRecord)
        : {
            plan: "free",
            status: "free",
          }
    );
  }

  async function loadCoachUsage(currentUserId: string) {
    const { count, error } = await supabase
      .from("usage_events")
      .select("id", { count: "exact", head: true })
      .eq("user_id", currentUserId)
      .eq("event_type", "coach_request")
      .gte("created_at", getMonthStartIso());

    if (error) {
      setError(error.message);
      return;
    }

    setMonthlyCoachUsage(count || 0);
  }

  async function recordCoachUsage(currentUserId: string) {
    const { error } = await supabase.from("usage_events").insert({
      user_id: currentUserId,
      event_type: "coach_request",
      metadata: {
        plan: effectivePlan,
      },
    });

    if (error) {
      setError(error.message);
      return;
    }

    await loadCoachUsage(currentUserId);
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
      count: filteredTransactions.length,
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

  const billSummary = useMemo(() => {
    const unpaidBills = bills.filter((bill) => !bill.is_paid);

    const dueSoonBills = unpaidBills.filter((bill) => {
      const days = daysUntil(bill.due_date);
      return days >= 0 && days <= 14;
    });

    const dueSoonTotal = dueSoonBills.reduce(
      (sum, bill) => sum + Number(bill.amount || 0),
      0
    );

    return {
      dueSoonCount: dueSoonBills.length,
      dueSoonTotal,
      upcomingBills: dueSoonBills.slice(0, 5),
    };
  }, [bills]);

  const protectedSafeToSpend = totals.safeToSpend - billSummary.dueSoonTotal;

  async function handleAskCoach(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!userId) return;

    if (!message.trim()) {
      setError("Please enter a message for SafeSpend Coach.");
      return;
    }

    if (coachLimitReached) {
      setError(
        `You have used all ${coachLimit} ${formatPlanLabel(
          effectivePlan
        )} coach messages for this month. Upgrade to continue.`
      );
      return;
    }

    setCoachLoading(true);
    setError("");
    setStatus("");
    setCoachResponse(null);

    try {
      const response = await fetch("/api/safespend-coach", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message,
          safeToSpend: protectedSafeToSpend,
          totalIncome: totals.totalIncome,
          totalSpent: totals.totalSpent,
          filterRange,
          categoryPressure,
          upcomingBills: billSummary.upcomingBills,
          dueSoonBillsTotal: billSummary.dueSoonTotal,
          userSettings,
          plan: effectivePlan,
          coachUsage: {
            used: monthlyCoachUsage,
            limit: coachLimit,
            remaining: coachRemaining,
          },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "SafeSpend Coach could not respond.");
        setCoachLoading(false);
        return;
      }

      await recordCoachUsage(userId);

      setCoachResponse(data);

      if (data.shouldAutofillTransaction && data.transaction) {
        setTransactionDate(data.transaction.date || getTodayDate());
        setType(data.transaction.type || "Expense");
        setCategory(data.transaction.category || "Other");
        setMerchant(data.transaction.merchant || "");
        setDescription(data.transaction.description || "");
        setAmount(String(data.transaction.amount || ""));
      }

      setCoachLoading(false);
    } catch {
      setError("SafeSpend Coach could not connect. Please try again.");
      setCoachLoading(false);
    }
  }

  async function handleSaveDetectedTransaction(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!userId) return;

    setSavingTransaction(true);
    setError("");
    setStatus("");

    const numericAmount = Number(amount);

    if (!numericAmount || numericAmount <= 0) {
      setError("Please enter an amount greater than 0.");
      setSavingTransaction(false);
      return;
    }

    const finalAmount =
      type === "Income" ? Math.abs(numericAmount) : -Math.abs(numericAmount);

    const { error } = await supabase.from("transactions").insert({
      user_id: userId,
      date: transactionDate,
      type,
      category,
      merchant: merchant.trim() || null,
      description: description.trim() || null,
      amount: finalAmount,
    });

    if (error) {
      setError(error.message);
      setSavingTransaction(false);
      return;
    }

    setTransactionDate(getTodayDate());
    setType("Expense");
    setCategory("Groceries");
    setMerchant("");
    setDescription("");
    setAmount("");
    setMessage("");
    setCoachResponse(null);

    await loadTransactions(userId);

    setStatus("Transaction saved.");
    setSavingTransaction(false);
  }

  function fillExample(example: string) {
    setMessage(example);
    setError("");
    setStatus("");
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f4f8fb]">
        <p className="text-lg font-bold text-[#061b3d]">Loading coach...</p>
      </main>
    );
  }

  return (
    <AppShell
      email={email}
      title="Ask SafeSpend before the money disappears."
      subtitle="Use the coach for purchase checks, transaction logging, and overspending recovery."
    >
      <section className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Plan"
          value={formatPlanLabel(effectivePlan)}
          helper={
            coachLimit === null
              ? "Unlimited coach access"
              : `${coachRemaining} messages left`
          }
          danger={coachLimitReached}
        />

        <MetricCard
          label="Protected Safe"
          value={money(protectedSafeToSpend)}
          helper="After upcoming bills"
          danger={protectedSafeToSpend <= 0}
        />

        <MetricCard
          label="Coach Usage"
          value={
            coachLimit === null
              ? `${monthlyCoachUsage} used`
              : `${monthlyCoachUsage}/${coachLimit}`
          }
          helper="This month"
          warning={
            coachLimit !== null &&
            coachRemaining !== null &&
            coachRemaining <= 3
          }
          danger={coachLimitReached}
        />

        <MetricCard
          label="Bills Due Soon"
          value={money(billSummary.dueSoonTotal)}
          helper={`${billSummary.dueSoonCount} due in 14 days`}
          warning={billSummary.dueSoonCount > 0}
        />
      </section>

      {coachLimitReached && (
        <section className="mb-6 rounded-[2rem] bg-gradient-to-br from-[#0637b8] via-[#0072b8] to-[#00a878] p-6 text-white shadow-xl">
          <p className="mb-2 inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-black uppercase tracking-widest">
            Monthly Limit Reached
          </p>

          <h3 className="text-3xl font-black tracking-[-0.04em]">
            You used all {coachLimit} coach messages for this month.
          </h3>

          <p className="mt-3 max-w-3xl text-sm leading-6 text-white/80">
            Upgrade to Plus for up to 100 AI coaching messages per month, or Pro
            for higher coaching usage, advanced reports, deeper insights, and
            priority future features.
          </p>

          <div className="mt-5 flex flex-wrap gap-3">
            <a
              href="/billing"
              className="rounded-full bg-white px-5 py-3 text-sm font-black text-[#061b3d]"
            >
              Upgrade Plan
            </a>

            <a
              href="/dashboard"
              className="rounded-full border border-white/25 bg-white/10 px-5 py-3 text-sm font-black text-white"
            >
              Back to Dashboard
            </a>
          </div>
        </section>
      )}

      {status && (
        <section className="mb-6 rounded-2xl bg-green-50 p-4 text-sm font-bold text-green-700">
          {status}
        </section>
      )}

      {error && (
        <section className="mb-6 rounded-2xl bg-red-50 p-4 text-sm font-bold text-red-600">
          {error}
        </section>
      )}

      <section className="grid gap-6 xl:grid-cols-[1.45fr_.55fr]">
        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl">
          <div className="mb-5 rounded-[2rem] bg-gradient-to-br from-[#0637b8] via-[#0072b8] to-[#00a878] p-7 text-white shadow-xl">
            <p className="mb-3 inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-black uppercase tracking-widest">
              SafeSpend AI Coach
            </p>

            <h3 className="text-4xl font-black leading-[0.95] tracking-[-0.05em] md:text-5xl">
              What happened with your money?
            </h3>

            <p className="mt-4 max-w-2xl text-sm leading-6 text-white/80">
              Ask for a purchase check, log spending, record income, or recover
              from overspending.
            </p>
          </div>

          <form onSubmit={handleAskCoach} className="space-y-4">
            <textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              disabled={coachLimitReached}
              className="min-h-40 w-full rounded-[2rem] border border-slate-200 bg-slate-50 px-5 py-5 text-lg font-semibold leading-8 text-[#061b3d] outline-none focus:ring-4 focus:ring-cyan-100 disabled:cursor-not-allowed disabled:opacity-60"
              placeholder="Example: Can I spend $150 on clothes this week?"
            />

            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="flex flex-wrap gap-2">
                {["Week", "Month", "All"].map((label) => {
                  const value = label.toLowerCase() as FilterRange;

                  return (
                    <button
                      key={label}
                      type="button"
                      onClick={() => setFilterRange(value)}
                      className={`rounded-full px-4 py-2 text-xs font-black ${
                        filterRange === value
                          ? "bg-gradient-to-r from-[#0b4edb] via-[#00b7c7] to-[#5ce05c] text-white shadow-lg"
                          : "border border-slate-200 bg-white text-[#061b3d]"
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>

              <button
                type="submit"
                disabled={coachLoading || !message.trim() || coachLimitReached}
                className="rounded-full bg-gradient-to-r from-[#0b4edb] via-[#00b7c7] to-[#5ce05c] px-8 py-4 text-base font-black text-white shadow-lg disabled:cursor-not-allowed disabled:opacity-60"
              >
                {coachLoading ? "Thinking..." : "Ask SafeSpend"}
              </button>
            </div>
          </form>

          <div className="mt-5 flex flex-wrap gap-2">
            {[
              "Can I spend 150 on clothes?",
              "I spent 64 at Publix yesterday",
              "I got paid 1200 today",
              "I overspent by 80 this week",
              "What should I avoid spending on until payday?",
            ].map((example) => (
              <button
                key={example}
                type="button"
                disabled={coachLimitReached}
                onClick={() => fillExample(example)}
                className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-bold text-[#061b3d] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {example}
              </button>
            ))}
          </div>

          {coachResponse && (
            <section className="mt-6 rounded-[2rem] border border-slate-100 bg-slate-50 p-6">
              <div className="mb-4 flex flex-wrap gap-2">
                <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-700">
                  {formatIntentLabel(coachResponse.intent)}
                </span>

                <span className="rounded-full bg-cyan-50 px-3 py-1 text-xs font-black text-cyan-700">
                  Risk: {coachResponse.coach.riskLevel}
                </span>

                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
                  Impact: {coachResponse.coach.safeToSpendImpact}
                </span>
              </div>

              <h3 className="text-2xl font-black text-[#061b3d]">
                SafeSpend Guidance
              </h3>

              <p className="mt-3 text-base leading-7 text-slate-700">
                {coachResponse.coach.summary}
              </p>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <GuidanceBlock
                  label="Recommendation"
                  text={coachResponse.coach.recommendation}
                />

                <GuidanceBlock
                  label="Next Best Action"
                  text={coachResponse.coach.nextBestAction}
                  highlighted
                />
              </div>
            </section>
          )}
        </section>

        <aside className="space-y-6">
          {userSettings ? (
            <section className="rounded-[2rem] border border-green-100 bg-green-50 p-5 shadow-lg">
              <p className="text-sm font-black text-green-700">
                Personal settings active
              </p>
              <p className="mt-2 text-sm leading-6 text-green-700">
                Coach guidance is using your spending style and top money
                priority.
              </p>
            </section>
          ) : (
            <section className="rounded-[2rem] border border-yellow-100 bg-yellow-50 p-5 shadow-lg">
              <p className="text-sm font-black text-yellow-800">
                Personalize your coach
              </p>
              <p className="mt-2 text-sm leading-6 text-yellow-700">
                Add your paycheck rhythm, spending style, and top priority for
                better guidance.
              </p>
              <a
                href="/settings"
                className="mt-4 inline-flex rounded-full bg-white px-4 py-2 text-sm font-black text-yellow-800"
              >
                Open Settings
              </a>
            </section>
          )}

          {coachResponse?.shouldAutofillTransaction && (
            <form
              onSubmit={handleSaveDetectedTransaction}
              className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-xl"
            >
              <h3 className="text-xl font-black text-[#061b3d]">
                Save Detected Transaction
              </h3>

              <div className="mt-4 space-y-3">
                <input
                  type="date"
                  required
                  value={transactionDate}
                  onChange={(event) => setTransactionDate(event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:ring-4 focus:ring-cyan-100"
                />

                <select
                  value={type}
                  onChange={(event) =>
                    setType(event.target.value as Transaction["type"])
                  }
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:ring-4 focus:ring-cyan-100"
                >
                  <option value="Income">Income</option>
                  <option value="Expense">Expense</option>
                  <option value="Transfer">Transfer</option>
                  <option value="Debt">Debt</option>
                  <option value="Savings">Savings</option>
                  <option value="Event">Event</option>
                </select>

                <select
                  value={category}
                  onChange={(event) => setCategory(event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:ring-4 focus:ring-cyan-100"
                >
                  {categories.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>

                <input
                  value={merchant}
                  onChange={(event) => setMerchant(event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:ring-4 focus:ring-cyan-100"
                  placeholder="Merchant / Person"
                />

                <input
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:ring-4 focus:ring-cyan-100"
                  placeholder="Description"
                />

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:ring-4 focus:ring-cyan-100"
                  placeholder="Amount"
                />

                <button
                  type="submit"
                  disabled={savingTransaction}
                  className="w-full rounded-full bg-gradient-to-r from-[#0b4edb] via-[#00b7c7] to-[#5ce05c] px-5 py-3 font-black text-white shadow-lg disabled:opacity-60"
                >
                  {savingTransaction ? "Saving..." : "Save Transaction"}
                </button>
              </div>
            </form>
          )}

          {coachResponse && !coachResponse.shouldAutofillTransaction && (
            <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-xl">
              <h3 className="text-xl font-black text-[#061b3d]">
                No transaction to save
              </h3>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                This response was guidance only, so nothing needs to be added to
                your transaction history.
              </p>
            </section>
          )}
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

function GuidanceBlock({
  label,
  text,
  highlighted = false,
}: {
  label: string;
  text: string;
  highlighted?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl p-4 ${
        highlighted
          ? "bg-gradient-to-r from-[#eefbff] to-[#f4fff6]"
          : "bg-white"
      }`}
    >
      <p className="text-xs font-black uppercase tracking-widest text-slate-500">
        {label}
      </p>
      <p className="mt-1 text-sm font-bold leading-6 text-[#061b3d]">{text}</p>
    </div>
  );
}