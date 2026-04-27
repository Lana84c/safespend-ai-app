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

type FilterRange = "week" | "month" | "all";

const FREE_MONTHLY_TRANSACTION_LIMIT = 100;

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

export default function TransactionsPage() {
  const router = useRouter();

  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [billing, setBilling] = useState<BillingRecord | null>(null);

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [monthlyTransactionCount, setMonthlyTransactionCount] = useState(0);
  const [filterRange, setFilterRange] = useState<FilterRange>("month");

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

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  const effectivePlan = getEffectivePlan(billing);
  const isFreePlan = effectivePlan === "free";
  const freeTransactionsRemaining = Math.max(
    FREE_MONTHLY_TRANSACTION_LIMIT - monthlyTransactionCount,
    0
  );
  const freeTransactionLimitReached =
    isFreePlan && monthlyTransactionCount >= FREE_MONTHLY_TRANSACTION_LIMIT;

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
      loadTransactions(user.id),
      loadMonthlyTransactionCount(user.id),
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

  async function loadMonthlyTransactionCount(currentUserId: string) {
    const { count, error } = await supabase
      .from("transactions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", currentUserId)
      .gte("created_at", getMonthStartIso());

    if (error) {
      setError(error.message);
      return;
    }

    setMonthlyTransactionCount(count || 0);
  }

  async function recordTransactionUsage(currentUserId: string) {
    const { error } = await supabase.from("usage_events").insert({
      user_id: currentUserId,
      event_type: "transaction_created",
      metadata: {
        plan: effectivePlan,
      },
    });

    if (error) {
      // Do not block transaction saving if usage event tracking fails.
      console.warn("Unable to record transaction usage event:", error.message);
    }
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
    const income = filteredTransactions
      .filter((tx) => Number(tx.amount) > 0)
      .reduce((sum, tx) => sum + Number(tx.amount), 0);

    const spent = filteredTransactions
      .filter((tx) => Number(tx.amount) < 0)
      .reduce((sum, tx) => sum + Math.abs(Number(tx.amount)), 0);

    const net = income - spent;

    const risk =
      net <= 0 ? "Critical" : net < 100 ? "High" : net < 250 ? "Medium" : "Low";

    return {
      income,
      spent,
      net,
      risk,
      count: filteredTransactions.length,
    };
  }, [filteredTransactions]);

  async function handleAddTransaction(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!userId) return;

    setSaving(true);
    setError("");
    setStatus("");

    if (freeTransactionLimitReached) {
      setError(
        `Free plan limit reached. You have used all ${FREE_MONTHLY_TRANSACTION_LIMIT} transactions for this month. Upgrade to Plus for unlimited transactions.`
      );
      setSaving(false);
      return;
    }

    const numericAmount = Number(amount);

    if (!numericAmount || numericAmount <= 0) {
      setError("Please enter an amount greater than 0.");
      setSaving(false);
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
      setSaving(false);
      return;
    }

    await recordTransactionUsage(userId);

    setTransactionDate(getTodayDate());
    setType("Expense");
    setCategory("Groceries");
    setMerchant("");
    setDescription("");
    setAmount("");

    await Promise.all([
      loadTransactions(userId),
      loadMonthlyTransactionCount(userId),
    ]);

    setStatus("Transaction added.");
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
    setStatus("");
  }

  function cancelEditing() {
    setEditingId(null);
    setEditDate("");
    setEditType("Expense");
    setEditCategory("Groceries");
    setEditMerchant("");
    setEditDescription("");
    setEditAmount("");
    setError("");
  }

  async function handleUpdateTransaction(txId: string) {
    if (!userId) return;

    setSaving(true);
    setError("");
    setStatus("");

    const numericAmount = Number(editAmount);

    if (!numericAmount || numericAmount <= 0) {
      setError("Please enter an amount greater than 0.");
      setSaving(false);
      return;
    }

    const finalAmount =
      editType === "Income" ? Math.abs(numericAmount) : -Math.abs(numericAmount);

    const { error } = await supabase
      .from("transactions")
      .update({
        date: editDate,
        type: editType,
        category: editCategory,
        merchant: editMerchant.trim() || null,
        description: editDescription.trim() || null,
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

    await Promise.all([
      loadTransactions(userId),
      loadMonthlyTransactionCount(userId),
    ]);

    setStatus("Transaction updated.");
    setSaving(false);
  }

  async function handleDeleteTransaction(txId: string) {
    if (!userId) return;

    const confirmed = window.confirm(
      "Delete this transaction? This cannot be undone."
    );

    if (!confirmed) return;

    setError("");
    setStatus("");

    const { error } = await supabase
      .from("transactions")
      .delete()
      .eq("id", txId)
      .eq("user_id", userId);

    if (error) {
      setError(error.message);
      return;
    }

    await Promise.all([
      loadTransactions(userId),
      loadMonthlyTransactionCount(userId),
    ]);

    setStatus("Transaction deleted.");
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f4f8fb]">
        <p className="text-lg font-bold text-[#061b3d]">
          Loading transactions...
        </p>
      </main>
    );
  }

  return (
    <AppShell
      email={email}
      title="Track every dollar clearly."
      subtitle="Add income, expenses, debt payments, savings, transfers, and other money activity so SafeSpend can keep your numbers accurate."
    >
      <section className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <MetricCard
          label="Plan"
          value={formatPlanLabel(effectivePlan)}
          helper={
            isFreePlan
              ? "100 transactions/month"
              : "Unlimited transactions"
          }
        />

        <MetricCard
          label="Monthly Usage"
          value={
            isFreePlan
              ? `${monthlyTransactionCount}/${FREE_MONTHLY_TRANSACTION_LIMIT}`
              : `${monthlyTransactionCount} this month`
          }
          helper={
            isFreePlan
              ? `${freeTransactionsRemaining} left this month`
              : "No monthly transaction limit"
          }
          warning={isFreePlan && freeTransactionsRemaining <= 15}
          danger={freeTransactionLimitReached}
        />

        <MetricCard
          label="Income"
          value={money(totals.income)}
          helper="Money in"
        />

        <MetricCard
          label="Spent"
          value={money(totals.spent)}
          helper="Money out"
        />

        <MetricCard
          label="Net"
          value={money(totals.net)}
          helper={`Risk: ${totals.risk}`}
          danger={totals.net <= 0}
        />
      </section>

      {freeTransactionLimitReached && (
        <section className="mb-6 rounded-[2rem] bg-gradient-to-br from-[#0637b8] via-[#0072b8] to-[#00a878] p-6 text-white shadow-xl">
          <p className="mb-2 inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-black uppercase tracking-widest">
            Free Limit Reached
          </p>

          <h3 className="text-3xl font-black tracking-[-0.04em]">
            You used all {FREE_MONTHLY_TRANSACTION_LIMIT} free transactions this
            month.
          </h3>

          <p className="mt-3 max-w-3xl text-sm leading-6 text-white/80">
            Upgrade to Plus for unlimited transactions, unlimited budgets, bills
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

      <section className="grid gap-6 xl:grid-cols-[.85fr_1.15fr]">
        <form
          onSubmit={handleAddTransaction}
          className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl"
        >
          <h3 className="mb-5 text-2xl font-black text-[#061b3d]">
            Add Transaction
          </h3>

          {isFreePlan && (
            <div
              className={`mb-5 rounded-3xl border p-4 ${
                freeTransactionLimitReached
                  ? "border-red-100 bg-red-50 text-red-700"
                  : freeTransactionsRemaining <= 15
                    ? "border-yellow-100 bg-yellow-50 text-yellow-700"
                    : "border-cyan-100 bg-cyan-50 text-cyan-700"
              }`}
            >
              <p className="text-sm font-black">
                Free usage: {monthlyTransactionCount}/
                {FREE_MONTHLY_TRANSACTION_LIMIT}
              </p>
              <p className="mt-1 text-sm leading-6">
                {freeTransactionLimitReached
                  ? "Upgrade to Plus to keep adding transactions this month."
                  : `${freeTransactionsRemaining} transactions remaining this month.`}
              </p>
            </div>
          )}

          <label className="mb-2 block text-sm font-bold text-[#061b3d]">
            Transaction Date
          </label>
          <input
            type="date"
            required
            value={transactionDate}
            onChange={(event) => setTransactionDate(event.target.value)}
            disabled={freeTransactionLimitReached}
            className="mb-4 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:ring-4 focus:ring-cyan-100 disabled:cursor-not-allowed disabled:opacity-60"
          />

          <label className="mb-2 block text-sm font-bold text-[#061b3d]">
            Type
          </label>
          <select
            value={type}
            onChange={(event) =>
              setType(event.target.value as Transaction["type"])
            }
            disabled={freeTransactionLimitReached}
            className="mb-4 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:ring-4 focus:ring-cyan-100 disabled:cursor-not-allowed disabled:opacity-60"
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
            disabled={freeTransactionLimitReached}
            className="mb-4 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:ring-4 focus:ring-cyan-100 disabled:cursor-not-allowed disabled:opacity-60"
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
            disabled={freeTransactionLimitReached}
            className="mb-4 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:ring-4 focus:ring-cyan-100 disabled:cursor-not-allowed disabled:opacity-60"
            placeholder="Publix, Kroger, Payroll, Zelle..."
          />

          <label className="mb-2 block text-sm font-bold text-[#061b3d]">
            Description
          </label>
          <input
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            disabled={freeTransactionLimitReached}
            className="mb-4 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:ring-4 focus:ring-cyan-100 disabled:cursor-not-allowed disabled:opacity-60"
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
            disabled={freeTransactionLimitReached}
            className="mb-5 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:ring-4 focus:ring-cyan-100 disabled:cursor-not-allowed disabled:opacity-60"
            placeholder="64.00"
          />

          <button
            type="submit"
            disabled={saving || freeTransactionLimitReached}
            className="w-full rounded-full bg-gradient-to-r from-[#0b4edb] via-[#00b7c7] to-[#5ce05c] px-6 py-3 font-black text-white shadow-lg disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving
              ? "Saving..."
              : freeTransactionLimitReached
                ? "Upgrade to Add More"
                : "Add Transaction"}
          </button>
        </form>

        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl">
          <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="text-2xl font-black text-[#061b3d]">
                Transactions
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                Showing {filteredTransactions.length} entries for your selected
                view.
              </p>
            </div>

            <a
              href="/billing"
              className="rounded-full border border-slate-200 bg-slate-50 px-5 py-3 text-sm font-black text-[#061b3d]"
            >
              View Plan
            </a>
          </div>

          {filteredTransactions.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
              <h4 className="text-xl font-black text-[#061b3d]">
                No transactions yet
              </h4>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                Add your first income or expense to start building your
                SafeSpend picture.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredTransactions.map((tx) => (
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
                        onChange={(event) => setEditAmount(event.target.value)}
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none focus:ring-4 focus:ring-cyan-100"
                        placeholder="Amount"
                      />

                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => handleUpdateTransaction(tx.id)}
                          disabled={saving}
                          className="rounded-full bg-gradient-to-r from-[#0b4edb] via-[#00b7c7] to-[#5ce05c] px-4 py-2 text-sm font-black text-white disabled:opacity-60"
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
                          className={`whitespace-nowrap text-right font-black ${
                            Number(tx.amount) < 0
                              ? "text-red-500"
                              : "text-green-600"
                          }`}
                        >
                          {money(Number(tx.amount))}
                        </p>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
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