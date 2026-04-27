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
  created_at?: string;
  updated_at?: string;
};

function getTodayDate() {
  return new Date().toISOString().split("T")[0];
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

export default function DashboardPage() {
  const router = useRouter();

  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [billing, setBilling] = useState<BillingRecord | null>(null);

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const effectivePlan = getEffectivePlan(billing);
  const currentStatus = billing?.status || "free";

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
      loadBudgets(user.id),
      loadBills(user.id),
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

  const weekTransactions = useMemo(() => {
    const weekStart = getWeekStartDate();

    return transactions.filter((tx) => {
      const txDate = new Date(`${tx.date}T00:00:00`);
      return txDate >= weekStart;
    });
  }, [transactions]);

  const monthTransactions = useMemo(() => {
    const monthStart = getMonthStartDate();

    return transactions.filter((tx) => {
      const txDate = new Date(`${tx.date}T00:00:00`);
      return txDate >= monthStart;
    });
  }, [transactions]);

  const dashboardTotals = useMemo(() => {
    const weeklyIncome = weekTransactions
      .filter((tx) => Number(tx.amount) > 0)
      .reduce((sum, tx) => sum + Number(tx.amount), 0);

    const weeklySpent = weekTransactions
      .filter((tx) => Number(tx.amount) < 0)
      .reduce((sum, tx) => sum + Math.abs(Number(tx.amount)), 0);

    const monthlyIncome = monthTransactions
      .filter((tx) => Number(tx.amount) > 0)
      .reduce((sum, tx) => sum + Number(tx.amount), 0);

    const monthlySpent = monthTransactions
      .filter((tx) => Number(tx.amount) < 0)
      .reduce((sum, tx) => sum + Math.abs(Number(tx.amount)), 0);

    const safeToSpend = weeklyIncome - weeklySpent;

    const risk =
      safeToSpend <= 0
        ? "Critical"
        : safeToSpend < 100
          ? "High"
          : safeToSpend < 250
            ? "Medium"
            : "Low";

    return {
      weeklyIncome,
      weeklySpent,
      monthlyIncome,
      monthlySpent,
      safeToSpend,
      risk,
      weeklyCount: weekTransactions.length,
      monthlyCount: monthTransactions.length,
    };
  }, [weekTransactions, monthTransactions]);

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

    const unpaidTotal = unpaidBills.reduce(
      (sum, bill) => sum + Number(bill.amount || 0),
      0
    );

    return {
      dueSoonBills,
      overdueBills,
      dueSoonTotal,
      unpaidTotal,
      unpaidCount: unpaidBills.length,
    };
  }, [bills]);

  const protectedSafeToSpend =
    dashboardTotals.safeToSpend - billSummary.dueSoonTotal;

  const budgetPressure = useMemo(() => {
    const weekStart = getWeekStartDate();

    return budgets
      .filter((budget) => Number(budget.weekly_limit) > 0)
      .map((budget) => {
        const spent = transactions
          .filter((tx) => {
            const txDate = new Date(`${tx.date}T00:00:00`);
            return (
              tx.category === budget.category &&
              Number(tx.amount) < 0 &&
              txDate >= weekStart
            );
          })
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
  }, [budgets, transactions]);

  const topSpendingCategory = useMemo(() => {
    const map = new Map<string, number>();

    weekTransactions
      .filter((tx) => Number(tx.amount) < 0)
      .forEach((tx) => {
        const current = map.get(tx.category) || 0;
        map.set(tx.category, current + Math.abs(Number(tx.amount)));
      });

    return (
      Array.from(map.entries())
        .map(([category, spent]) => ({ category, spent }))
        .sort((a, b) => b.spent - a.spent)[0] || null
    );
  }, [weekTransactions]);

  const dashboardSummary = useMemo(() => {
    if (protectedSafeToSpend <= 0) {
      return "Your protected safe-to-spend is at or below zero after upcoming bills. Pause non-essential spending and protect bills first.";
    }

    if (budgetPressure.some((item) => item.status === "Over Budget")) {
      return "At least one budget category is over limit. Review your highest-pressure categories before spending again.";
    }

    if (billSummary.overdueBills.length > 0) {
      return "You have overdue bills that need attention. Handle those before new flexible spending.";
    }

    if (billSummary.dueSoonTotal > 0) {
      return "You have upcoming bills affecting your safe-to-spend. Keep that money protected.";
    }

    if (topSpendingCategory) {
      return `${topSpendingCategory.category} is your highest spending area this week. Check it before making another flexible purchase.`;
    }

    return "Your dashboard is ready. Add income, expenses, budgets, and bills to make SafeSpend more accurate.";
  }, [
    protectedSafeToSpend,
    budgetPressure,
    billSummary.overdueBills.length,
    billSummary.dueSoonTotal,
    topSpendingCategory,
  ]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f4f8fb]">
        <p className="text-lg font-bold text-[#061b3d]">Loading dashboard...</p>
      </main>
    );
  }

  return (
    <AppShell
      email={email}
      title="Your SafeSpend dashboard."
      subtitle="See your safe-to-spend, bills, budgets, recent activity, and plan access in one clear view."
    >
      {error && (
        <section className="mb-6 rounded-2xl bg-red-50 p-4 text-sm font-bold text-red-600">
          {error}
        </section>
      )}

      <PlanStatusCard plan={effectivePlan} status={currentStatus} />

      <section className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <MetricCard
          label="Safe to Spend"
          value={money(dashboardTotals.safeToSpend)}
          helper="This week before protected bills"
          danger={dashboardTotals.safeToSpend <= 0}
          warning={
            dashboardTotals.safeToSpend > 0 &&
            dashboardTotals.safeToSpend < 250
          }
        />

        <MetricCard
          label="Protected Safe"
          value={money(protectedSafeToSpend)}
          helper="After bills due soon"
          danger={protectedSafeToSpend <= 0}
          warning={protectedSafeToSpend > 0 && protectedSafeToSpend < 250}
        />

        <MetricCard
          label="Week Spent"
          value={money(dashboardTotals.weeklySpent)}
          helper={`${dashboardTotals.weeklyCount} entries this week`}
        />

        <MetricCard
          label="Bills Due Soon"
          value={money(billSummary.dueSoonTotal)}
          helper={`${billSummary.dueSoonBills.length} due in 14 days`}
          warning={billSummary.dueSoonBills.length > 0}
        />

        <MetricCard
          label="Risk Level"
          value={protectedSafeToSpend <= 0 ? "Critical" : dashboardTotals.risk}
          helper="Based on safe-to-spend"
          danger={protectedSafeToSpend <= 0}
          warning={dashboardTotals.risk === "High" || dashboardTotals.risk === "Medium"}
        />
      </section>

      <section className="mb-6 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="mb-3 inline-flex rounded-full bg-cyan-50 px-4 py-2 text-xs font-black uppercase tracking-widest text-cyan-700">
              SafeSpend Readout
            </p>

            <h3 className="text-3xl font-black tracking-[-0.04em] text-[#061b3d]">
              {dashboardSummary}
            </h3>

            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-500">
              This is based on your logged transactions, budget limits, and bills
              due soon. The more you log, the smarter this readout gets.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <a
              href="/coach"
              className="rounded-full bg-gradient-to-r from-[#0b4edb] via-[#00b7c7] to-[#5ce05c] px-5 py-3 text-sm font-black text-white shadow-lg"
            >
              Ask Coach
            </a>

            <a
              href="/transactions"
              className="rounded-full border border-slate-200 bg-slate-50 px-5 py-3 text-sm font-black text-[#061b3d]"
            >
              Add Transaction
            </a>
          </div>
        </div>
      </section>

      <section className="mb-6 grid gap-6 xl:grid-cols-[1.1fr_.9fr]">
        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl">
          <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="text-2xl font-black text-[#061b3d]">
                Budget Pressure
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                Your highest-pressure weekly budget categories.
              </p>
            </div>

            <a
              href="/budgets"
              className="rounded-full border border-slate-200 bg-slate-50 px-5 py-3 text-sm font-black text-[#061b3d]"
            >
              Manage Budgets
            </a>
          </div>

          {budgetPressure.length === 0 ? (
            <EmptyState
              title="No budget guardrails yet"
              description="Add budgets so SafeSpend can calculate spending pressure."
              href="/budgets"
              action="Set Budgets"
            />
          ) : (
            <div className="space-y-4">
              {budgetPressure.slice(0, 5).map((item) => (
                <ProgressRow
                  key={item.category}
                  label={item.category}
                  value={`${money(item.spent)} of ${money(item.limit)}`}
                  percent={Math.min(item.percentUsed, 100)}
                  status={item.status}
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
                Upcoming and overdue bills affecting your safe-to-spend.
              </p>
            </div>

            <a
              href="/bills"
              className="rounded-full border border-slate-200 bg-slate-50 px-5 py-3 text-sm font-black text-[#061b3d]"
            >
              Manage Bills
            </a>
          </div>

          {bills.length === 0 ? (
            <EmptyState
              title="No bills tracked yet"
              description="Add bills so SafeSpend can protect money before you spend it."
              href="/bills"
              action="Add Bills"
            />
          ) : (
            <div className="space-y-3">
              {[...billSummary.overdueBills, ...billSummary.dueSoonBills]
                .slice(0, 6)
                .map((bill) => {
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

              {billSummary.overdueBills.length === 0 &&
                billSummary.dueSoonBills.length === 0 && (
                  <div className="rounded-3xl border border-slate-100 bg-slate-50 p-5">
                    <p className="font-black text-[#061b3d]">
                      No urgent bill pressure
                    </p>
                    <p className="mt-1 text-sm leading-6 text-slate-500">
                      You have bills tracked, but none are overdue or due in the
                      next 14 days.
                    </p>
                  </div>
                )}
            </div>
          )}
        </section>
      </section>

      <section className="mb-6 grid gap-6 xl:grid-cols-[.9fr_1.1fr]">
        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl">
          <h3 className="text-2xl font-black text-[#061b3d]">
            Monthly Snapshot
          </h3>

          <div className="mt-5 space-y-3">
            <SnapshotRow
              label="Monthly Income"
              value={money(dashboardTotals.monthlyIncome)}
            />
            <SnapshotRow
              label="Monthly Spending"
              value={money(dashboardTotals.monthlySpent)}
            />
            <SnapshotRow
              label="Unpaid Bills"
              value={money(billSummary.unpaidTotal)}
              warning={billSummary.unpaidTotal > 0}
            />
            <SnapshotRow
              label="Transactions This Month"
              value={String(dashboardTotals.monthlyCount)}
            />
            <SnapshotRow label="Active Budgets" value={String(budgets.length)} />
            <SnapshotRow label="Tracked Bills" value={String(bills.length)} />
          </div>
        </section>

        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl">
          <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="text-2xl font-black text-[#061b3d]">
                Recent Activity
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                Your latest logged money activity.
              </p>
            </div>

            <a
              href="/transactions"
              className="rounded-full bg-gradient-to-r from-[#0b4edb] via-[#00b7c7] to-[#5ce05c] px-5 py-3 text-sm font-black text-white shadow-lg"
            >
              Open Transactions
            </a>
          </div>

          {transactions.length === 0 ? (
            <EmptyState
              title="No transactions yet"
              description="Add income and expenses to activate your dashboard."
              href="/transactions"
              action="Add Transaction"
            />
          ) : (
            <div className="space-y-3">
              {transactions.slice(0, 6).map((tx) => (
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

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <QuickAction
          title="Ask SafeSpend Coach"
          description="Check a purchase, log spending, or recover from overspending."
          href="/coach"
          action="Open Coach"
          highlighted
        />

        <QuickAction
          title="Run Reports"
          description="Review spending categories, budget pressure, and bill impact."
          href="/reports"
          action="View Reports"
        />

        <QuickAction
          title="Export Records"
          description="Pro users can download CSV records and monthly summaries."
          href="/exports"
          action="Open Exports"
        />

        <QuickAction
          title="Manage Billing"
          description="Upgrade, manage your subscription, or review plan access."
          href="/billing"
          action="Open Billing"
        />
      </section>
    </AppShell>
  );
}

function PlanStatusCard({
  plan,
  status,
}: {
  plan: "free" | "plus" | "pro";
  status: string;
}) {
  const planLabel = formatPlanLabel(plan);

  const details = {
    free: {
      badge: "Starter",
      description:
        "You can track basic spending, budgets, bills, and limited coach messages.",
      included: [
        "100 transactions/month",
        "3 budgets max",
        "10 bills tracked",
        "10 coach messages/month",
      ],
      upgrade:
        "Upgrade to Plus for reports, protected safe-to-spend, and higher limits.",
      href: "/billing",
      cta: "View Plus",
    },
    plus: {
      badge: "Full Control",
      description:
        "You have the core SafeSpend system unlocked for everyday money control.",
      included: [
        "Unlimited transactions",
        "Unlimited budgets",
        "50 bills tracked",
        "20 reports/month",
        "100 coach messages/month",
      ],
      upgrade:
        "Upgrade to Pro for exports, advanced insights, and unlimited reports.",
      href: "/billing",
      cta: "View Pro",
    },
    pro: {
      badge: "Premium",
      description:
        "You have SafeSpend’s premium reporting, exports, and advanced insight tools.",
      included: [
        "Unlimited bills",
        "Unlimited reports",
        "CSV exports",
        "Advanced insights",
        "Higher AI coaching",
      ],
      upgrade: "You are on the highest current SafeSpend plan.",
      href: "/exports",
      cta: "Open Exports",
    },
  }[plan];

  return (
    <section className="mb-6 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="mb-3 inline-flex rounded-full bg-cyan-50 px-4 py-2 text-xs font-black uppercase tracking-widest text-cyan-700">
            Plan Status
          </p>

          <h3 className="text-3xl font-black tracking-[-0.04em] text-[#061b3d]">
            {planLabel} Plan
          </h3>

          <p className="mt-2 text-sm font-bold capitalize text-slate-500">
            Status: {status.replaceAll("_", " ")}
          </p>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
            {details.description}
          </p>
        </div>

        <div className="rounded-3xl bg-gradient-to-br from-[#0637b8] via-[#0072b8] to-[#00a878] p-5 text-white shadow-lg lg:min-w-[260px]">
          <p className="text-xs font-black uppercase tracking-widest text-white/70">
            Current Tier
          </p>

          <p className="mt-2 text-2xl font-black">{details.badge}</p>

          <p className="mt-3 text-sm leading-6 text-white/80">
            {details.upgrade}
          </p>

          <a
            href={details.href}
            className="mt-5 inline-flex rounded-full bg-white px-5 py-3 text-sm font-black text-[#061b3d]"
          >
            {details.cta}
          </a>
        </div>
      </div>

      <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {details.included.map((item) => (
          <div
            key={item}
            className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm font-black text-[#061b3d]"
          >
            {item}
          </div>
        ))}
      </div>
    </section>
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
          {status}
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

function SnapshotRow({
  label,
  value,
  warning = false,
}: {
  label: string;
  value: string;
  warning?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between gap-4 rounded-2xl p-4 ${
        warning ? "bg-yellow-50" : "bg-slate-50"
      }`}
    >
      <p
        className={`text-sm font-black ${
          warning ? "text-yellow-800" : "text-[#061b3d]"
        }`}
      >
        {label}
      </p>

      <p
        className={`text-sm font-black ${
          warning ? "text-yellow-800" : "text-[#061b3d]"
        }`}
      >
        {value}
      </p>
    </div>
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

function QuickAction({
  title,
  description,
  href,
  action,
  highlighted = false,
}: {
  title: string;
  description: string;
  href: string;
  action: string;
  highlighted?: boolean;
}) {
  return (
    <section
      className={`rounded-[2rem] border p-6 shadow-xl ${
        highlighted
          ? "border-cyan-200 bg-gradient-to-br from-white to-cyan-50"
          : "border-slate-200 bg-white"
      }`}
    >
      <h3 className="text-xl font-black text-[#061b3d]">{title}</h3>

      <p className="mt-2 min-h-16 text-sm leading-6 text-slate-500">
        {description}
      </p>

      <a
        href={href}
        className={`mt-5 inline-flex rounded-full px-5 py-3 text-sm font-black shadow-lg ${
          highlighted
            ? "bg-gradient-to-r from-[#0b4edb] via-[#00b7c7] to-[#5ce05c] text-white"
            : "border border-slate-200 bg-slate-50 text-[#061b3d]"
        }`}
      >
        {action}
      </a>
    </section>
  );
}