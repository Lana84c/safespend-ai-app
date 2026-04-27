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

type FilterRange = "week" | "month" | "all";

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

export default function TransactionsPage() {
  const router = useRouter();

  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState("");

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filterRange, setFilterRange] = useState<FilterRange>("month");
  const [searchTerm, setSearchTerm] = useState("");

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
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");

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

    await loadTransactions(user.id);

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
    const cleanSearch = searchTerm.trim().toLowerCase();

    return transactions.filter((tx) => {
      const txDate = new Date(`${tx.date}T00:00:00`);
      const matchesDate = !startDate || txDate >= startDate;

      const searchableText = [
        tx.type,
        tx.category,
        tx.merchant || "",
        tx.description || "",
        String(tx.amount),
      ]
        .join(" ")
        .toLowerCase();

      const matchesSearch = !cleanSearch || searchableText.includes(cleanSearch);

      return matchesDate && matchesSearch;
    });
  }, [transactions, filterRange, searchTerm]);

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
      net: totalIncome - totalSpent,
      count: filteredTransactions.length,
    };
  }, [filteredTransactions]);

  async function handleAddTransaction(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!userId) return;

    setSaving(true);
    setError("");
    setStatus("");

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

    await loadTransactions(userId);

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

    await loadTransactions(userId);

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
      title="Manage every dollar that moves."
      subtitle="Add, review, search, edit, and delete income, expenses, transfers, savings, and debt payments."
    >
      <section className="mb-6 grid gap-4 md:grid-cols-4">
        <SummaryCard label="Income" value={money(totals.totalIncome)} />
        <SummaryCard label="Spent" value={money(totals.totalSpent)} />
        <SummaryCard label="Net" value={money(totals.net)} />
        <SummaryCard label="Entries" value={String(totals.count)} />
      </section>

      <section className="grid gap-6 lg:grid-cols-[.85fr_1.15fr]">
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
            placeholder="Publix, Payroll, Zelle..."
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

          {status && (
            <p className="mt-4 rounded-2xl bg-green-50 p-3 text-sm font-bold text-green-700">
              {status}
            </p>
          )}

          {error && (
            <p className="mt-4 rounded-2xl bg-red-50 p-3 text-sm font-bold text-red-600">
              {error}
            </p>
          )}
        </form>

        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl">
          <div className="mb-5 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <h3 className="text-2xl font-black text-[#061b3d]">
                Transaction History
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                Search and manage your financial entries.
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

          <input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            className="mb-4 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:ring-4 focus:ring-cyan-100"
            placeholder="Search merchant, category, description, amount..."
          />

          {filteredTransactions.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
              <h4 className="text-xl font-black text-[#061b3d]">
                No transactions found
              </h4>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                Add your first transaction or adjust the filter/search.
              </p>
            </div>
          ) : (
            <div className="max-h-[760px] space-y-3 overflow-y-auto pr-1">
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
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
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

                      <div className="text-left md:text-right">
                        <p
                          className={`font-black ${
                            Number(tx.amount) < 0
                              ? "text-red-500"
                              : "text-green-600"
                          }`}
                        >
                          {money(Number(tx.amount))}
                        </p>

                        <div className="mt-2 flex gap-2 md:justify-end">
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
    </AppShell>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
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
      className={`rounded-full px-4 py-2 text-sm font-black ${
        active
          ? "bg-gradient-to-r from-[#0b4edb] via-[#00b7c7] to-[#5ce05c] text-white shadow-lg"
          : "border border-slate-200 bg-white text-[#061b3d]"
      }`}
    >
      {label}
    </button>
  );
}