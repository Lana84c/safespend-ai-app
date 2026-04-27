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

type FilterRange = "week" | "month" | "all";

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

export default function ReportsPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [filterRange, setFilterRange] = useState<FilterRange>("month");

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

    setEmail(user.email || "");

    await Promise.all([
      loadTransactions(user.id),
      loadBudgets(user.id),
      loadBills(user.id),
    ]);

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

  async function loadBudgets(userId: string) {
    const { data, error } = await supabase
      .from("budgets")
      .select("*")
      .eq("user_id", userId)
      .order("category", { ascending: true });

    if (error) {
      setError(error.message);
      return;
    }

    setBudgets((data || []) as Budget[]);
  }

  async function loadBills(userId: string) {
    const { data, error } = await supabase
      .from("bills")
      .select("*")
      .eq("user_id", userId)
      .order("is_paid", { ascending: true })
      .order("due_date", { ascending: true });

    if (error) {
      setError(error.message);
      return;
    }

    setBills((data || []) as Bill[]);
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

    const savings = filteredTransactions
      .filter((tx) => tx.type === "Savings")
      .reduce((sum, tx) => sum + Math.abs(Number(tx.amount)), 0);

    const debt = filteredTransactions
      .filter((tx) => tx.type === "Debt")
      .reduce((sum, tx) => sum + Math.abs(Number(tx.amount)), 0);

    const net = income - spent;

    const risk =
      net <= 0 ? "Critical" : net < 100 ? "High" : net < 250 ? "Medium" : "Low";

    return {
      income,
      spent,
      savings,
      debt,
      net,
      risk,
      count: filteredTransactions.length,
    };
  }, [filteredTransactions]);

  const spendingByCategory = useMemo(() => {
    const map = new Map<string, number>();

    filteredTransactions
      .filter((tx) => Number(tx.amount) < 0)
      .forEach((tx) => {
        const current = map.get(tx.category) || 0;
        map.set(tx.category, current + Math.abs(Number(tx.amount)));
      });

    return Array.from(map.entries())
      .map(([category, spent]) => ({
        category,
        spent,
        percent:
          totals.spent > 0
            ? Math.round((Number(spent) / totals.spent) * 100)
            : 0,
      }))
      .sort((a, b) => b.spent - a.spent);
  }, [filteredTransactions, totals.spent]);

  const topMerchants = useMemo(() => {
    const map = new Map<string, number>();

    filteredTransactions
      .filter((tx) => Number(tx.amount) < 0)
      .forEach((tx) => {
        const merchant = tx.merchant || "Unknown";
        const current = map.get(merchant) || 0;
        map.set(merchant, current + Math.abs(Number(tx.amount)));
      });

    return Array.from(map.entries())
      .map(([merchant, spent]) => ({
        merchant,
        spent,
        percent:
          totals.spent > 0
            ? Math.round((Number(spent) / totals.spent) * 100)
            : 0,
      }))
      .sort((a, b) => b.spent - a.spent)
      .slice(0, 8);
  }, [filteredTransactions, totals.spent]);

  const budgetPressure = useMemo(() => {
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

  const protectedSafeToSpend = totals.net - upcomingBillsTotal;

  const reportSummary = useMemo(() => {
    if (totals.count === 0) {
      return "No report data yet. Add income, expenses, bills, and budgets to generate useful insights.";
    }

    if (protectedSafeToSpend <= 0) {
      return "Your protected safe-to-spend is at or below zero after upcoming bills. Non-essential spending should pause until bills are covered or more income is added.";
    }

    if (budgetPressure.some((item) => item.status === "Over Budget")) {
      return "At least one category is over budget. Review the categories below and reduce spending in the highest-pressure areas.";
    }

    if (budgetPressure.some((item) => item.status === "Close")) {
      return "You are close to one or more category limits. Be careful with flexible spending for the rest of this period.";
    }

    if (upcomingBillsTotal > 0) {
      return "You have upcoming bills protected in your safe-to-spend calculation. Keep that money reserved before discretionary purchases.";
    }

    return "Your spending picture looks stable for this period. Keep logging activity so SafeSpend can continue giving accurate guidance.";
  }, [totals.count, protectedSafeToSpend, budgetPressure, upcomingBillsTotal]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f4f8fb]">
        <p className="text-lg font-bold text-[#061b3d]">Loading reports...</p>
      </main>
    );
  }

  return (
    <AppShell
      email={email}
      title="See where your money is going."
      subtitle="Review income, spending, categories, budget pressure, bills due soon, and the patterns that affect your safe-to-spend number."
    >
      <BillingGate requiredPlan="plus" featureName="Reports & Spending Insights">
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
        </section>

        <section className="mb-6 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl">
          <p className="mb-2 inline-flex rounded-full bg-cyan-50 px-4 py-2 text-xs font-black uppercase tracking-widest text-cyan-700">
            Report Summary
          </p>

          <h3 className="text-2xl font-black text-[#061b3d]">
            SafeSpend readout
          </h3>

          <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-600">
            {reportSummary}
          </p>
        </section>

        {error && (
          <section className="mb-6 rounded-2xl bg-red-50 p-4 text-sm font-bold text-red-600">
            {error}
          </section>
        )}

        <section className="mb-6 grid gap-6 xl:grid-cols-[1.1fr_.9fr]">
          <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl">
            <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h3 className="text-2xl font-black text-[#061b3d]">
                  Spending by Category
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  Categories ranked by spending in this period.
                </p>
              </div>

              <a
                href="/budgets"
                className="rounded-full border border-slate-200 bg-slate-50 px-5 py-3 text-sm font-black text-[#061b3d]"
              >
                Adjust Budgets
              </a>
            </div>

            {spendingByCategory.length === 0 ? (
              <EmptyState
                title="No spending categories yet"
                description="Add expense transactions to see category trends."
                href="/transactions"
                action="Add Transactions"
              />
            ) : (
              <div className="space-y-4">
                {spendingByCategory.map((item) => (
                  <ProgressRow
                    key={item.category}
                    label={item.category}
                    value={money(item.spent)}
                    percent={item.percent}
                    danger={item.percent >= 50}
                    helper={`${item.percent}% of total spending`}
                  />
                ))}
              </div>
            )}
          </section>

          <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl">
            <div className="mb-5">
              <h3 className="text-2xl font-black text-[#061b3d]">
                Top Merchants
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                Where your money went most often by total spend.
              </p>
            </div>

            {topMerchants.length === 0 ? (
              <EmptyState
                title="No merchant data yet"
                description="Add expenses with merchant names to see top spending places."
                href="/transactions"
                action="Add Transactions"
              />
            ) : (
              <div className="space-y-3">
                {topMerchants.map((item) => (
                  <div
                    key={item.merchant}
                    className="flex items-center justify-between gap-4 rounded-2xl border border-slate-100 bg-slate-50 p-4"
                  >
                    <div>
                      <p className="font-black text-[#061b3d]">
                        {item.merchant}
                      </p>
                      <p className="text-sm text-slate-500">
                        {item.percent}% of total spending
                      </p>
                    </div>

                    <p className="font-black text-[#061b3d]">
                      {money(item.spent)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>
        </section>

        <section className="mb-6 grid gap-6 xl:grid-cols-2">
          <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl">
            <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h3 className="text-2xl font-black text-[#061b3d]">
                  Budget Pressure
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  Spending compared to your weekly category limits.
                </p>
              </div>

              <a
                href="/budgets"
                className="rounded-full bg-gradient-to-r from-[#0b4edb] via-[#00b7c7] to-[#5ce05c] px-5 py-3 text-sm font-black text-white shadow-lg"
              >
                Manage Budgets
              </a>
            </div>

            {budgetPressure.length === 0 ? (
              <EmptyState
                title="No budget limits yet"
                description="Add budgets so SafeSpend can calculate category pressure."
                href="/budgets"
                action="Set Budgets"
              />
            ) : (
              <div className="space-y-4">
                {budgetPressure.map((item) => (
                  <ProgressRow
                    key={item.category}
                    label={item.category}
                    value={`${money(item.spent)} of ${money(item.limit)}`}
                    percent={Math.min(item.percentUsed, 100)}
                    danger={item.status === "Over Budget"}
                    warning={item.status === "Close"}
                    helper={item.status}
                  />
                ))}
              </div>
            )}
          </section>

          <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl">
            <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h3 className="text-2xl font-black text-[#061b3d]">
                  Bills & Obligations
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  Upcoming and overdue bills affecting safe-to-spend.
                </p>
              </div>

              <a
                href="/bills"
                className="rounded-full bg-gradient-to-r from-[#0b4edb] via-[#00b7c7] to-[#5ce05c] px-5 py-3 text-sm font-black text-white shadow-lg"
              >
                Manage Bills
              </a>
            </div>

            <div className="mb-5 grid gap-3 md:grid-cols-3">
              <MiniStat
                label="Due Soon"
                value={money(upcomingBillsTotal)}
                helper={`${upcomingBills.length} bills`}
              />
              <MiniStat
                label="Overdue"
                value={String(overdueBills.length)}
                helper="unpaid"
                danger={overdueBills.length > 0}
              />
              <MiniStat
                label="Protected Safe"
                value={money(protectedSafeToSpend)}
                helper="after bills"
                danger={protectedSafeToSpend <= 0}
              />
            </div>

            {upcomingBills.length === 0 && overdueBills.length === 0 ? (
              <EmptyState
                title="No bill pressure right now"
                description="Add upcoming bills so SafeSpend can protect that money."
                href="/bills"
                action="Add Bills"
              />
            ) : (
              <div className="space-y-3">
                {[...overdueBills, ...upcomingBills].slice(0, 7).map((bill) => {
                  const days = daysUntil(bill.due_date);
                  const overdue = days < 0;

                  return (
                    <div
                      key={bill.id}
                      className={`rounded-2xl border p-4 ${
                        overdue
                          ? "border-red-100 bg-red-50"
                          : "border-slate-100 bg-slate-50"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p
                            className={`font-black ${
                              overdue ? "text-red-700" : "text-[#061b3d]"
                            }`}
                          >
                            {bill.bill_name}
                          </p>

                          <p
                            className={`text-sm ${
                              overdue ? "text-red-600" : "text-slate-500"
                            }`}
                          >
                            {overdue
                              ? `Overdue by ${Math.abs(days)} days`
                              : days === 0
                                ? "Due today"
                                : days === 1
                                  ? "Due tomorrow"
                                  : `Due in ${days} days`}{" "}
                            · {formatDate(bill.due_date)}
                            {bill.is_autopay ? " · Autopay" : ""}
                          </p>
                        </div>

                        <p
                          className={`font-black ${
                            overdue ? "text-red-700" : "text-[#061b3d]"
                          }`}
                        >
                          {money(Number(bill.amount))}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </section>

        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl">
          <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="text-2xl font-black text-[#061b3d]">
                Recent Activity
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                Latest transactions included in your selected report view.
              </p>
            </div>

            <a
              href="/transactions"
              className="rounded-full bg-gradient-to-r from-[#0b4edb] via-[#00b7c7] to-[#5ce05c] px-5 py-3 text-sm font-black text-white shadow-lg"
            >
              Open Transactions
            </a>
          </div>

          {filteredTransactions.length === 0 ? (
            <EmptyState
              title="No activity yet"
              description="Add transactions to start generating reports."
              href="/transactions"
              action="Add Transaction"
            />
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
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
      </BillingGate>
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

function MiniStat({
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
    <div className={`rounded-2xl p-4 ${danger ? "bg-red-50" : "bg-slate-50"}`}>
      <p
        className={`text-xs font-black uppercase tracking-widest ${
          danger ? "text-red-500" : "text-slate-500"
        }`}
      >
        {label}
      </p>
      <p
        className={`mt-1 text-lg font-black ${
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

function ProgressRow({
  label,
  value,
  percent,
  helper,
  danger = false,
  warning = false,
}: {
  label: string;
  value: string;
  percent: number;
  helper: string;
  danger?: boolean;
  warning?: boolean;
}) {
  const cleanPercent = Math.max(0, Math.min(100, Number(percent || 0)));

  return (
    <div className="rounded-3xl border border-slate-100 bg-slate-50 p-4">
      <div className="mb-2 flex items-start justify-between gap-4">
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
          {helper}
        </span>
      </div>

      <div className="h-3 overflow-hidden rounded-full bg-white">
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