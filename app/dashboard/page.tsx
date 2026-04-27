"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
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

type Budget = {
  id: string;
  user_id: string;
  category: string;
  weekly_limit: number;
  monthly_limit: number;
  created_at: string;
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
  const [userSettings, setUserSettings] = useState<UserSettings | null>(null);
  const [filterRange, setFilterRange] = useState<FilterRange>("week");

  const [transactionDate, setTransactionDate] = useState(getTodayDate());
  const [type, setType] = useState<Transaction["type"]>("Expense");
  const [category, setCategory] = useState("Groceries");
  const [merchant, setMerchant] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDate, setEditDate] = useState("");
  const [editType, setEditType] = useState<Transaction["type"]>("Expense");
  const [editCategory, setEditCategory] = useState("Groceries");
  const [editMerchant, setEditMerchant] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editAmount, setEditAmount] = useState("");

  const [aiMessage, setAiMessage] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResponse, setAiResponse] =
    useState<SafeSpendCoachResponse | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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
          totalIncome: totals.totalIncome,
          totalSpent: totals.totalSpent,
          filterRange,
          categoryPressure,
          userSettings,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "SafeSpend AI could not respond.");
        setAiLoading(false);
        return;
      }

      setAiResponse(data);

      if (data.shouldAutofillTransaction && data.transaction) {
        setTransactionDate(data.transaction.date || getTodayDate());
        setType(data.transaction.type || "Expense");
        setCategory(data.transaction.category || "Other");
        setMerchant(data.transaction.merchant || "");
        setDescription(data.transaction.description || "");
        setAmount(String(data.transaction.amount || ""));
      }

      setAiLoading(false);
    } catch {
      setError("SafeSpend AI could not connect. Please try again.");
      setAiLoading(false);
    }
  }

  async function handleAddTransaction(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!userId) return;

    setSaving(true);
    setError("");

    const numericAmount = Number(amount);

    if (!numericAmount || numericAmount <= 0) {
      setError("Please enter an amount greater than 0.");
      setSaving(false);
      return;
    }

    const finalAmount =
      type === "Income" ? numericAmount : -Math.abs(numericAmount);

    const { error } = await supabase.from("transactions").insert({
      user_id: userId,
      date: transactionDate,
      type,
      category,
      merchant: merchant || null,
      description: description || null,
      amount: finalAmount,
    });

    if (error) {
      setError(error.message);
      setSaving(false);
      return;
    }

    setTransactionDate(getTodayDate());
    setType("Expense");
    setCategory("Groceries");
    setMerchant("");
    setDescription("");
    setAmount("");
    setAiMessage("");
    setAiResponse(null);

    await loadTransactions(userId);
    setSaving(false);
  }

  function startEditing(tx: Transaction) {
    setEditingId(tx.id);
    setEditDate(tx.date || getTodayDate());
    setEditType(tx.type);
    setEditCategory(tx.category);
    setEditMerchant(tx.merchant || "");
    setEditDescription(tx.description || "");
    setEditAmount(String(Math.abs(Number(tx.amount))));
    setError("");
  }

  function cancelEditing() {
    setEditingId(null);
    setEditDate("");
    setEditMerchant("");
    setEditDescription("");
    setEditAmount("");
    setError("");
  }

  async function handleUpdateTransaction(txId: string) {
    if (!userId) return;

    setSaving(true);
    setError("");

    const numericAmount = Number(editAmount);

    if (!numericAmount || numericAmount <= 0) {
      setError("Please enter an amount greater than 0.");
      setSaving(false);
      return;
    }

    const finalAmount =
      editType === "Income" ? numericAmount : -Math.abs(numericAmount);

    const { error } = await supabase
      .from("transactions")
      .update({
        date: editDate,
        type: editType,
        category: editCategory,
        merchant: editMerchant || null,
        description: editDescription || null,
        amount: finalAmount,
      })
      .eq("id", txId)
      .eq("user_id", userId);

    if (error) {
      setError(error.message);
      setSaving(false);
      return;
    }

    cancelEditing();
    await loadTransactions(userId);
    setSaving(false);
  }

  async function handleDeleteTransaction(txId: string) {
    if (!userId) return;

    const confirmed = window.confirm(
      "Delete this transaction? This cannot be undone."
    );

    if (!confirmed) return;

    setError("");

    const { error } = await supabase
      .from("transactions")
      .delete()
      .eq("id", txId)
      .eq("user_id", userId);

    if (error) {
      setError(error.message);
      return;
    }

    await loadTransactions(userId);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  function money(value: number) {
    return value.toLocaleString("en-US", {
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

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f4f8fb]">
        <p className="text-lg font-bold text-[#061b3d]">
          Loading SafeSpend...
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#eefbff] via-white to-[#f7fbfd] px-6 py-8 text-[#102033]">
      <section className="mx-auto max-w-6xl">
        <header className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <img
              src="/safespend-logo.png"
              alt="SafeSpend AI logo"
              className="h-14 w-14 rounded-2xl shadow-lg"
            />

            <div>
              <h1 className="text-2xl font-black text-[#061b3d]">
                SafeSpend AI
              </h1>
              <p className="text-sm text-slate-500">{email}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <a
              href="/budgets"
              className="rounded-full border border-slate-200 bg-white px-5 py-3 font-black text-[#061b3d] shadow-sm"
            >
              Budgets
            </a>

            <a
              href="/settings"
              className="rounded-full border border-slate-200 bg-white px-5 py-3 font-black text-[#061b3d] shadow-sm"
            >
              Settings
            </a>

            <button
              type="button"
              onClick={handleLogout}
              className="rounded-full border border-slate-200 bg-white px-5 py-3 font-black text-[#061b3d] shadow-sm"
            >
              Log Out
            </button>
          </div>
        </header>

        <section className="mb-6 rounded-[2rem] bg-gradient-to-br from-[#0637b8] via-[#0072b8] to-[#00a878] p-8 text-white shadow-2xl">
          <div className="grid gap-6 md:grid-cols-[1.2fr_.8fr] md:items-center">
            <div>
              <p className="mb-3 inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-bold">
                Your spending control center
              </p>

              <h2 className="text-5xl font-black leading-[0.95] tracking-[-0.05em] md:text-6xl">
                Stop overspending before it happens.
              </h2>

              <p className="mt-5 max-w-2xl text-white/80">
                Add income, expenses, weekly limits, and personal settings so
                SafeSpend can guide your real spending decisions.
              </p>
            </div>

            <div className="rounded-3xl border border-white/20 bg-white/15 p-6 backdrop-blur">
              <p className="text-sm font-black uppercase tracking-widest text-white/70">
                Safe to Spend
              </p>

              <p className="mt-3 text-5xl font-black">
                {money(totals.safeToSpend)}
              </p>

              <p className="mt-4 inline-flex rounded-full bg-white/15 px-4 py-2 text-sm font-bold">
                Risk Level: {totals.risk}
              </p>
            </div>
          </div>
        </section>

        <section className="mb-4 flex flex-wrap gap-3 rounded-[2rem] border border-slate-200 bg-white p-4 shadow-lg">
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

        <section className="mb-6 grid gap-4 md:grid-cols-4">
          <MetricCard label="Total Income" value={money(totals.totalIncome)} />
          <MetricCard label="Total Spent" value={money(totals.totalSpent)} />
          <MetricCard label="Safe to Spend" value={money(totals.safeToSpend)} />
          <MetricCard label="Risk Level" value={totals.risk} />
        </section>

        <section className="mb-6 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl">
          <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="text-2xl font-black text-[#061b3d]">
                Category Pressure
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                Based on your weekly budget limits and selected date filter.
              </p>
            </div>

            <a
              href="/budgets"
              className="rounded-full bg-gradient-to-r from-[#0b4edb] via-[#00b7c7] to-[#5ce05c] px-5 py-3 text-center font-black text-white shadow-lg"
            >
              Edit Budgets
            </a>
          </div>

          {categoryPressure.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
              <h4 className="text-xl font-black text-[#061b3d]">
                Set your weekly spending guardrails
              </h4>

              <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500">
                Add weekly limits for groceries, shopping, dining,
                transportation, and subscriptions. SafeSpend will use those
                limits to show when you are on track, close to overspending, or
                over budget.
              </p>

              <div className="mt-5 flex flex-wrap justify-center gap-3">
                <a
                  href="/onboarding"
                  className="rounded-full bg-gradient-to-r from-[#0b4edb] via-[#00b7c7] to-[#5ce05c] px-5 py-3 text-sm font-black text-white shadow-lg"
                >
                  Start Setup
                </a>

                <a
                  href="/budgets"
                  className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-black text-[#061b3d]"
                >
                  Edit Budgets
                </a>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {categoryPressure.map((item) => (
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

        <section className="mb-6 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl">
          <div className="mb-5">
            <p className="mb-2 inline-flex rounded-full bg-cyan-50 px-4 py-2 text-xs font-black uppercase tracking-widest text-cyan-700">
              SafeSpend AI Coach
            </p>

            <h3 className="text-2xl font-black text-[#061b3d]">
              Tell SafeSpend what happened.
            </h3>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Log a transaction, check a purchase before buying, or ask for help
              after overspending. SafeSpend will fill the form when it detects a
              transaction.
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
            onSubmit={handleSafeSpendCoach}
            className="grid gap-3 md:grid-cols-[1fr_auto]"
          >
            <input
              value={aiMessage}
              onChange={(event) => setAiMessage(event.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:ring-4 focus:ring-cyan-100"
              placeholder="Example: I spent 64 at Publix yesterday"
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
              "I spent 64 at Publix yesterday",
              "I got paid 1200 today",
              "Can I spend 150 on clothes?",
              "I overspent by 80 this week",
              "I paid 200 toward my credit card",
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
            <div className="mt-5 grid gap-4 md:grid-cols-[.9fr_1.1fr]">
              <div className="rounded-3xl border border-slate-100 bg-slate-50 p-5">
                <p className="text-xs font-black uppercase tracking-widest text-slate-500">
                  Detected
                </p>

                <h4 className="mt-2 text-xl font-black text-[#061b3d]">
                  {formatIntentLabel(aiResponse.intent)}
                </h4>

                <div className="mt-4 space-y-2 text-sm text-slate-600">
                  <p>
                    <strong>Type:</strong> {aiResponse.transaction.type}
                  </p>
                  <p>
                    <strong>Category:</strong>{" "}
                    {aiResponse.transaction.category}
                  </p>
                  <p>
                    <strong>Merchant:</strong>{" "}
                    {aiResponse.transaction.merchant}
                  </p>
                  <p>
                    <strong>Amount:</strong>{" "}
                    {money(aiResponse.transaction.amount)}
                  </p>
                  <p>
                    <strong>Date:</strong> {aiResponse.transaction.date}
                  </p>
                </div>

                {aiResponse.shouldAutofillTransaction ? (
                  <p className="mt-4 rounded-2xl bg-green-50 p-3 text-sm font-bold text-green-700">
                    Transaction form filled. Review it, then click Add
                    Transaction.
                  </p>
                ) : (
                  <p className="mt-4 rounded-2xl bg-yellow-50 p-3 text-sm font-bold text-yellow-700">
                    This looks like guidance, not a transaction to save.
                  </p>
                )}
              </div>

              <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
                <div className="mb-4 flex flex-wrap gap-2">
                  <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-700">
                    Risk: {aiResponse.coach.riskLevel}
                  </span>

                  <span className="rounded-full bg-cyan-50 px-3 py-1 text-xs font-black text-cyan-700">
                    Category: {aiResponse.coach.categoryStatus}
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

                <div className="mt-4 space-y-3">
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-xs font-black uppercase tracking-widest text-slate-500">
                      Weekly Impact
                    </p>
                    <p className="mt-1 text-sm leading-6 text-slate-600">
                      {aiResponse.coach.weeklyImpact}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-slate-50 p-4">
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
            </div>
          )}

          {error && (
            <p className="mt-4 rounded-2xl bg-red-50 p-3 text-sm font-bold text-red-600">
              {error}
            </p>
          )}
        </section>

        <section className="grid gap-6 md:grid-cols-[.9fr_1.1fr]">
          <form
            onSubmit={handleAddTransaction}
            className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl"
          >
            <h3 className="mb-5 text-2xl font-black text-[#061b3d]">
              Add Transaction
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
              disabled={saving}
              className="w-full rounded-full bg-gradient-to-r from-[#0b4edb] via-[#00b7c7] to-[#5ce05c] px-6 py-3 font-black text-white shadow-lg disabled:opacity-60"
            >
              {saving ? "Saving..." : "Add Transaction"}
            </button>
          </form>

          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl">
            <h3 className="mb-5 text-2xl font-black text-[#061b3d]">
              Recent Transactions
            </h3>

            {filteredTransactions.length === 0 ? (
              <p className="rounded-2xl bg-slate-50 p-5 text-slate-500">
                No transactions found for this filter.
              </p>
            ) : (
              <div className="space-y-3">
                {filteredTransactions.slice(0, 15).map((tx) => (
                  <div
                    key={tx.id}
                    className="rounded-2xl border border-slate-100 bg-slate-50 p-4"
                  >
                    {editingId === tx.id ? (
                      <div className="space-y-3">
                        <input
                          type="date"
                          value={editDate}
                          onChange={(event) => setEditDate(event.target.value)}
                          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none focus:ring-4 focus:ring-cyan-100"
                        />

                        <div className="grid gap-3 md:grid-cols-2">
                          <select
                            value={editType}
                            onChange={(event) =>
                              setEditType(
                                event.target.value as Transaction["type"]
                              )
                            }
                            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none focus:ring-4 focus:ring-cyan-100"
                          >
                            <option value="Income">Income</option>
                            <option value="Expense">Expense</option>
                            <option value="Transfer">Transfer</option>
                            <option value="Debt">Debt</option>
                            <option value="Savings">Savings</option>
                            <option value="Event">Event</option>
                          </select>

                          <select
                            value={editCategory}
                            onChange={(event) =>
                              setEditCategory(event.target.value)
                            }
                            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none focus:ring-4 focus:ring-cyan-100"
                          >
                            {categories.map((item) => (
                              <option key={item} value={item}>
                                {item}
                              </option>
                            ))}
                          </select>
                        </div>

                        <input
                          value={editMerchant}
                          onChange={(event) =>
                            setEditMerchant(event.target.value)
                          }
                          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none focus:ring-4 focus:ring-cyan-100"
                          placeholder="Merchant / Person"
                        />

                        <input
                          value={editDescription}
                          onChange={(event) =>
                            setEditDescription(event.target.value)
                          }
                          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none focus:ring-4 focus:ring-cyan-100"
                          placeholder="Description"
                        />

                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={editAmount}
                          onChange={(event) =>
                            setEditAmount(event.target.value)
                          }
                          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none focus:ring-4 focus:ring-cyan-100"
                          placeholder="Amount"
                        />

                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => handleUpdateTransaction(tx.id)}
                            disabled={saving}
                            className="rounded-full bg-gradient-to-r from-[#0b4edb] via-[#00b7c7] to-[#5ce05c] px-4 py-2 text-sm font-black text-white"
                          >
                            Save
                          </button>

                          <button
                            type="button"
                            onClick={cancelEditing}
                            className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-black text-[#061b3d]"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between gap-4">
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

                        <div className="text-right">
                          <p
                            className={`font-black ${
                              Number(tx.amount) < 0
                                ? "text-red-500"
                                : "text-green-600"
                            }`}
                          >
                            {money(Number(tx.amount))}
                          </p>

                          <div className="mt-2 flex gap-2">
                            <button
                              type="button"
                              onClick={() => startEditing(tx)}
                              className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-black text-[#061b3d]"
                            >
                              Edit
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDeleteTransaction(tx.id)}
                              className="rounded-full border border-red-100 bg-red-50 px-3 py-1 text-xs font-black text-red-600"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </section>
    </main>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-lg">
      <p className="text-xs font-black uppercase tracking-widest text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-2xl font-black text-[#061b3d]">{value}</p>
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