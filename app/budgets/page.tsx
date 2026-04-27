"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import AppShell from "@/components/AppShell";

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
  amount: number;
  created_at: string;
};

const defaultCategories = [
  "Groceries",
  "Bills",
  "Shopping",
  "Transportation",
  "Dining",
  "Subscriptions",
  "Personal",
  "Debt",
  "Savings",
  "Pets",
  "Health",
  "Entertainment",
  "Other",
];

function getTodayDate() {
  return new Date().toISOString().split("T")[0];
}

function getWeekStartDate() {
  const now = new Date();
  const start = new Date(now);
  const day = start.getDay();
  start.setDate(start.getDate() - day);
  start.setHours(0, 0, 0, 0);
  return start;
}

function getMonthStartDate() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

function money(value: number) {
  return Number(value || 0).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });
}

export default function BudgetsPage() {
  const router = useRouter();

  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState("");

  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  const [category, setCategory] = useState("Groceries");
  const [customCategory, setCustomCategory] = useState("");
  const [weeklyLimit, setWeeklyLimit] = useState("");
  const [monthlyLimit, setMonthlyLimit] = useState("");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editCategory, setEditCategory] = useState("");
  const [editWeeklyLimit, setEditWeeklyLimit] = useState("");
  const [editMonthlyLimit, setEditMonthlyLimit] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    checkUser();
  }, []);

  async function checkUser() {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    if (!user) {
      router.push("/login");
      return;
    }

    setUserId(user.id);
    setEmail(user.email || "");

    await Promise.all([loadBudgets(user.id), loadTransactions(user.id)]);

    setLoading(false);
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
      .select("id, user_id, date, type, category, amount, created_at")
      .eq("user_id", currentUserId)
      .order("date", { ascending: false });

    if (error) {
      setError(error.message);
      return;
    }

    setTransactions((data || []) as Transaction[]);
  }

  function getFinalCategory() {
    if (category === "Custom") return customCategory.trim();
    return category;
  }

  async function handleAddBudget(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!userId) return;

    setSaving(true);
    setError("");
    setMessage("");

    const finalCategory = getFinalCategory();
    const weekly = Number(weeklyLimit || 0);
    const monthly = Number(monthlyLimit || 0);

    if (!finalCategory) {
      setError("Please enter a category name.");
      setSaving(false);
      return;
    }

    if (weekly <= 0 && monthly <= 0) {
      setError("Please enter a weekly or monthly budget amount.");
      setSaving(false);
      return;
    }

    const finalWeekly = weekly > 0 ? weekly : monthly / 4;
    const finalMonthly = monthly > 0 ? monthly : weekly * 4;

    const { error } = await supabase.from("budgets").upsert(
      {
        user_id: userId,
        category: finalCategory,
        weekly_limit: finalWeekly,
        monthly_limit: finalMonthly,
      },
      { onConflict: "user_id,category" }
    );

    if (error) {
      setError(error.message);
      setSaving(false);
      return;
    }

    setCategory("Groceries");
    setCustomCategory("");
    setWeeklyLimit("");
    setMonthlyLimit("");
    setMessage("Budget saved.");

    await loadBudgets(userId);
    setSaving(false);
  }

  function startEditing(budget: Budget) {
    setEditingId(budget.id);
    setEditCategory(budget.category);
    setEditWeeklyLimit(String(Number(budget.weekly_limit || 0)));
    setEditMonthlyLimit(String(Number(budget.monthly_limit || 0)));
    setError("");
    setMessage("");
  }

  function cancelEditing() {
    setEditingId(null);
    setEditCategory("");
    setEditWeeklyLimit("");
    setEditMonthlyLimit("");
    setError("");
  }

  async function handleUpdateBudget(budgetId: string) {
    if (!userId) return;

    setSaving(true);
    setError("");
    setMessage("");

    const weekly = Number(editWeeklyLimit || 0);
    const monthly = Number(editMonthlyLimit || 0);

    if (!editCategory.trim()) {
      setError("Please enter a category name.");
      setSaving(false);
      return;
    }

    if (weekly <= 0 && monthly <= 0) {
      setError("Please enter a weekly or monthly budget amount.");
      setSaving(false);
      return;
    }

    const finalWeekly = weekly > 0 ? weekly : monthly / 4;
    const finalMonthly = monthly > 0 ? monthly : weekly * 4;

    const { error } = await supabase
      .from("budgets")
      .update({
        category: editCategory.trim(),
        weekly_limit: finalWeekly,
        monthly_limit: finalMonthly,
      })
      .eq("id", budgetId)
      .eq("user_id", userId);

    if (error) {
      setError(error.message);
      setSaving(false);
      return;
    }

    cancelEditing();
    setMessage("Budget updated.");

    await loadBudgets(userId);
    setSaving(false);
  }

  async function handleDeleteBudget(budgetId: string) {
    if (!userId) return;

    const confirmed = window.confirm(
      "Delete this budget? This will remove the category limit."
    );

    if (!confirmed) return;

    setError("");
    setMessage("");

    const { error } = await supabase
      .from("budgets")
      .delete()
      .eq("id", budgetId)
      .eq("user_id", userId);

    if (error) {
      setError(error.message);
      return;
    }

    setMessage("Budget deleted.");
    await loadBudgets(userId);
  }

  const budgetStats = useMemo(() => {
    const totalWeekly = budgets.reduce(
      (sum, budget) => sum + Number(budget.weekly_limit || 0),
      0
    );

    const totalMonthly = budgets.reduce(
      (sum, budget) => sum + Number(budget.monthly_limit || 0),
      0
    );

    const weekStart = getWeekStartDate();
    const monthStart = getMonthStartDate();

    const activeCategories = budgets.length;

    const overLimitCount = budgets.filter((budget) => {
      const weeklySpent = getSpentForCategory(
        transactions,
        budget.category,
        weekStart
      );

      return weeklySpent > Number(budget.weekly_limit || 0);
    }).length;

    return {
      totalWeekly,
      totalMonthly,
      activeCategories,
      overLimitCount,
      today: getTodayDate(),
    };
  }, [budgets, transactions]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f4f8fb] px-6">
        <p className="text-lg font-bold text-[#061b3d]">
          Loading budgets...
        </p>
      </main>
    );
  }

  return (
    <AppShell
      email={email}
      title="Set weekly spending guardrails."
      subtitle="Create category limits so SafeSpend can show when you are on track, getting close, or overspending."
    >
      <section className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          label="Weekly Budgeted"
          value={money(budgetStats.totalWeekly)}
          helper="Total weekly limits"
        />

        <SummaryCard
          label="Monthly Budgeted"
          value={money(budgetStats.totalMonthly)}
          helper="Estimated monthly limits"
        />

        <SummaryCard
          label="Active Categories"
          value={String(budgetStats.activeCategories)}
          helper="Categories being tracked"
        />

        <SummaryCard
          label="Over Limit"
          value={String(budgetStats.overLimitCount)}
          helper="Based on this week"
          danger={budgetStats.overLimitCount > 0}
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
        <section className="h-fit rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl">
          <p className="mb-2 inline-flex rounded-full bg-cyan-50 px-4 py-2 text-xs font-black uppercase tracking-widest text-cyan-700">
            Budget Setup
          </p>

          <h3 className="text-2xl font-black text-[#061b3d]">
            Add or update a limit
          </h3>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            Add a weekly amount first. SafeSpend will estimate the monthly
            amount automatically.
          </p>

          <form onSubmit={handleAddBudget} className="mt-6 space-y-4">
            <div>
              <label className="mb-2 block text-sm font-black text-[#061b3d]">
                Category
              </label>

              <select
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:ring-4 focus:ring-cyan-100"
              >
                {defaultCategories.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
                <option value="Custom">Custom</option>
              </select>
            </div>

            {category === "Custom" && (
              <div>
                <label className="mb-2 block text-sm font-black text-[#061b3d]">
                  Custom Category
                </label>

                <input
                  value={customCategory}
                  onChange={(event) => setCustomCategory(event.target.value)}
                  placeholder="Example: Kids, Beauty, Travel"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:ring-4 focus:ring-cyan-100"
                />
              </div>
            )}

            <div>
              <label className="mb-2 block text-sm font-black text-[#061b3d]">
                Weekly Limit
              </label>

              <input
                type="number"
                min="0"
                step="0.01"
                value={weeklyLimit}
                onChange={(event) => {
                  setWeeklyLimit(event.target.value);

                  const weekly = Number(event.target.value || 0);
                  if (weekly > 0) {
                    setMonthlyLimit(String(weekly * 4));
                  }
                }}
                placeholder="Example: 100"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:ring-4 focus:ring-cyan-100"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-black text-[#061b3d]">
                Monthly Limit
              </label>

              <input
                type="number"
                min="0"
                step="0.01"
                value={monthlyLimit}
                onChange={(event) => setMonthlyLimit(event.target.value)}
                placeholder="Auto-fills from weekly"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:ring-4 focus:ring-cyan-100"
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-full bg-gradient-to-r from-[#0b4edb] via-[#00b7c7] to-[#5ce05c] px-6 py-3 font-black text-white shadow-lg disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save Budget"}
            </button>
          </form>

          {message && (
            <p className="mt-4 rounded-2xl bg-green-50 p-3 text-sm font-bold text-green-700">
              {message}
            </p>
          )}

          {error && (
            <p className="mt-4 rounded-2xl bg-red-50 p-3 text-sm font-bold text-red-600">
              {error}
            </p>
          )}
        </section>

        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl">
          <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="mb-2 inline-flex rounded-full bg-blue-50 px-4 py-2 text-xs font-black uppercase tracking-widest text-blue-700">
                Budget Categories
              </p>

              <h3 className="text-2xl font-black text-[#061b3d]">
                Current guardrails
              </h3>

              <p className="mt-1 text-sm leading-6 text-slate-500">
                Your budget cards now use the wider page area instead of stacking
                in one narrow column.
              </p>
            </div>

            <a
              href="/onboarding"
              className="rounded-full border border-slate-200 bg-slate-50 px-5 py-3 text-center text-sm font-black text-[#061b3d]"
            >
              Revisit Setup
            </a>
          </div>

          {budgets.length === 0 ? (
            <EmptyBudgetState />
          ) : (
            <div className="grid gap-5 2xl:grid-cols-2">
              {budgets.map((budget) => {
                const weekStart = getWeekStartDate();
                const monthStart = getMonthStartDate();

                const weeklySpent = getSpentForCategory(
                  transactions,
                  budget.category,
                  weekStart
                );

                const monthlySpent = getSpentForCategory(
                  transactions,
                  budget.category,
                  monthStart
                );

                const weeklyPercent = getPercent(
                  weeklySpent,
                  Number(budget.weekly_limit || 0)
                );

                const monthlyPercent = getPercent(
                  monthlySpent,
                  Number(budget.monthly_limit || 0)
                );

                return (
                  <BudgetCard
                    key={budget.id}
                    budget={budget}
                    editing={editingId === budget.id}
                    editCategory={editCategory}
                    editWeeklyLimit={editWeeklyLimit}
                    editMonthlyLimit={editMonthlyLimit}
                    weeklySpent={weeklySpent}
                    monthlySpent={monthlySpent}
                    weeklyPercent={weeklyPercent}
                    monthlyPercent={monthlyPercent}
                    saving={saving}
                    onEdit={() => startEditing(budget)}
                    onCancel={cancelEditing}
                    onDelete={() => handleDeleteBudget(budget.id)}
                    onSave={() => handleUpdateBudget(budget.id)}
                    onEditCategory={setEditCategory}
                    onEditWeeklyLimit={setEditWeeklyLimit}
                    onEditMonthlyLimit={setEditMonthlyLimit}
                  />
                );
              })}
            </div>
          )}
        </section>
      </section>
    </AppShell>
  );
}

function getSpentForCategory(
  transactions: Transaction[],
  category: string,
  startDate: Date
) {
  return transactions
    .filter((tx) => {
      const txDate = new Date(`${tx.date}T00:00:00`);
      return (
        tx.category === category &&
        Number(tx.amount) < 0 &&
        txDate >= startDate
      );
    })
    .reduce((sum, tx) => sum + Math.abs(Number(tx.amount || 0)), 0);
}

function getPercent(spent: number, limit: number) {
  if (!limit || limit <= 0) return 0;
  return Math.round((spent / limit) * 100);
}

function getStatus(percent: number) {
  if (percent >= 100) return "Over";
  if (percent >= 80) return "Close";
  return "OK";
}

function SummaryCard({
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

function BudgetCard({
  budget,
  editing,
  editCategory,
  editWeeklyLimit,
  editMonthlyLimit,
  weeklySpent,
  monthlySpent,
  weeklyPercent,
  monthlyPercent,
  saving,
  onEdit,
  onCancel,
  onDelete,
  onSave,
  onEditCategory,
  onEditWeeklyLimit,
  onEditMonthlyLimit,
}: {
  budget: Budget;
  editing: boolean;
  editCategory: string;
  editWeeklyLimit: string;
  editMonthlyLimit: string;
  weeklySpent: number;
  monthlySpent: number;
  weeklyPercent: number;
  monthlyPercent: number;
  saving: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onDelete: () => void;
  onSave: () => void;
  onEditCategory: (value: string) => void;
  onEditWeeklyLimit: (value: string) => void;
  onEditMonthlyLimit: (value: string) => void;
}) {
  if (editing) {
    return (
      <div className="rounded-[2rem] border border-cyan-100 bg-cyan-50/60 p-5">
        <div className="space-y-3">
          <input
            value={editCategory}
            onChange={(event) => onEditCategory(event.target.value)}
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 font-bold text-[#061b3d] outline-none focus:ring-4 focus:ring-cyan-100"
          />

          <div className="grid gap-3 md:grid-cols-2">
            <input
              type="number"
              min="0"
              step="0.01"
              value={editWeeklyLimit}
              onChange={(event) => {
                onEditWeeklyLimit(event.target.value);

                const weekly = Number(event.target.value || 0);
                if (weekly > 0) {
                  onEditMonthlyLimit(String(weekly * 4));
                }
              }}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none focus:ring-4 focus:ring-cyan-100"
              placeholder="Weekly limit"
            />

            <input
              type="number"
              min="0"
              step="0.01"
              value={editMonthlyLimit}
              onChange={(event) => onEditMonthlyLimit(event.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none focus:ring-4 focus:ring-cyan-100"
              placeholder="Monthly limit"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onSave}
              disabled={saving}
              className="rounded-full bg-gradient-to-r from-[#0b4edb] via-[#00b7c7] to-[#5ce05c] px-5 py-3 text-sm font-black text-white shadow-lg disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save"}
            </button>

            <button
              type="button"
              onClick={onCancel}
              className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-black text-[#061b3d]"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  const weeklyStatus = getStatus(weeklyPercent);
  const monthlyStatus = getStatus(monthlyPercent);

  return (
    <div className="rounded-[2rem] border border-slate-200 bg-slate-50 p-5">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h4 className="text-2xl font-black text-[#061b3d]">
            {budget.category}
          </h4>

          <p className="mt-1 text-sm text-slate-500">
            Weekly: {money(Number(budget.weekly_limit || 0))} · Monthly:{" "}
            {money(Number(budget.monthly_limit || 0))}
          </p>
        </div>

        <div className="flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={onEdit}
            className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-black text-[#061b3d]"
          >
            Edit
          </button>

          <button
            type="button"
            onClick={onDelete}
            className="rounded-full border border-red-100 bg-red-50 px-4 py-2 text-sm font-black text-red-600"
          >
            Delete
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <ProgressBox
          label="Weekly"
          spent={weeklySpent}
          limit={Number(budget.weekly_limit || 0)}
          percent={weeklyPercent}
          status={weeklyStatus}
        />

        <ProgressBox
          label="Monthly"
          spent={monthlySpent}
          limit={Number(budget.monthly_limit || 0)}
          percent={monthlyPercent}
          status={monthlyStatus}
        />
      </div>
    </div>
  );
}

function ProgressBox({
  label,
  spent,
  limit,
  percent,
  status,
}: {
  label: string;
  spent: number;
  limit: number;
  percent: number;
  status: string;
}) {
  const danger = status === "Over";
  const warning = status === "Close";

  return (
    <div className="rounded-3xl bg-white p-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-xl font-black text-[#061b3d]">{label}</p>
          <p className="text-sm text-slate-500">
            {money(spent)} of {money(limit)}
          </p>
        </div>

        <span
          className={`rounded-full px-4 py-2 text-xs font-black ${
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
          style={{ width: `${Math.min(percent, 100)}%` }}
        />
      </div>

      <p className="mt-2 text-right text-xs font-black text-slate-500">
        {percent}%
      </p>
    </div>
  );
}

function EmptyBudgetState() {
  return (
    <div className="rounded-[2rem] border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
      <h4 className="text-2xl font-black text-[#061b3d]">
        No budgets yet
      </h4>

      <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-500">
        Add weekly limits for groceries, shopping, dining, transportation, and
        subscriptions so SafeSpend can warn you before spending gets risky.
      </p>

      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <a
          href="/onboarding"
          className="rounded-full bg-gradient-to-r from-[#0b4edb] via-[#00b7c7] to-[#5ce05c] px-5 py-3 text-sm font-black text-white shadow-lg"
        >
          Start Setup
        </a>

        <a
          href="/dashboard"
          className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-black text-[#061b3d]"
        >
          Back to Dashboard
        </a>
      </div>
    </div>
  );
}