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

type Bill = {
  id: string;
  user_id: string;
  bill_name: string;
  category: string;
  amount: number;
  due_date: string;
  frequency:
    | "one_time"
    | "weekly"
    | "biweekly"
    | "monthly"
    | "quarterly"
    | "yearly";
  is_autopay: boolean;
  is_paid: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

const FREE_BILL_LIMIT = 10;
const PLUS_BILL_LIMIT = 50;

const categories = [
  "Bills",
  "Rent/Mortgage",
  "Utilities",
  "Phone",
  "Internet",
  "Insurance",
  "Debt",
  "Subscriptions",
  "Transportation",
  "Other",
];

const frequencies = [
  { label: "One Time", value: "one_time" },
  { label: "Weekly", value: "weekly" },
  { label: "Biweekly", value: "biweekly" },
  { label: "Monthly", value: "monthly" },
  { label: "Quarterly", value: "quarterly" },
  { label: "Yearly", value: "yearly" },
] as const;

function getTodayDate() {
  return new Date().toISOString().split("T")[0];
}

function addDays(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().split("T")[0];
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

function getDueStatus(bill: Bill) {
  if (bill.is_paid) {
    return {
      label: "Paid",
      className: "bg-green-100 text-green-700",
    };
  }

  const days = daysUntil(bill.due_date);

  if (days < 0) {
    return {
      label: "Overdue",
      className: "bg-red-100 text-red-700",
    };
  }

  if (days === 0) {
    return {
      label: "Due Today",
      className: "bg-red-100 text-red-700",
    };
  }

  if (days <= 3) {
    return {
      label: `Due in ${days} days`,
      className: "bg-yellow-100 text-yellow-700",
    };
  }

  if (days <= 7) {
    return {
      label: `Due in ${days} days`,
      className: "bg-blue-100 text-blue-700",
    };
  }

  return {
    label: `Due in ${days} days`,
    className: "bg-slate-100 text-slate-600",
  };
}

export default function BillsPage() {
  const router = useRouter();

  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [billing, setBilling] = useState<BillingRecord | null>(null);

  const [bills, setBills] = useState<Bill[]>([]);

  const [billName, setBillName] = useState("");
  const [category, setCategory] = useState("Bills");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState(addDays(7));
  const [frequency, setFrequency] = useState<Bill["frequency"]>("monthly");
  const [isAutopay, setIsAutopay] = useState(false);
  const [isPaid, setIsPaid] = useState(false);
  const [notes, setNotes] = useState("");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editBillName, setEditBillName] = useState("");
  const [editCategory, setEditCategory] = useState("Bills");
  const [editAmount, setEditAmount] = useState("");
  const [editDueDate, setEditDueDate] = useState(getTodayDate());
  const [editFrequency, setEditFrequency] =
    useState<Bill["frequency"]>("monthly");
  const [editIsAutopay, setEditIsAutopay] = useState(false);
  const [editIsPaid, setEditIsPaid] = useState(false);
  const [editNotes, setEditNotes] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");

  const effectivePlan = getEffectivePlan(billing);
  const isFreePlan = effectivePlan === "free";
  const isPlusPlan = effectivePlan === "plus";
  const isProPlan = effectivePlan === "pro";

  const billLimit = isFreePlan
    ? FREE_BILL_LIMIT
    : isPlusPlan
      ? PLUS_BILL_LIMIT
      : null;

  const billsRemaining =
    billLimit === null ? null : Math.max(billLimit - bills.length, 0);

  const billLimitReached = billLimit !== null && bills.length >= billLimit;

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

    await Promise.all([loadBilling(user.id), loadBills(user.id)]);

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

  async function recordBillUsage(currentUserId: string) {
    const { error } = await supabase.from("usage_events").insert({
      user_id: currentUserId,
      event_type: "bill_created",
      metadata: {
        plan: effectivePlan,
      },
    });

    if (error) {
      console.warn("Unable to record bill usage event:", error.message);
    }
  }

  const billSummary = useMemo(() => {
    const unpaidBills = bills.filter((bill) => !bill.is_paid);

    const unpaidTotal = unpaidBills.reduce(
      (sum, bill) => sum + Number(bill.amount || 0),
      0
    );

    const dueSoonBills = unpaidBills.filter((bill) => {
      const days = daysUntil(bill.due_date);
      return days >= 0 && days <= 7;
    });

    const dueSoonTotal = dueSoonBills.reduce(
      (sum, bill) => sum + Number(bill.amount || 0),
      0
    );

    const overdueBills = unpaidBills.filter(
      (bill) => daysUntil(bill.due_date) < 0
    );

    const autopayTotal = unpaidBills
      .filter((bill) => bill.is_autopay)
      .reduce((sum, bill) => sum + Number(bill.amount || 0), 0);

    return {
      unpaidTotal,
      dueSoonTotal,
      dueSoonCount: dueSoonBills.length,
      overdueCount: overdueBills.length,
      autopayTotal,
      unpaidCount: unpaidBills.length,
    };
  }, [bills]);

  async function handleAddBill(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!userId) return;

    setSaving(true);
    setError("");
    setStatus("");

    if (billLimitReached) {
      setError(
        isFreePlan
          ? `Free plan limit reached. You can track up to ${FREE_BILL_LIMIT} bills on Free. Upgrade to Plus for up to ${PLUS_BILL_LIMIT} bills.`
          : `Plus plan limit reached. You can track up to ${PLUS_BILL_LIMIT} bills on Plus. Upgrade to Pro for unlimited bill tracking and advanced features.`
      );
      setSaving(false);
      return;
    }

    const numericAmount = Number(amount);

    if (!billName.trim()) {
      setError("Please enter a bill name.");
      setSaving(false);
      return;
    }

    if (!numericAmount || numericAmount <= 0) {
      setError("Please enter an amount greater than 0.");
      setSaving(false);
      return;
    }

    const { error } = await supabase.from("bills").insert({
      user_id: userId,
      bill_name: billName.trim(),
      category,
      amount: numericAmount,
      due_date: dueDate,
      frequency,
      is_autopay: isAutopay,
      is_paid: isPaid,
      notes: notes.trim() || null,
      updated_at: new Date().toISOString(),
    });

    if (error) {
      setError(error.message);
      setSaving(false);
      return;
    }

    await recordBillUsage(userId);

    setBillName("");
    setCategory("Bills");
    setAmount("");
    setDueDate(addDays(7));
    setFrequency("monthly");
    setIsAutopay(false);
    setIsPaid(false);
    setNotes("");

    await loadBills(userId);

    setStatus("Bill added.");
    setSaving(false);
  }

  function startEditing(bill: Bill) {
    setEditingId(bill.id);
    setEditBillName(bill.bill_name);
    setEditCategory(bill.category);
    setEditAmount(String(Number(bill.amount || 0)));
    setEditDueDate(bill.due_date);
    setEditFrequency(bill.frequency);
    setEditIsAutopay(bill.is_autopay);
    setEditIsPaid(bill.is_paid);
    setEditNotes(bill.notes || "");
    setError("");
    setStatus("");
  }

  function cancelEditing() {
    setEditingId(null);
    setEditBillName("");
    setEditCategory("Bills");
    setEditAmount("");
    setEditDueDate(getTodayDate());
    setEditFrequency("monthly");
    setEditIsAutopay(false);
    setEditIsPaid(false);
    setEditNotes("");
  }

  async function handleUpdateBill(billId: string) {
    if (!userId) return;

    setSaving(true);
    setError("");
    setStatus("");

    const numericAmount = Number(editAmount);

    if (!editBillName.trim()) {
      setError("Please enter a bill name.");
      setSaving(false);
      return;
    }

    if (!numericAmount || numericAmount <= 0) {
      setError("Please enter an amount greater than 0.");
      setSaving(false);
      return;
    }

    const { error } = await supabase
      .from("bills")
      .update({
        bill_name: editBillName.trim(),
        category: editCategory,
        amount: numericAmount,
        due_date: editDueDate,
        frequency: editFrequency,
        is_autopay: editIsAutopay,
        is_paid: editIsPaid,
        notes: editNotes.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", billId)
      .eq("user_id", userId);

    if (error) {
      setError(error.message);
      setSaving(false);
      return;
    }

    cancelEditing();
    await loadBills(userId);

    setStatus("Bill updated.");
    setSaving(false);
  }

  async function handleTogglePaid(bill: Bill) {
    if (!userId) return;

    setError("");
    setStatus("");

    const { error } = await supabase
      .from("bills")
      .update({
        is_paid: !bill.is_paid,
        updated_at: new Date().toISOString(),
      })
      .eq("id", bill.id)
      .eq("user_id", userId);

    if (error) {
      setError(error.message);
      return;
    }

    await loadBills(userId);
  }

  async function handleDeleteBill(billId: string) {
    if (!userId) return;

    const confirmed = window.confirm(
      "Delete this bill? This cannot be undone."
    );

    if (!confirmed) return;

    setError("");
    setStatus("");

    const { error } = await supabase
      .from("bills")
      .delete()
      .eq("id", billId)
      .eq("user_id", userId);

    if (error) {
      setError(error.message);
      return;
    }

    await loadBills(userId);
    setStatus("Bill deleted.");
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f4f8fb]">
        <p className="text-lg font-bold text-[#061b3d]">Loading bills...</p>
      </main>
    );
  }

  return (
    <AppShell
      email={email}
      title="Track money that is already spoken for."
      subtitle="Add bills, subscriptions, debt minimums, autopay items, and due dates so SafeSpend can protect that money before you spend it."
    >
      <section className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <SummaryCard
          label="Plan"
          value={formatPlanLabel(effectivePlan)}
          helper={
            isFreePlan
              ? `Up to ${FREE_BILL_LIMIT} bills`
              : isPlusPlan
                ? `Up to ${PLUS_BILL_LIMIT} bills`
                : "Unlimited bills"
          }
        />

        <SummaryCard
          label="Bill Usage"
          value={
            billLimit === null
              ? `${bills.length} tracked`
              : `${bills.length}/${billLimit}`
          }
          helper={
            billLimit === null
              ? "No bill limit"
              : `${billsRemaining} bill slots left`
          }
          warning={
            billLimit !== null && billsRemaining !== null && billsRemaining <= 5
          }
          danger={billLimitReached}
        />

        <SummaryCard
          label="Unpaid Bills"
          value={money(billSummary.unpaidTotal)}
          helper={`${billSummary.unpaidCount} unpaid obligations`}
          danger={billSummary.unpaidTotal > 0}
        />

        <SummaryCard
          label="Due Soon"
          value={money(billSummary.dueSoonTotal)}
          helper={`${billSummary.dueSoonCount} due within 7 days`}
          warning={billSummary.dueSoonCount > 0}
        />

        <SummaryCard
          label="Overdue"
          value={String(billSummary.overdueCount)}
          helper="Needs attention"
          danger={billSummary.overdueCount > 0}
        />
      </section>

      {billLimitReached && (
        <section className="mb-6 rounded-[2rem] bg-gradient-to-br from-[#061b3d] via-[#0b4edb] to-[#00b7c7] p-6 text-white shadow-xl">
          <p className="mb-2 inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-black uppercase tracking-widest">
            Limit Reached
          </p>

          <h3 className="text-3xl font-black tracking-[-0.04em]">
            You used all {billLimit} bill slots on{" "}
            {formatPlanLabel(effectivePlan)}.
          </h3>

          <p className="mt-3 max-w-3xl text-sm leading-6 text-white/80">
            {isFreePlan
              ? `Upgrade to Plus for up to ${PLUS_BILL_LIMIT} bills, protected safe-to-spend, spending reports, and more AI coaching.`
              : "Upgrade to Pro for unlimited bill tracking, higher AI coach usage, advanced reports, deeper insights, exports, and priority future features."}
          </p>

          <div className="mt-5 flex flex-wrap gap-3">
            <a
              href="/billing"
              className="rounded-full bg-white px-5 py-3 text-sm font-black text-[#061b3d]"
            >
              {isFreePlan ? "Upgrade to Plus" : "Upgrade to Pro"}
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
          onSubmit={handleAddBill}
          className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl"
        >
          <h3 className="mb-5 text-2xl font-black text-[#061b3d]">
            Add Bill
          </h3>

          {billLimit !== null && (
            <div
              className={`mb-5 rounded-3xl border p-4 ${
                billLimitReached
                  ? "border-red-100 bg-red-50 text-red-700"
                  : billsRemaining !== null && billsRemaining <= 5
                    ? "border-yellow-100 bg-yellow-50 text-yellow-700"
                    : "border-cyan-100 bg-cyan-50 text-cyan-700"
              }`}
            >
              <p className="text-sm font-black">
                {formatPlanLabel(effectivePlan)} usage: {bills.length}/
                {billLimit}
              </p>
              <p className="mt-1 text-sm leading-6">
                {billLimitReached
                  ? isFreePlan
                    ? "Upgrade to Plus to keep adding bills."
                    : "Upgrade to Pro to keep adding bills."
                  : `${billsRemaining} bill slots remaining.`}
              </p>
            </div>
          )}

          {isProPlan && (
            <div className="mb-5 rounded-3xl border border-blue-100 bg-blue-50 p-4 text-blue-700">
              <p className="text-sm font-black">Pro bill tracking active</p>
              <p className="mt-1 text-sm leading-6">
                You can track unlimited bills with your Pro plan.
              </p>
            </div>
          )}

          <label className="mb-2 block text-sm font-bold text-[#061b3d]">
            Bill Name
          </label>
          <input
            required
            value={billName}
            onChange={(event) => setBillName(event.target.value)}
            disabled={billLimitReached}
            className="mb-4 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:ring-4 focus:ring-cyan-100 disabled:cursor-not-allowed disabled:opacity-60"
            placeholder="Power bill, Rent, Phone, Netflix..."
          />

          <label className="mb-2 block text-sm font-bold text-[#061b3d]">
            Category
          </label>
          <select
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            disabled={billLimitReached}
            className="mb-4 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:ring-4 focus:ring-cyan-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {categories.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>

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
            disabled={billLimitReached}
            className="mb-4 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:ring-4 focus:ring-cyan-100 disabled:cursor-not-allowed disabled:opacity-60"
            placeholder="180.00"
          />

          <label className="mb-2 block text-sm font-bold text-[#061b3d]">
            Due Date
          </label>
          <input
            type="date"
            required
            value={dueDate}
            onChange={(event) => setDueDate(event.target.value)}
            disabled={billLimitReached}
            className="mb-4 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:ring-4 focus:ring-cyan-100 disabled:cursor-not-allowed disabled:opacity-60"
          />

          <label className="mb-2 block text-sm font-bold text-[#061b3d]">
            Frequency
          </label>
          <select
            value={frequency}
            onChange={(event) =>
              setFrequency(event.target.value as Bill["frequency"])
            }
            disabled={billLimitReached}
            className="mb-4 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:ring-4 focus:ring-cyan-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {frequencies.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>

          <div className="mb-4 grid gap-3 md:grid-cols-2">
            <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-[#061b3d]">
              <input
                type="checkbox"
                checked={isAutopay}
                onChange={(event) => setIsAutopay(event.target.checked)}
                disabled={billLimitReached}
                className="h-4 w-4 disabled:cursor-not-allowed"
              />
              Autopay
            </label>

            <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-[#061b3d]">
              <input
                type="checkbox"
                checked={isPaid}
                onChange={(event) => setIsPaid(event.target.checked)}
                disabled={billLimitReached}
                className="h-4 w-4 disabled:cursor-not-allowed"
              />
              Already Paid
            </label>
          </div>

          <label className="mb-2 block text-sm font-bold text-[#061b3d]">
            Notes
          </label>
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            disabled={billLimitReached}
            className="mb-5 min-h-28 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:ring-4 focus:ring-cyan-100 disabled:cursor-not-allowed disabled:opacity-60"
            placeholder="Optional notes about this bill..."
          />

          <button
            type="submit"
            disabled={saving || billLimitReached}
            className="w-full rounded-full bg-gradient-to-r from-[#0b4edb] via-[#00b7c7] to-[#5ce05c] px-6 py-3 font-black text-white shadow-lg disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving
              ? "Saving..."
              : billLimitReached
                ? "Upgrade to Add More"
                : "Add Bill"}
          </button>

          <div className="mt-5 rounded-3xl border border-slate-100 bg-slate-50 p-5">
            <p className="text-xs font-black uppercase tracking-widest text-slate-500">
              Tip
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Add rent, utilities, debt minimums, subscriptions, and autopay
              items. These help SafeSpend calculate protected safe-to-spend.
            </p>
          </div>
        </form>

        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl">
          <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="text-2xl font-black text-[#061b3d]">
                Upcoming Bills
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                Sorts unpaid bills first by due date.
              </p>
            </div>

            <a
              href="/billing"
              className="rounded-full border border-slate-200 bg-slate-50 px-5 py-3 text-sm font-black text-[#061b3d]"
            >
              View Plan
            </a>
          </div>

          {bills.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
              <h4 className="text-xl font-black text-[#061b3d]">
                No bills added yet
              </h4>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                Add your rent, utilities, subscriptions, debt payments, and
                other upcoming obligations so SafeSpend can protect that money
                before you spend it.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {bills.map((bill) => {
                const dueStatus = getDueStatus(bill);

                return (
                  <div
                    key={bill.id}
                    className="rounded-2xl border border-slate-100 bg-slate-50 p-4"
                  >
                    {editingId === bill.id ? (
                      <div className="space-y-3">
                        <input
                          value={editBillName}
                          onChange={(event) =>
                            setEditBillName(event.target.value)
                          }
                          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none focus:ring-4 focus:ring-cyan-100"
                          placeholder="Bill Name"
                        />

                        <div className="grid gap-3 md:grid-cols-2">
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

                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={editAmount}
                            onChange={(event) =>
                              setEditAmount(event.target.value)
                            }
                            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none focus:ring-4 focus:ring-cyan-100"
                            placeholder="Amount"
                          />
                        </div>

                        <div className="grid gap-3 md:grid-cols-2">
                          <input
                            type="date"
                            value={editDueDate}
                            onChange={(event) =>
                              setEditDueDate(event.target.value)
                            }
                            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none focus:ring-4 focus:ring-cyan-100"
                          />

                          <select
                            value={editFrequency}
                            onChange={(event) =>
                              setEditFrequency(
                                event.target.value as Bill["frequency"]
                              )
                            }
                            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none focus:ring-4 focus:ring-cyan-100"
                          >
                            {frequencies.map((item) => (
                              <option key={item.value} value={item.value}>
                                {item.label}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="grid gap-3 md:grid-cols-2">
                          <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-[#061b3d]">
                            <input
                              type="checkbox"
                              checked={editIsAutopay}
                              onChange={(event) =>
                                setEditIsAutopay(event.target.checked)
                              }
                              className="h-4 w-4"
                            />
                            Autopay
                          </label>

                          <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-[#061b3d]">
                            <input
                              type="checkbox"
                              checked={editIsPaid}
                              onChange={(event) =>
                                setEditIsPaid(event.target.checked)
                              }
                              className="h-4 w-4"
                            />
                            Paid
                          </label>
                        </div>

                        <textarea
                          value={editNotes}
                          onChange={(event) => setEditNotes(event.target.value)}
                          className="min-h-24 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none focus:ring-4 focus:ring-cyan-100"
                          placeholder="Notes"
                        />

                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => handleUpdateBill(bill.id)}
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
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-black text-[#061b3d]">
                                {bill.bill_name}
                              </p>

                              <span
                                className={`rounded-full px-3 py-1 text-xs font-black ${dueStatus.className}`}
                              >
                                {dueStatus.label}
                              </span>

                              {bill.is_autopay && (
                                <span className="rounded-full bg-cyan-50 px-3 py-1 text-xs font-black text-cyan-700">
                                  Autopay
                                </span>
                              )}
                            </div>

                            <p className="mt-1 text-sm text-slate-500">
                              {bill.category} · {formatDate(bill.due_date)} ·{" "}
                              {bill.frequency.replace("_", " ")}
                            </p>

                            {bill.notes && (
                              <p className="mt-2 text-xs leading-5 text-slate-400">
                                {bill.notes}
                              </p>
                            )}
                          </div>

                          <p className="text-right text-lg font-black text-[#061b3d]">
                            {money(Number(bill.amount))}
                          </p>
                        </div>

                        <div className="mt-4 flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => handleTogglePaid(bill)}
                            className={`rounded-full px-3 py-1 text-xs font-black ${
                              bill.is_paid
                                ? "bg-yellow-50 text-yellow-700"
                                : "bg-green-50 text-green-700"
                            }`}
                          >
                            {bill.is_paid ? "Mark Unpaid" : "Mark Paid"}
                          </button>

                          <button
                            type="button"
                            onClick={() => startEditing(bill)}
                            className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-black text-[#061b3d]"
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteBill(bill.id)}
                            className="rounded-full border border-red-100 bg-red-50 px-3 py-1 text-xs font-black text-red-600"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </section>
    </AppShell>
  );
}

function SummaryCard({
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