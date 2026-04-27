"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";
import { supabase } from "@/lib/supabase/client";

type UserSettings = {
  user_id: string;
  paycheck_frequency: string;
  weekly_reset_day: string;
  monthly_income_target: number;
  emergency_buffer_goal: number;
  spending_style: string;
  top_priority: string;
  notes: string | null;
};

const defaultSettings = {
  paycheck_frequency: "biweekly",
  weekly_reset_day: "Sunday",
  monthly_income_target: 0,
  emergency_buffer_goal: 0,
  spending_style: "balanced",
  top_priority: "avoid_overspending",
  notes: "",
};

const paycheckFrequencyOptions = [
  { label: "Weekly", value: "weekly" },
  { label: "Biweekly", value: "biweekly" },
  { label: "Twice Monthly", value: "twice_monthly" },
  { label: "Monthly", value: "monthly" },
  { label: "Irregular", value: "irregular" },
];

const weeklyResetOptions = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const spendingStyleOptions = [
  { label: "Careful", value: "careful" },
  { label: "Balanced", value: "balanced" },
  { label: "Flexible", value: "flexible" },
  { label: "Needs Guardrails", value: "needs_guardrails" },
];

const priorityOptions = [
  { label: "Avoid Overspending", value: "avoid_overspending" },
  { label: "Pay Down Debt", value: "pay_down_debt" },
  { label: "Build Savings", value: "build_savings" },
  { label: "Stay Current on Bills", value: "stay_current_on_bills" },
  { label: "Prepare for Emergencies", value: "prepare_for_emergencies" },
];

export default function SettingsPage() {
  const router = useRouter();

  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState("");

  const [paycheckFrequency, setPaycheckFrequency] = useState(
    defaultSettings.paycheck_frequency
  );
  const [weeklyResetDay, setWeeklyResetDay] = useState(
    defaultSettings.weekly_reset_day
  );
  const [monthlyIncomeTarget, setMonthlyIncomeTarget] = useState("");
  const [emergencyBufferGoal, setEmergencyBufferGoal] = useState("");
  const [spendingStyle, setSpendingStyle] = useState(
    defaultSettings.spending_style
  );
  const [topPriority, setTopPriority] = useState(defaultSettings.top_priority);
  const [notes, setNotes] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    checkUser();
  }, []);

  async function checkUser() {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error) {
      console.error("Auth session error:", error.message);
    }

    if (!session?.user) {
      router.push("/login");
      return;
    }

    setUserId(session.user.id);
    setEmail(session.user.email || "");

    await loadSettings(session.user.id);

    setLoading(false);
  }

  async function loadSettings(currentUserId: string) {
    const { data, error } = await supabase
      .from("user_settings")
      .select("*")
      .eq("user_id", currentUserId)
      .maybeSingle();

    if (error) {
      setError(error.message);
      return;
    }

    if (!data) {
      setPaycheckFrequency(defaultSettings.paycheck_frequency);
      setWeeklyResetDay(defaultSettings.weekly_reset_day);
      setMonthlyIncomeTarget("");
      setEmergencyBufferGoal("");
      setSpendingStyle(defaultSettings.spending_style);
      setTopPriority(defaultSettings.top_priority);
      setNotes("");
      return;
    }

    const settings = data as UserSettings;

    setPaycheckFrequency(settings.paycheck_frequency || "biweekly");
    setWeeklyResetDay(settings.weekly_reset_day || "Sunday");
    setMonthlyIncomeTarget(
      settings.monthly_income_target
        ? String(settings.monthly_income_target)
        : ""
    );
    setEmergencyBufferGoal(
      settings.emergency_buffer_goal
        ? String(settings.emergency_buffer_goal)
        : ""
    );
    setSpendingStyle(settings.spending_style || "balanced");
    setTopPriority(settings.top_priority || "avoid_overspending");
    setNotes(settings.notes || "");
  }

  async function handleSaveSettings(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!userId) return;

    setSaving(true);
    setError("");
    setMessage("");

    const monthlyTarget = Number(monthlyIncomeTarget || 0);
    const bufferGoal = Number(emergencyBufferGoal || 0);

    if (monthlyTarget < 0 || bufferGoal < 0) {
      setError("Money goals cannot be negative.");
      setSaving(false);
      return;
    }

    const { error } = await supabase.from("user_settings").upsert(
      {
        user_id: userId,
        paycheck_frequency: paycheckFrequency,
        weekly_reset_day: weeklyResetDay,
        monthly_income_target: monthlyTarget,
        emergency_buffer_goal: bufferGoal,
        spending_style: spendingStyle,
        top_priority: topPriority,
        notes: notes || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );

    if (error) {
      setError(error.message);
      setSaving(false);
      return;
    }

    setMessage("Settings saved successfully.");
    setSaving(false);
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f4f8fb] px-6">
        <p className="text-lg font-bold text-[#061b3d]">
          Loading settings...
        </p>
      </main>
    );
  }

  return (
    <AppShell
      email={email}
      title="Settings"
      subtitle="Manage your SafeSpend profile, spending preferences, notifications, and account details."
    >
      <section className="mb-6 rounded-[2rem] bg-gradient-to-br from-[#0637b8] via-[#0072b8] to-[#00a878] p-8 text-white shadow-2xl">
        <div className="grid gap-6 md:grid-cols-[1.2fr_.8fr] md:items-center">
          <div>
            <p className="mb-3 inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-bold">
              Personalization
            </p>

            <h2 className="text-5xl font-black leading-[0.95] tracking-[-0.05em] md:text-6xl">
              Make SafeSpend fit your money life.
            </h2>

            <p className="mt-5 max-w-2xl text-white/80">
              Your settings help SafeSpend understand your paycheck timing,
              weekly reset rhythm, spending style, and financial priorities.
            </p>
          </div>

          <div className="rounded-3xl border border-white/20 bg-white/15 p-6 backdrop-blur">
            <p className="text-sm font-black uppercase tracking-widest text-white/70">
              Active Account
            </p>

            <p className="mt-3 break-words text-2xl font-black">{email}</p>

            <p className="mt-4 inline-flex rounded-full bg-white/15 px-4 py-2 text-sm font-bold">
              Settings sync with your SafeSpend coach
            </p>
          </div>
        </div>
      </section>

      <section className="mb-6 grid gap-4 md:grid-cols-3">
        <QuickLinkCard
          title="Notification Settings"
          description="Choose which alerts and reminders SafeSpend should use."
          href="/settings/notifications"
          action="Manage Notifications"
        />

        <QuickLinkCard
          title="Billing"
          description="View your plan, upgrade, or manage your subscription."
          href="/billing"
          action="Open Billing"
        />

        <QuickLinkCard
          title="Account"
          description="Review account information and profile details."
          href="/account"
          action="Open Account"
        />
      </section>

      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl">
        <div className="mb-6">
          <h3 className="text-2xl font-black text-[#061b3d]">
            Spending Preferences
          </h3>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
            These preferences improve how SafeSpend calculates guidance,
            explains risk, and frames recommendations.
          </p>
        </div>

        <form onSubmit={handleSaveSettings} className="space-y-5">
          <div className="grid gap-5 md:grid-cols-2">
            <FieldGroup label="Paycheck Frequency">
              <select
                value={paycheckFrequency}
                onChange={(event) => {
                  setPaycheckFrequency(event.target.value);
                  setMessage("");
                  setError("");
                }}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:ring-4 focus:ring-cyan-100"
              >
                {paycheckFrequencyOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </FieldGroup>

            <FieldGroup label="Weekly Reset Day">
              <select
                value={weeklyResetDay}
                onChange={(event) => {
                  setWeeklyResetDay(event.target.value);
                  setMessage("");
                  setError("");
                }}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:ring-4 focus:ring-cyan-100"
              >
                {weeklyResetOptions.map((day) => (
                  <option key={day} value={day}>
                    {day}
                  </option>
                ))}
              </select>
            </FieldGroup>

            <FieldGroup label="Monthly Income Target">
              <input
                type="number"
                min="0"
                step="0.01"
                value={monthlyIncomeTarget}
                onChange={(event) => {
                  setMonthlyIncomeTarget(event.target.value);
                  setMessage("");
                  setError("");
                }}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:ring-4 focus:ring-cyan-100"
                placeholder="Example: 3500"
              />
            </FieldGroup>

            <FieldGroup label="Emergency Buffer Goal">
              <input
                type="number"
                min="0"
                step="0.01"
                value={emergencyBufferGoal}
                onChange={(event) => {
                  setEmergencyBufferGoal(event.target.value);
                  setMessage("");
                  setError("");
                }}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:ring-4 focus:ring-cyan-100"
                placeholder="Example: 500"
              />
            </FieldGroup>

            <FieldGroup label="Spending Style">
              <select
                value={spendingStyle}
                onChange={(event) => {
                  setSpendingStyle(event.target.value);
                  setMessage("");
                  setError("");
                }}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:ring-4 focus:ring-cyan-100"
              >
                {spendingStyleOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </FieldGroup>

            <FieldGroup label="Top Priority">
              <select
                value={topPriority}
                onChange={(event) => {
                  setTopPriority(event.target.value);
                  setMessage("");
                  setError("");
                }}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:ring-4 focus:ring-cyan-100"
              >
                {priorityOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </FieldGroup>
          </div>

          <FieldGroup label="Notes for SafeSpend">
            <textarea
              value={notes}
              onChange={(event) => {
                setNotes(event.target.value);
                setMessage("");
                setError("");
              }}
              rows={5}
              className="w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:ring-4 focus:ring-cyan-100"
              placeholder="Example: I am trying to reduce food delivery, avoid impulse shopping, and keep $200 available before payday."
            />
          </FieldGroup>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={saving}
              className="rounded-full bg-gradient-to-r from-[#0b4edb] via-[#00b7c7] to-[#5ce05c] px-6 py-3 font-black text-white shadow-lg disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save Settings"}
            </button>

            <a
              href="/dashboard"
              className="rounded-full border border-slate-200 bg-white px-6 py-3 font-black text-[#061b3d] shadow-sm"
            >
              Back to Dashboard
            </a>

            {message && (
              <p className="rounded-2xl bg-green-50 px-4 py-3 text-sm font-bold text-green-700">
                {message}
              </p>
            )}

            {error && (
              <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-600">
                {error}
              </p>
            )}
          </div>
        </form>
      </section>
    </AppShell>
  );
}

function FieldGroup({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-black text-[#061b3d]">
        {label}
      </span>

      {children}
    </label>
  );
}

function QuickLinkCard({
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
    <a
      href={href}
      className="rounded-3xl border border-slate-200 bg-white p-5 shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl"
    >
      <h3 className="text-xl font-black text-[#061b3d]">{title}</h3>

      <p className="mt-2 min-h-[48px] text-sm leading-6 text-slate-500">
        {description}
      </p>

      <p className="mt-4 inline-flex rounded-full bg-gradient-to-r from-[#0b4edb] via-[#00b7c7] to-[#5ce05c] px-4 py-2 text-sm font-black text-white">
        {action}
      </p>
    </a>
  );
}