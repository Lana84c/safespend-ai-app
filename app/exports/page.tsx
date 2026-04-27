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
  created_at: string;
  updated_at: string;
};

function getTodayDate() {
  return new Date().toISOString().split("T")[0];
}

function getMonthStartIso() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
}

function money(value: number) {
  return Number(value || 0).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });
}

function csvEscape(value: unknown) {
  if (value === null || value === undefined) return "";

  const stringValue = String(value).replaceAll('"', '""');

  if (
    stringValue.includes(",") ||
    stringValue.includes('"') ||
    stringValue.includes("\n")
  ) {
    return `"${stringValue}"`;
  }

  return stringValue;
}

function toCsv(headers: string[], rows: unknown[][]) {
  return [
    headers.map(csvEscape).join(","),
    ...rows.map((row) => row.map(csvEscape).join(",")),
  ].join("\n");
}

function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], {
    type: "text/csv;charset=utf-8;",
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

export default function ExportsPage() {
  const router = useRouter();

  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState("");

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);

  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

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
      loadTransactions(user.id),
      loadBudgets(user.id),
      loadBills(user.id),
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

  async function recordExportUsage(exportType: string) {
    if (!userId) return;

    const { error } = await supabase.from("usage_events").insert({
      user_id: userId,
      event_type: "export_created",
      metadata: {
        export_type: exportType,
      },
    });

    if (error) {
      console.warn("Unable to record export usage event:", error.message);
    }
  }

  const monthlySummary = useMemo(() => {
    const monthStart = new Date(getMonthStartIso());

    const monthTransactions = transactions.filter((tx) => {
      const txDate = new Date(`${tx.date}T00:00:00`);
      return txDate >= monthStart;
    });

    const income = monthTransactions
      .filter((tx) => Number(tx.amount) > 0)
      .reduce((sum, tx) => sum + Number(tx.amount), 0);

    const spending = monthTransactions
      .filter((tx) => Number(tx.amount) < 0)
      .reduce((sum, tx) => sum + Math.abs(Number(tx.amount)), 0);

    const debtPayments = monthTransactions
      .filter((tx) => tx.type === "Debt")
      .reduce((sum, tx) => sum + Math.abs(Number(tx.amount)), 0);

    const savings = monthTransactions
      .filter((tx) => tx.type === "Savings")
      .reduce((sum, tx) => sum + Math.abs(Number(tx.amount)), 0);

    const unpaidBills = bills
      .filter((bill) => !bill.is_paid)
      .reduce((sum, bill) => sum + Number(bill.amount || 0), 0);

    return {
      income,
      spending,
      debtPayments,
      savings,
      unpaidBills,
      safeToSpend: income - spending - unpaidBills,
      transactionCount: monthTransactions.length,
      budgetCount: budgets.length,
      billCount: bills.length,
    };
  }, [transactions, budgets, bills]);

  async function handleExportTransactions() {
    setExporting("transactions");
    setError("");
    setStatus("");

    const csv = toCsv(
      [
        "Date",
        "Type",
        "Category",
        "Merchant/Person",
        "Description",
        "Amount",
        "Created At",
      ],
      transactions.map((tx) => [
        tx.date,
        tx.type,
        tx.category,
        tx.merchant || "",
        tx.description || "",
        Number(tx.amount),
        tx.created_at,
      ])
    );

    downloadCsv(`safespend-transactions-${getTodayDate()}.csv`, csv);
    await recordExportUsage("transactions");

    setStatus("Transactions CSV downloaded.");
    setExporting("");
  }

  async function handleExportBudgets() {
    setExporting("budgets");
    setError("");
    setStatus("");

    const csv = toCsv(
      ["Category", "Weekly Limit", "Monthly Limit", "Created At"],
      budgets.map((budget) => [
        budget.category,
        Number(budget.weekly_limit || 0),
        Number(budget.monthly_limit || 0),
        budget.created_at,
      ])
    );

    downloadCsv(`safespend-budgets-${getTodayDate()}.csv`, csv);
    await recordExportUsage("budgets");

    setStatus("Budgets CSV downloaded.");
    setExporting("");
  }

  async function handleExportBills() {
    setExporting("bills");
    setError("");
    setStatus("");

    const csv = toCsv(
      [
        "Bill Name",
        "Category",
        "Amount",
        "Due Date",
        "Frequency",
        "Autopay",
        "Paid",
        "Notes",
        "Created At",
        "Updated At",
      ],
      bills.map((bill) => [
        bill.bill_name,
        bill.category,
        Number(bill.amount || 0),
        bill.due_date,
        bill.frequency,
        bill.is_autopay ? "Yes" : "No",
        bill.is_paid ? "Yes" : "No",
        bill.notes || "",
        bill.created_at,
        bill.updated_at,
      ])
    );

    downloadCsv(`safespend-bills-${getTodayDate()}.csv`, csv);
    await recordExportUsage("bills");

    setStatus("Bills CSV downloaded.");
    setExporting("");
  }

  async function handleExportMonthlySummary() {
    setExporting("summary");
    setError("");
    setStatus("");

    const csv = toCsv(
      ["Metric", "Value"],
      [
        ["Monthly Income", monthlySummary.income],
        ["Monthly Spending", monthlySummary.spending],
        ["Debt Payments", monthlySummary.debtPayments],
        ["Savings", monthlySummary.savings],
        ["Unpaid Bills", monthlySummary.unpaidBills],
        ["Protected Safe To Spend", monthlySummary.safeToSpend],
        ["Transaction Count", monthlySummary.transactionCount],
        ["Budget Count", monthlySummary.budgetCount],
        ["Bill Count", monthlySummary.billCount],
      ]
    );

    downloadCsv(`safespend-monthly-summary-${getTodayDate()}.csv`, csv);
    await recordExportUsage("monthly_summary");

    setStatus("Monthly summary CSV downloaded.");
    setExporting("");
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f4f8fb]">
        <p className="text-lg font-bold text-[#061b3d]">Loading exports...</p>
      </main>
    );
  }

  return (
    <AppShell
      email={email}
      title="Export your SafeSpend records."
      subtitle="Pro users can download transactions, budgets, bills, and monthly summaries as CSV files."
    >
      <BillingGate requiredPlan="pro" featureName="Pro Exports">
        <section className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Transactions"
            value={String(transactions.length)}
            helper="Available for export"
          />

          <MetricCard
            label="Budgets"
            value={String(budgets.length)}
            helper="Category guardrails"
          />

          <MetricCard
            label="Bills"
            value={String(bills.length)}
            helper="Tracked obligations"
          />

          <MetricCard
            label="Protected Safe"
            value={money(monthlySummary.safeToSpend)}
            helper="This month summary"
            danger={monthlySummary.safeToSpend <= 0}
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

        <section className="grid gap-6 xl:grid-cols-[1.1fr_.9fr]">
          <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl">
            <p className="mb-2 inline-flex rounded-full bg-blue-50 px-4 py-2 text-xs font-black uppercase tracking-widest text-blue-700">
              Pro Export Center
            </p>

            <h3 className="text-2xl font-black text-[#061b3d]">
              Download your financial records.
            </h3>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
              Export clean CSV files for review, spreadsheet analysis,
              bookkeeping support, or personal recordkeeping. These exports are
              generated from the data saved in your SafeSpend account.
            </p>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <ExportCard
                title="Transactions CSV"
                description="Download every income, expense, transfer, debt, savings, and event entry."
                count={`${transactions.length} records`}
                buttonText="Export Transactions"
                disabled={exporting !== ""}
                loading={exporting === "transactions"}
                onClick={handleExportTransactions}
              />

              <ExportCard
                title="Budgets CSV"
                description="Download category limits for weekly and monthly spending guardrails."
                count={`${budgets.length} records`}
                buttonText="Export Budgets"
                disabled={exporting !== ""}
                loading={exporting === "budgets"}
                onClick={handleExportBudgets}
              />

              <ExportCard
                title="Bills CSV"
                description="Download bills, due dates, frequencies, autopay status, and paid status."
                count={`${bills.length} records`}
                buttonText="Export Bills"
                disabled={exporting !== ""}
                loading={exporting === "bills"}
                onClick={handleExportBills}
              />

              <ExportCard
                title="Monthly Summary CSV"
                description="Download a simple month-to-date financial snapshot."
                count="Summary file"
                buttonText="Export Summary"
                disabled={exporting !== ""}
                loading={exporting === "summary"}
                onClick={handleExportMonthlySummary}
              />
            </div>
          </section>

          <aside className="space-y-6">
            <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl">
              <h3 className="text-2xl font-black text-[#061b3d]">
                Month-to-date summary
              </h3>

              <div className="mt-5 space-y-3">
                <SummaryRow
                  label="Income"
                  value={money(monthlySummary.income)}
                />
                <SummaryRow
                  label="Spending"
                  value={money(monthlySummary.spending)}
                />
                <SummaryRow
                  label="Debt Payments"
                  value={money(monthlySummary.debtPayments)}
                />
                <SummaryRow
                  label="Savings"
                  value={money(monthlySummary.savings)}
                />
                <SummaryRow
                  label="Unpaid Bills"
                  value={money(monthlySummary.unpaidBills)}
                />
                <SummaryRow
                  label="Protected Safe"
                  value={money(monthlySummary.safeToSpend)}
                  danger={monthlySummary.safeToSpend <= 0}
                />
              </div>
            </section>

            <section className="rounded-[2rem] border border-yellow-100 bg-yellow-50 p-6 shadow-xl">
              <h3 className="text-xl font-black text-yellow-800">
                Export disclaimer
              </h3>

              <p className="mt-3 text-sm leading-6 text-yellow-700">
                SafeSpend exports are for budgeting, spending awareness, and
                personal organization. They are not financial, legal, tax,
                investment, credit, banking, or accounting advice.
              </p>
            </section>
          </aside>
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

function ExportCard({
  title,
  description,
  count,
  buttonText,
  disabled,
  loading,
  onClick,
}: {
  title: string;
  description: string;
  count: string;
  buttonText: string;
  disabled: boolean;
  loading: boolean;
  onClick: () => void;
}) {
  return (
    <div className="rounded-3xl border border-slate-100 bg-slate-50 p-5">
      <p className="mb-3 inline-flex rounded-full bg-white px-3 py-1 text-xs font-black text-slate-500">
        {count}
      </p>

      <h4 className="text-xl font-black text-[#061b3d]">{title}</h4>

      <p className="mt-2 min-h-16 text-sm leading-6 text-slate-500">
        {description}
      </p>

      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className="mt-5 w-full rounded-full bg-gradient-to-r from-[#061b3d] via-[#0b4edb] to-[#00b7c7] px-5 py-3 text-sm font-black text-white shadow-lg disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "Exporting..." : buttonText}
      </button>
    </div>
  );
}

function SummaryRow({
  label,
  value,
  danger = false,
}: {
  label: string;
  value: string;
  danger?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between gap-4 rounded-2xl p-4 ${
        danger ? "bg-red-50" : "bg-slate-50"
      }`}
    >
      <p
        className={`text-sm font-black ${
          danger ? "text-red-700" : "text-[#061b3d]"
        }`}
      >
        {label}
      </p>

      <p
        className={`text-sm font-black ${
          danger ? "text-red-700" : "text-[#061b3d]"
        }`}
      >
        {value}
      </p>
    </div>
  );
}