"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import AppShell from "@/components/AppShell";
import BillingGate from "@/components/BillingGate";

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

function getTodayDate() {
  return new Date().toISOString().split("T")[0];
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

    const overdueBills = unpaidBills.filter(
      (bill) => daysUntil(bill.due_date) < 0
    );

    const dueSoonTotal = dueSoonBills.reduce(
      (sum, bill) => sum + Number(bill.amount || 0),
      0
    );

    return {
      dueSoonCount: dueSoonBills.length,
      overdueCount: overdueBills.length,
      dueSoonTotal,
      upcomingBills: dueSoonBills.slice(0, 5),
    };
  }, [bills]);

  const protectedSafeToSpend = totals.safeToSpend - billSummary.dueSoonTotal;

  async function handleAskCoach(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!message.trim()) {
      setError("Please enter a message for SafeSpend Coach.");
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
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "SafeSpend Coach could not respond.");
        setCoachLoading(false);
        return;
      }

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
      title="Ask before the money disappears."
      subtitle="Use SafeSpend Coach for purchase checks, overspending recovery, bill-aware guidance, and natural-language transaction logging."
    >
      <BillingGate requiredPlan="plus" featureName="SafeSpend AI Coach">
        <section className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Safe to Spend"
            value={money(totals.safeToSpend)}
            helper="Before upcoming bills"
            danger={totals.safeToSpend <= 0}
          />

          <MetricCard
            label="Protected Safe"
            value={money(protectedSafeToSpend)}
            helper="After bills due soon"
            danger={protectedSafeToSpend <= 0}
          />

          <MetricCard
            label="Risk Level"
            value={totals.risk}
            helper={`${totals.count} entries in view`}
            danger={totals.risk === "Critical" || totals.risk === "High"}
          />

          <MetricCard
            label="Bills Due Soon"
            value={money(billSummary.dueSoonTotal)}
            helper={`${billSummary.dueSoonCount} due within 14 days`}
            warning={billSummary.dueSoonCount > 0}
          />
        </section>

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

        <section className="mb-6 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl">
          <div className="mb-5">
            <p className="mb-2 inline-flex rounded-full bg-cyan-50 px-4 py-2 text-xs font-black uppercase tracking-widest text-cyan-700">
              SafeSpend AI Coach
            </p>

            <h3 className="text-2xl font-black text-[#061b3d]">
              Tell SafeSpend what happened or what you want to buy.
            </h3>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
              Ask in plain English. SafeSpend can detect spending, income, debt
              payments, purchase checks, and overspending recovery needs.
            </p>

            {userSettings ? (
              <p className="mt-3 inline-flex rounded-full bg-green-50 px-4 py-2 text-xs font-black text-green-700">
                Personal settings active
              </p>
            ) : (
              <a
                href="/settings"
                className="mt-3 inline-flex rounded-full bg-yellow-50 px-4 py-2 text-xs font-black text-yellow-700"
              >
                Add personal settings for better guidance →
              </a>
            )}
          </div>

          <form
            onSubmit={handleAskCoach}
            className="grid gap-3 md:grid-cols-[1fr_auto]"
          >
            <input
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:ring-4 focus:ring-cyan-100"
              placeholder="Example: Can I spend $150 on clothes this week?"
            />

            <button
              type="submit"
              disabled={coachLoading || !message.trim()}
              className="rounded-full bg-gradient-to-r from-[#0b4edb] via-[#00b7c7] to-[#5ce05c] px-6 py-3 font-black text-white shadow-lg disabled:opacity-60"
            >
              {coachLoading ? "Thinking..." : "Ask SafeSpend"}
            </button>
          </form>

          <div className="mt-4 flex flex-wrap gap-2">
            {[
              "I spent 64 at Publix yesterday",
              "I got paid 1200 today",
              "Can I spend 150 on clothes?",
              "I overspent by 80 this week",
              "I paid 200 toward my credit card",
              "What should I avoid spending on until payday?",
            ].map((example) => (
              <button
                key={example}
                type="button"
                onClick={() => fillExample(example)}
                className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-bold text-[#061b3d]"
              >
                {example}
              </button>
            ))}
          </div>
        </section>

        {coachResponse && (
          <section className="mb-6 grid gap-6 xl:grid-cols-[.85fr_1.15fr]">
            <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl">
              <p className="mb-2 inline-flex rounded-full bg-blue-50 px-4 py-2 text-xs font-black uppercase tracking-widest text-blue-700">
                Detected
              </p>

              <h3 className="text-2xl font-black text-[#061b3d]">
                {formatIntentLabel(coachResponse.intent)}
              </h3>

              <div className="mt-5 space-y-3">
                <InfoRow label="Date" value={coachResponse.transaction.date} />
                <InfoRow label="Type" value={coachResponse.transaction.type} />
                <InfoRow
                  label="Category"
                  value={coachResponse.transaction.category}
                />
                <InfoRow
                  label="Merchant / Person"
                  value={coachResponse.transaction.merchant || "Not detected"}
                />
                <InfoRow
                  label="Amount"
                  value={money(Number(coachResponse.transaction.amount || 0))}
                />
              </div>

              {coachResponse.shouldAutofillTransaction ? (
                <p className="mt-5 rounded-2xl bg-green-50 p-4 text-sm font-bold leading-6 text-green-700">
                  SafeSpend detected a transaction. Review the form below and
                  save it if everything looks right.
                </p>
              ) : (
                <p className="mt-5 rounded-2xl bg-yellow-50 p-4 text-sm font-bold leading-6 text-yellow-700">
                  This looks like guidance, not a transaction to save.
                </p>
              )}
            </section>

            <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl">
              <div className="mb-4 flex flex-wrap gap-2">
                <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-700">
                  Risk: {coachResponse.coach.riskLevel}
                </span>

                <span className="rounded-full bg-cyan-50 px-3 py-1 text-xs font-black text-cyan-700">
                  Category: {coachResponse.coach.categoryStatus}
                </span>

                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
                  Impact: {coachResponse.coach.safeToSpendImpact}
                </span>
              </div>

              <h3 className="text-2xl font-black text-[#061b3d]">
                SafeSpend Guidance
              </h3>

              <p className="mt-3 text-sm leading-6 text-slate-600">
                {coachResponse.coach.summary}
              </p>

              <div className="mt-5 space-y-3">
                <GuidanceBlock
                  label="Weekly Impact"
                  text={coachResponse.coach.weeklyImpact}
                />

                <GuidanceBlock
                  label="Recommendation"
                  text={coachResponse.coach.recommendation}
                />

                <div className="rounded-2xl bg-gradient-to-r from-[#eefbff] to-[#f4fff6] p-4">
                  <p className="text-xs font-black uppercase tracking-widest text-[#061b3d]">
                    Next Best Action
                  </p>
                  <p className="mt-1 text-sm font-bold leading-6 text-[#061b3d]">
                    {coachResponse.coach.nextBestAction}
                  </p>
                </div>
              </div>
            </section>
          </section>
        )}

        <section className="grid gap-6 xl:grid-cols-[.85fr_1.15fr]">
          <form
            onSubmit={handleSaveDetectedTransaction}
            className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl"
          >
            <h3 className="mb-5 text-2xl font-black text-[#061b3d]">
              Save Detected Transaction
            </h3>

            <label className="mb-2 block text-sm font-bold text-[#061b3d]">
              Transaction Date
            </label>
            <input
              type="date"
              required
              value={transactionDate}
              onChange={(event) => setTransactionDate(event.target.value)}
              className="mb-4 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:ring-4 focus:ring-cyan-100"
            />

            <label className="mb-2 block text-sm font-bold text-[#061b3d]">
              Type
            </label>
            <select
              value={type}
              onChange={(event) =>
                setType(event.target.value as Transaction["type"])
              }
              className="mb-4 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:ring-4 focus:ring-cyan-100"
            >
              <option value="Income">Income</option>
              <option value="Expense">Expense</option>
              <option value="Transfer">Transfer</option>
              <option value="Debt">Debt</option>
              <option value="Savings">Savings</option>
              <option value="Event">Event</option>
            </select>

            <label className="mb-2 block text-sm font-bold text-[#061b3d]">
              Category
            </label>
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              className="mb-4 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:ring-4 focus:ring-cyan-100"
            >
              {categories.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>

            <label className="mb-2 block text-sm font-bold text-[#061b3d]">
              Merchant / Person
            </label>
            <input
              value={merchant}
              onChange={(event) => setMerchant(event.target.value)}
              className="mb-4 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:ring-4 focus:ring-cyan-100"
              placeholder="Publix, Kroger, Payroll, Zelle..."
            />

            <label className="mb-2 block text-sm font-bold text-[#061b3d]">
              Description
            </label>
            <input
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              className="mb-4 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:ring-4 focus:ring-cyan-100"
              placeholder="Short note"
            />

            <label className="mb-2 block text-sm font-bold text-[#061b3d]">
              Amount
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              required
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              className="mb-5 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:ring-4 focus:ring-cyan-100"
              placeholder="64.00"
            />

            <button
              type="submit"
              disabled={savingTransaction}
              className="w-full rounded-full bg-gradient-to-r from-[#0b4edb] via-[#00b7c7] to-[#5ce05c] px-6 py-3 font-black text-white shadow-lg disabled:opacity-60"
            >
              {savingTransaction ? "Saving..." : "Save Transaction"}
            </button>
          </form>

          <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl">
            <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h3 className="text-2xl font-black text-[#061b3d]">
                  Recent Activity
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  Latest transactions in your selected view.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <FilterButton
                  label="Week"
                  active={filterRange === "week"}
                  onClick={() => setFilterRange("week")}
                />
                <FilterButton
                  label="Month"
                  active={filterRange === "month"}
                  onClick={() => setFilterRange("month")}
                />
                <FilterButton
                  label="All"
                  active={filterRange === "all"}
                  onClick={() => setFilterRange("all")}
                />
              </div>
            </div>

            {filteredTransactions.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
                <h4 className="text-xl font-black text-[#061b3d]">
                  No recent activity yet
                </h4>
                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                  Ask SafeSpend to log spending or income, then save the
                  detected transaction.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredTransactions.slice(0, 8).map((tx) => (
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
        </section>
      </BillingGate>
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

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
      <p className="text-xs font-black uppercase tracking-widest text-slate-500">
        {label}
      </p>
      <p className="mt-1 break-words text-sm font-bold text-[#061b3d]">
        {value}
      </p>
    </div>
  );
}

function GuidanceBlock({ label, text }: { label: string; text: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <p className="text-xs font-black uppercase tracking-widest text-slate-500">
        {label}
      </p>
      <p className="mt-1 text-sm leading-6 text-slate-600">{text}</p>
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
      className={`rounded-full px-4 py-2 text-xs font-black ${
        active
          ? "bg-gradient-to-r from-[#0b4edb] via-[#00b7c7] to-[#5ce05c] text-white shadow-lg"
          : "border border-slate-200 bg-white text-[#061b3d]"
      }`}
    >
      {label}
    </button>
  );
}