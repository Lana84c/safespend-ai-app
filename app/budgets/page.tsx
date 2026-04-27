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

type Budget = {
  id: string;
  user_id: string;
  category: string;
  weekly_limit: number;
  monthly_limit: number;
  created_at: string;
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

const FREE_BUDGET_LIMIT = 3;

const categories = [
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

function money(value: number) {
  return Number(value || 0).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });
}

function getWeekStartDate() {
  const now = new Date();
  const start = new Date(now);
  const day = start.getDay();
  const diff = start.getDate() - day;
  start.setDate(diff);
  start.setHours(0, 0, 0, 0);
  return start;
}

function getMonthStartDate() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  start.setHours(0, 0, 0, 0);
  return start;
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

function formatPlanLabel(plan: PlanKey) {
  return plan.charAt(0).toUpperCase() + plan.slice(1);
}

export default function BudgetsPage() {
  const router = useRouter();

  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [billing, setBilling] = useState<BillingRecord | null>(null);

  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  const [category, setCategory] = useState("Groceries");
  const [weeklyLimit, setWeeklyLimit] = useState("");
  const [monthlyLimit, setMonthlyLimit] = useState("");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editCategory, setEditCategory] = useState("Groceries");
  const [editWeeklyLimit, setEditWeeklyLimit] = useState("");
  const [editMonthlyLimit, setEditMonthlyLimit] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");

  const effectivePlan = getEffectivePlan(billing);
  const isFreePlan = effectivePlan === "free";
  const freeBudgetsRemaining = Math.max(FREE_BUDGET_LIMIT - budgets.length, 0);
  const freeBudgetLimitReached = isFreePlan && budgets.length >= FREE_BUDGET_LIMIT;

  useEffect(() => {
    checkUser();
  }, []);

  async function checkUser() {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
      setError(userError.message);
      setLoading(false);
      return;
    }

    if (!user) {
      router.push("/login");
      return;
    }

    setUserId(user.id);
    setEmail(user.email || "");

    await Promise.all([
      loadBilling(user.id),
      loadBudgets(user.id),
      loadTransactions(user.id),
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

  async function recordBudgetUsage(currentUserId: string) {
    const { error } = await supabase.from("usage_events").insert({
      user_id: currentUserId,
      event_type: "budget_created",
      metadata: {
        plan: effectivePlan,
      },
    });

    if (error) {
      console.warn("Unable to record budget usage event:", error.message);
    }
  }

  const budgetSummary = useMemo(() => {
    const weekStart = getWeekStartDate();
    const monthStart = getMonthStartDate();

    const rows = budgets.map((budget) => {
      const weeklySpent = transactions
        .filter((tx) => {
          const txDate = new Date(`${tx.date || getTodayDate()}T00:00:00`);
          return (
            tx.category === budget.category &&
            Number(tx.amount) < 0 &&
            txDate >= weekStart
          );
        })
        .reduce((sum, tx) => sum + Math.abs(Number(tx.amount)), 0);

      const monthlySpent = transactions
        .filter((tx) => {
          const txDate = new Date(`${tx.date || getTodayDate()}T00:00:00`);
          return (
            tx.category === budget.category &&
            Number(tx.amount) < 0 &&
            txDate >= monthStart
          );
        })
        .reduce((sum, tx) => sum + Math.abs(Number(tx.amount)), 0);

      const weeklyLimitValue = Number(budget.weekly_limit || 0);
      const monthlyLimitValue = Number(budget.monthly_limit || 0);

      const weeklyPercent =
        weeklyLimitValue > 0
          ? Math.round((weeklySpent / weeklyLimitValue) * 100)
          : 0;

      const monthlyPercent =
        monthlyLimitValue > 0
          ? Math.round((monthlySpent / monthlyLimitValue) * 100)
          : 0;

      const weeklyStatus =
        weeklyPercent >= 100
          ? "Over Budget"
          : weeklyPercent >= 80
            ? "Close"
            : "OK";

      const monthlyStatus =
        monthlyPercent >= 100
          ? "Over Budget"
          : monthlyPercent >= 80
            ? "Close"
            : "OK";

      return {
        ...budget,
        weeklySpent,
        monthlySpent,
        weeklyPercent,
        monthlyPercent,
        weeklyStatus,
        monthlyStatus,
      };
    });

    const totalWeeklyLimit = budgets.reduce(
      (sum, budget) => sum + Number(budget.weekly_limit || 0),
      0
    );

    const totalMonthlyLimit = budgets.reduce(
      (sum, budget) => sum + Number(budget.monthly_limit || 0),
      0
    );

    const totalWeeklySpent = rows.reduce(
      (sum, row) => sum + Number(row.weeklySpent || 0),
      0
    );

    const totalMonthlySpent = rows.reduce(
      (sum, row) => sum + Number(row.monthlySpent || 0),
      0
    );

    const overBudgetCount = rows.filter(
      (row) => row.weeklyStatus === "Over Budget" || row.monthlyStatus === "Over Budget"
    ).length;

    const closeCount = rows.filter(
      (row) => row.weeklyStatus === "Close" || row.monthlyStatus === "Close"
    ).length;

    return {
      rows,
      totalWeeklyLimit,
      totalMonthlyLimit,
      totalWeeklySpent,
      totalMonthlySpent,
      overBudgetCount,
      closeCount,
    };
  }, [budgets, transactions]);

  async function handleAddBudget(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!userId) return;

    setSaving(true);
    setError("");
    setStatus("");

    if (freeBudgetLimitReached) {
      setError(
        `Free plan limit reached. You can create up to ${FREE_BUDGET_LIMIT} budgets on Free. Upgrade to Plus for unlimited budgets.`
      );
      setSaving(false);
      return;
    }

    const weekly = Number(weeklyLimit || 0);
    const monthly = Number(monthlyLimit || 0);

    if (weekly < 0 || monthly < 0) {
      setError("Budget limits cannot be negative.");
      setSaving(false);
      return;
    }

    if (weekly === 0 && monthly === 0) {
      setError("Please enter at least one weekly or monthly limit.");
      setSaving(false);
      return;
    }

    const existingBudget = budgets.find((budget) => budget.category === category);

    if (existingBudget) {
      setError("That category already has a budget. Edit the existing one instead.");
      setSaving(false);
      return;
    }

    const { error } = await supabase.from("budgets").insert({
      user_id: userId,
      category,
      weekly_limit: weekly,
      monthly_limit: monthly,
    });

    if (error) {
      setError(error.message);
      setSaving(false);
      return;
    }

    await recordBudgetUsage(userId);

    setCategory("Groceries");
    setWeeklyLimit("");
    setMonthlyLimit("");

    await loadBudgets(userId);

    setStatus("Budget added.");
    setSaving(false);
  }

  function startEditing(budget: Budget) {
    setEditingId(budget.id);
    setEditCategory(budget.category);
    setEditWeeklyLimit(String(Number(budget.weekly_limit || 0)));
    setEditMonthlyLimit(String(Number(budget.monthly_limit || 0)));
    setError("");
    setStatus("");
  }

  function cancelEditing() {
    setEditingId(null);
    setEditCategory("Groceries");
    setEditWeeklyLimit("");
    setEditMonthlyLimit("");
    setError("");
  }

  async function handleUpdateBudget(budgetId: string) {
    if (!userId) return;

    setSaving(true);
    setError("");
    setStatus("");

    const weekly = Number(editWeeklyLimit || 0);
    const monthly = Number(editMonthlyLimit || 0);

    if (weekly < 0 || monthly < 0) {
      setError("Budget limits cannot be negative.");
      setSaving(false);
      return;
    }

    if (weekly === 0 && monthly === 0) {
      setError("Please enter at least one weekly or monthly limit.");
      setSaving(false);
      return;
    }

    const duplicateBudget = budgets.find(
      (budget) => budget.category === editCategory && budget.id !== budgetId
    );

    if (duplicateBudget) {
      setError("That category already has a budget.");
      setSaving(false);
      return;
    }

    const { error } = await supabase
      .from("budgets")
      .update({
        category: editCategory,
        weekly_limit: weekly,
        monthly_limit: monthly,
      })
      .eq("id", budgetId)
      .eq("user_id", userId);

    if (error) {
      setError(error.message);
      setSaving(false);
      return;
    }

    cancelEditing();
    await loadBudgets(userId);

    setStatus("Budget updated.");
    setSaving(false);
  }

  async function handleDeleteBudget(budgetId: string) {
    if (!userId) return;

    const confirmed = window.confirm(
      "Delete this budget? This cannot be undone."
    );

    if (!confirmed) return;

    setError("");
    setStatus("");

    const { error } = await supabase
      .from("budgets")
      .delete()
      .eq("id", budgetId)
      .eq("user_id", userId);

    if (error) {
      setError(error.message);
      return;
    }

    await loadBudgets(userId);

    setStatus("Budget deleted.");
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f4f8fb]">
        <p className="text-lg font-bold text-[#061b3d]">Loading budgets...</p>
      </main>
    );
  }

  return (
    <AppShell
      email={email}
      title="Set your spending guardrails."
      subtitle="Create weekly and monthly category limits so SafeSpend can warn you before your spending gets uncomfortable."
    >
      <section className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <MetricCard
          label="Plan"
          value={formatPlanLabel(effectivePlan)}
          helper={isFreePlan ? "3 budgets max" : "Unlimited budgets"}
        />

        <MetricCard
          label="Budget Usage"
          value={
            isFreePlan
              ? `${budgets.length}/${FREE_BUDGET_LIMIT}`
              : `${budgets.length} active`
          }
          helper={
            isFreePlan
              ? `${freeBudgetsRemaining} budget slots left`
              : "No budget limit"
          }
          warning={isFreePlan && freeBudgetsRemaining === 1}
          danger={freeBudgetLimitReached}
        />

        <MetricCard
          label="Weekly Budget"
          value={money(budgetSummary.totalWeeklyLimit)}
          helper={`${money(budgetSummary.totalWeeklySpent)} spent this week`}
        />

        <MetricCard
          label="Monthly Budget"
          value={money(budgetSummary.totalMonthlyLimit)}
          helper={`${money(budgetSummary.totalMonthlySpent)} spent this month`}
        />

        <MetricCard
          label="Pressure"
          value={String(budgetSummary.overBudgetCount)}
          helper="Categories over budget"
          danger={budgetSummary.overBudgetCount > 0}
        />
      </section>

      {freeBudgetLimitReached && (
        <section className="mb-6 rounded-[2rem] bg-gradient-to-br from-[#0637b8] via-[#0072b8] to-[#00a878] p-6 text-white shadow-xl">
          <p className="mb-2 inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-black uppercase tracking-widest">
            Free Limit Reached
          </p>

          <h3 className="text-3xl font-black tracking-[-0.04em]">
            You used all {FREE_BUDGET_LIMIT} free budget slots.
          </h3>

          <p className="mt-3 max-w-3xl text-sm leading-6 text-white/80">
            Upgrade to Plus for unlimited budgets, unlimited transactions, bills
            tracking, protected safe-to-spend, reports, and more AI coaching.
          </p>

          <div className="mt-5 flex flex-wrap gap-3">
            <a
              href="/billing"
              className="rounded-full bg-white px-5 py-3 text-sm font-black text-[#061b3d]"
            >
              Upgrade to Plus
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

      {error && (
        <section className="mb-6 rounded-2xl bg-red-50 p-4 text-sm font-bold text-red-600">
          {error}
        </section>
      )}

      {status && (
        <section className="mb-6 rounded-2xl bg-green-50 p-4 text-sm font-bold text-green-700">
          {status}
        </section>
      )}

      <section className="grid gap-6 xl:grid-cols-[.85fr_1.15fr]">
        <form
          onSubmit={handleAddBudget}
          className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl"
        >
          <h3 className="mb-5 text-2xl font-black text-[#061b3d]">
            Add Budget
          </h3>

          {isFreePlan && (
            <div
              className={`mb-5 rounded-3xl border p-4 ${
                freeBudgetLimitReached
                  ? "border-red-100 bg-red-50 text-red-700"
                  : freeBudgetsRemaining === 1
                    ? "border-yellow-100 bg-yellow-50 text-yellow-700"
                    : "border-cyan-100 bg-cyan-50 text-cyan-700"
              }`}
            >
              <p className="text-sm font-black">
                Free usage: {budgets.length}/{FREE_BUDGET_LIMIT}
              </p>
              <p className="mt-1 text-sm leading-6">
                {freeBudgetLimitReached
                  ? "Upgrade to Plus to add more budget categories."
                  : `${freeBudgetsRemaining} budget slots remaining.`}
              </p>
            </div>
          )}

          <label className="mb-2 block text-sm font-bold text-[#061b3d]">
            Category
          </label>
          <select
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            disabled={freeBudgetLimitReached}
            className="mb-4 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:ring-4 focus:ring-cyan-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {categories.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>

          <label className="mb-2 block text-sm font-bold text-[#061b3d]">
            Weekly Limit
          </label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={weeklyLimit}
            onChange={(event) => setWeeklyLimit(event.target.value)}
            disabled={freeBudgetLimitReached}
            className="mb-4 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:ring-4 focus:ring-cyan-100 disabled:cursor-not-allowed disabled:opacity-60"
            placeholder="Example: 150"
          />

          <label className="mb-2 block text-sm font-bold text-[#061b3d]">
            Monthly Limit
          </label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={monthlyLimit}
            onChange={(event) => setMonthlyLimit(event.target.value)}
            disabled={freeBudgetLimitReached}
            className="mb-5 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:ring-4 focus:ring-cyan-100 disabled:cursor-not-allowed disabled:opacity-60"
            placeholder="Example: 600"
          />

          <button
            type="submit"
            disabled={saving || freeBudgetLimitReached}
            className="w-full rounded-full bg-gradient-to-r from-[#0b4edb] via-[#00b7c7] to-[#5ce05c] px-6 py-3 font-black text-white shadow-lg disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving
              ? "Saving..."
              : freeBudgetLimitReached
                ? "Upgrade to Add More"
                : "Add Budget"}
          </button>

          <div className="mt-5 rounded-3xl border border-slate-100 bg-slate-50 p-5">
            <p className="text-xs font-black uppercase tracking-widest text-slate-500">
              Tip
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Start with categories that cause the most overspending: groceries,
              shopping, dining, subscriptions, and transportation.
            </p>
          </div>
        </form>

        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl">
          <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="text-2xl font-black text-[#061b3d]">
                Budget Guardrails
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                Compare current spending against your weekly and monthly limits.
              </p>
            </div>

            <a
              href="/billing"
              className="rounded-full border border-slate-200 bg-slate-50 px-5 py-3 text-sm font-black text-[#061b3d]"
            >
              View Plan
            </a>
          </div>

          {budgetSummary.rows.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
              <h4 className="text-xl font-black text-[#061b3d]">
                No budgets yet
              </h4>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                Add category limits so SafeSpend can calculate pressure and give
                smarter purchase guidance.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {budgetSummary.rows.map((budget) => (
                <div
                  key={budget.id}
                  className="rounded-3xl border border-slate-100 bg-slate-50 p-4"
                >
                  {editingId === budget.id ? (
                    <div className="space-y-3">
                      <select
                        value={editCategory}
                        onChange={(event) => setEditCategory(event.target.value)}
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none focus:ring-4 focus:ring-cyan-100"
                      >
                        {categories.map((item) => (
                          <option key={item} value={item}>
                            {item}
                          </option>
                        ))}
                      </select>

                      <div className="grid gap-3 md:grid-cols-2">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={editWeeklyLimit}
                          onChange={(event) =>
                            setEditWeeklyLimit(event.target.value)
                          }
                          className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none focus:ring-4 focus:ring-cyan-100"
                          placeholder="Weekly limit"
                        />

                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={editMonthlyLimit}
                          onChange={(event) =>
                            setEditMonthlyLimit(event.target.value)
                          }
                          className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none focus:ring-4 focus:ring-cyan-100"
                          placeholder="Monthly limit"
                        />
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => handleUpdateBudget(budget.id)}
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
                    <div>
                      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div>
                          <p className="text-xl font-black text-[#061b3d]">
                            {budget.category}
                          </p>
                          <p className="mt-1 text-sm text-slate-500">
                            Weekly: {money(Number(budget.weekly_limit || 0))} ·
                            Monthly: {money(Number(budget.monthly_limit || 0))}
                          </p>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => startEditing(budget)}
                            className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-black text-[#061b3d]"
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteBudget(budget.id)}
                            className="rounded-full border border-red-100 bg-red-50 px-3 py-1 text-xs font-black text-red-600"
                          >
                            Delete
                          </button>
                        </div>
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        <ProgressRow
                          label="Weekly"
                          value={`${money(budget.weeklySpent)} of ${money(
                            Number(budget.weekly_limit || 0)
                          )}`}
                          percent={budget.weeklyPercent}
                          status={budget.weeklyStatus}
                        />

                        <ProgressRow
                          label="Monthly"
                          value={`${money(budget.monthlySpent)} of ${money(
                            Number(budget.monthly_limit || 0)
                          )}`}
                          percent={budget.monthlyPercent}
                          status={budget.monthlyStatus}
                        />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
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
          danger ? "text-red-500" : warning ? "text-yellow-600" : "text-slate-500"
        }`}
      >
        {label}
      </p>

      <p
        className={`mt-2 text-2xl font-black ${
          danger ? "text-red-700" : warning ? "text-yellow-800" : "text-[#061b3d]"
        }`}
      >
        {value}
      </p>

      <p
        className={`mt-1 text-xs ${
          danger ? "text-red-600" : warning ? "text-yellow-700" : "text-slate-500"
        }`}
      >
        {helper}
      </p>
    </div>
  );
}

function ProgressRow({
  label,
  value,
  percent,
  status,
}: {
  label: string;
  value: string;
  percent: number;
  status: string;
}) {
  const cleanPercent = Math.max(0, Math.min(100, Number(percent || 0)));
  const danger = status === "Over Budget";
  const warning = status === "Close";

  return (
    <div className="rounded-2xl bg-white p-4">
      <div className="mb-2 flex items-start justify-between gap-3">
        <div>
          <p className="font-black text-[#061b3d]">{label}</p>
          <p className="text-sm text-slate-500">{value}</p>
        </div>

        <span
          className={`rounded-full px-3 py-1 text-xs font-black ${
            danger
              ? "bg-red-100 text-red-600"
              : warning
                ? "bg-yellow-100 text-yellow-700"
                : "bg-green-100 text-green-700"
          }`}
        >
          {status}
        </span>
      </div>

      <div className="h-3 overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full ${
            danger
              ? "bg-red-500"
              : warning
                ? "bg-yellow-400"
                : "bg-gradient-to-r from-[#00b7c7] to-[#5ce05c]"
          }`}
          style={{ width: `${cleanPercent}%` }}
        />
      </div>

      <p className="mt-2 text-right text-xs font-black text-slate-500">
        {percent}%
      </p>
    </div>
  );
}