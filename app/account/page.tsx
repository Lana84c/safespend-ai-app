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

function money(value: number) {
  return Number(value || 0).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });
}

function formatDateTime(value?: string | null) {
  if (!value) return "Not available";

  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function AccountPage() {
  const router = useRouter();

  const [userId, setUserId] = useState("");
  const [email, setEmail] = useState("");
  const [createdAt, setCreatedAt] = useState<string | null>(null);
  const [lastSignInAt, setLastSignInAt] = useState<string | null>(null);

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [userSettings, setUserSettings] = useState<UserSettings | null>(null);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(true);
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordStatus, setPasswordStatus] = useState("");
  const [error, setError] = useState("");

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
    setCreatedAt(user.created_at || null);
    setLastSignInAt(user.last_sign_in_at || null);

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
      .order("date", { ascending: false });

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

  const accountStats = useMemo(() => {
    const income = transactions
      .filter((tx) => Number(tx.amount) > 0)
      .reduce((sum, tx) => sum + Number(tx.amount), 0);

    const spent = transactions
      .filter((tx) => Number(tx.amount) < 0)
      .reduce((sum, tx) => sum + Math.abs(Number(tx.amount)), 0);

    const unpaidBills = bills.filter((bill) => !bill.is_paid);

    const unpaidBillsTotal = unpaidBills.reduce(
      (sum, bill) => sum + Number(bill.amount || 0),
      0
    );

    const weeklyBudgetTotal = budgets.reduce(
      (sum, budget) => sum + Number(budget.weekly_limit || 0),
      0
    );

    return {
      transactionCount: transactions.length,
      budgetCount: budgets.length,
      billsCount: bills.length,
      unpaidBillsCount: unpaidBills.length,
      income,
      spent,
      net: income - spent,
      unpaidBillsTotal,
      weeklyBudgetTotal,
      settingsComplete: Boolean(userSettings),
    };
  }, [transactions, budgets, bills, userSettings]);

  async function handlePasswordUpdate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setSavingPassword(true);
    setPasswordStatus("");
    setError("");

    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters.");
      setSavingPassword(false);
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      setSavingPassword(false);
      return;
    }

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      setError(error.message);
      setSavingPassword(false);
      return;
    }

    setNewPassword("");
    setConfirmPassword("");
    setPasswordStatus("Password updated successfully.");
    setSavingPassword(false);
  }

  async function handleSendPasswordReset() {
    setError("");
    setPasswordStatus("");

    if (!email) {
      setError("No email address found for this account.");
      return;
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo:
        typeof window !== "undefined"
          ? `${window.location.origin}/account`
          : undefined,
    });

    if (error) {
      setError(error.message);
      return;
    }

    setPasswordStatus("Password reset email sent.");
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f4f8fb]">
        <p className="text-lg font-bold text-[#061b3d]">Loading account...</p>
      </main>
    );
  }

  return (
    <AppShell
      email={email}
      title="Manage your SafeSpend account."
      subtitle="Review account details, data status, saved preferences, and basic security options."
    >
      <section className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Transactions"
          value={String(accountStats.transactionCount)}
          helper="Total entries saved"
        />

        <MetricCard
          label="Budgets"
          value={String(accountStats.budgetCount)}
          helper={money(accountStats.weeklyBudgetTotal) + " weekly limits"}
        />

        <MetricCard
          label="Bills"
          value={String(accountStats.billsCount)}
          helper={`${accountStats.unpaidBillsCount} unpaid`}
        />

        <MetricCard
          label="Settings"
          value={accountStats.settingsComplete ? "Active" : "Incomplete"}
          helper={
            accountStats.settingsComplete
              ? "Personal coaching enabled"
              : "Add settings for better AI guidance"
          }
          warning={!accountStats.settingsComplete}
        />
      </section>

      {error && (
        <section className="mb-6 rounded-2xl bg-red-50 p-4 text-sm font-bold text-red-600">
          {error}
        </section>
      )}

      {passwordStatus && (
        <section className="mb-6 rounded-2xl bg-green-50 p-4 text-sm font-bold text-green-700">
          {passwordStatus}
        </section>
      )}

      <section className="mb-6 grid gap-6 xl:grid-cols-[.9fr_1.1fr]">
        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl">
          <h3 className="text-2xl font-black text-[#061b3d]">
            Account Details
          </h3>

          <div className="mt-5 space-y-3">
            <InfoRow label="Email" value={email || "Not available"} />
            <InfoRow label="User ID" value={userId || "Not available"} />
            <InfoRow label="Created" value={formatDateTime(createdAt)} />
            <InfoRow
              label="Last Sign In"
              value={formatDateTime(lastSignInAt)}
            />
          </div>

          <div className="mt-6 rounded-3xl border border-slate-100 bg-slate-50 p-5">
            <p className="text-xs font-black uppercase tracking-widest text-slate-500">
              Data Privacy
            </p>

            <p className="mt-2 text-sm leading-6 text-slate-600">
              Your transactions, budgets, bills, and settings are tied to your
              logged-in account. SafeSpend uses row-level security so users only
              access their own records.
            </p>
          </div>
        </section>

        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl">
          <h3 className="text-2xl font-black text-[#061b3d]">
            Account Summary
          </h3>

          <div className="mt-5 grid gap-3 md:grid-cols-2">
            <MiniStat label="Total Income" value={money(accountStats.income)} />
            <MiniStat label="Total Spent" value={money(accountStats.spent)} />
            <MiniStat label="Net Tracked" value={money(accountStats.net)} />
            <MiniStat
              label="Unpaid Bills"
              value={money(accountStats.unpaidBillsTotal)}
              danger={accountStats.unpaidBillsTotal > 0}
            />
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-2">
            <QuickLink
              href="/transactions"
              title="Manage Transactions"
              description="Add, edit, search, or delete money activity."
            />

            <QuickLink
              href="/settings"
              title="Update Settings"
              description="Adjust paycheck rhythm, priorities, and AI style."
            />

            <QuickLink
              href="/bills"
              title="Review Bills"
              description="Track upcoming obligations and autopay."
            />

            <QuickLink
              href="/reports"
              title="View Reports"
              description="Analyze spending and budget pressure."
            />
          </div>
        </section>
      </section>

      <section className="mb-6 grid gap-6 xl:grid-cols-2">
        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl">
          <h3 className="text-2xl font-black text-[#061b3d]">
            Security
          </h3>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            Update your password or send yourself a password reset email.
          </p>

          <form onSubmit={handlePasswordUpdate} className="mt-5">
            <label className="mb-2 block text-sm font-bold text-[#061b3d]">
              New Password
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              className="mb-4 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:ring-4 focus:ring-cyan-100"
              placeholder="At least 8 characters"
            />

            <label className="mb-2 block text-sm font-bold text-[#061b3d]">
              Confirm New Password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              className="mb-5 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:ring-4 focus:ring-cyan-100"
              placeholder="Re-enter new password"
            />

            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={savingPassword}
                className="rounded-full bg-gradient-to-r from-[#0b4edb] via-[#00b7c7] to-[#5ce05c] px-5 py-3 text-sm font-black text-white shadow-lg disabled:opacity-60"
              >
                {savingPassword ? "Updating..." : "Update Password"}
              </button>

              <button
                type="button"
                onClick={handleSendPasswordReset}
                className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-black text-[#061b3d]"
              >
                Send Reset Email
              </button>
            </div>
          </form>
        </section>

        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl">
          <h3 className="text-2xl font-black text-[#061b3d]">
            Account Actions
          </h3>

          <div className="mt-5 space-y-3">
            <ActionRow
              title="Log out of SafeSpend"
              description="End your current session on this device."
              action="Log Out"
              onClick={handleLogout}
            />

            <div className="rounded-3xl border border-yellow-100 bg-yellow-50 p-5">
              <p className="font-black text-yellow-800">
                Data deletion requests
              </p>
              <p className="mt-1 text-sm leading-6 text-yellow-700">
                For now, account and data deletion can be handled manually by the
                SafeSpend owner/admin. A self-service deletion flow can be added
                later.
              </p>
            </div>

            <div className="rounded-3xl border border-slate-100 bg-slate-50 p-5">
              <p className="font-black text-[#061b3d]">
                SafeSpend disclaimer
              </p>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                SafeSpend AI is a spending-awareness and budgeting support tool.
                It is not financial, legal, tax, investment, credit repair, or
                debt settlement advice.
              </p>
            </div>
          </div>
        </section>
      </section>
    </AppShell>
  );
}

function MetricCard({
  label,
  value,
  helper,
  warning = false,
}: {
  label: string;
  value: string;
  helper: string;
  warning?: boolean;
}) {
  return (
    <div
      className={`rounded-3xl border p-5 shadow-lg ${
        warning ? "border-yellow-100 bg-yellow-50" : "border-slate-200 bg-white"
      }`}
    >
      <p
        className={`text-xs font-black uppercase tracking-widest ${
          warning ? "text-yellow-600" : "text-slate-500"
        }`}
      >
        {label}
      </p>

      <p
        className={`mt-2 text-2xl font-black ${
          warning ? "text-yellow-800" : "text-[#061b3d]"
        }`}
      >
        {value}
      </p>

      <p
        className={`mt-1 text-xs ${
          warning ? "text-yellow-700" : "text-slate-500"
        }`}
      >
        {helper}
      </p>
    </div>
  );
}

function MiniStat({
  label,
  value,
  danger = false,
}: {
  label: string;
  value: string;
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
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
      <p className="text-xs font-black uppercase tracking-widest text-slate-500">
        {label}
      </p>
      <p className="mt-1 break-all text-sm font-bold text-[#061b3d]">
        {value}
      </p>
    </div>
  );
}

function QuickLink({
  href,
  title,
  description,
}: {
  href: string;
  title: string;
  description: string;
}) {
  return (
    <a
      href={href}
      className="rounded-3xl border border-slate-200 bg-slate-50 p-4 transition hover:-translate-y-0.5 hover:shadow-lg"
    >
      <p className="font-black text-[#061b3d]">{title}</p>
      <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>
    </a>
  );
}

function ActionRow({
  title,
  description,
  action,
  onClick,
}: {
  title: string;
  description: string;
  action: string;
  onClick: () => void;
}) {
  return (
    <div className="flex flex-col gap-4 rounded-3xl border border-slate-100 bg-slate-50 p-5 md:flex-row md:items-center md:justify-between">
      <div>
        <p className="font-black text-[#061b3d]">{title}</p>
        <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>
      </div>

      <button
        type="button"
        onClick={onClick}
        className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-black text-[#061b3d]"
      >
        {action}
      </button>
    </div>
  );
}