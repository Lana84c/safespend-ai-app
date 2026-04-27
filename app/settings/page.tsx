"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import AppShell from "@/components/AppShell";

type UserSettings = {
  id?: string;
  user_id: string;
  paycheck_frequency:
    | "weekly"
    | "biweekly"
    | "semimonthly"
    | "monthly"
    | "irregular";
  weekly_reset_day:
    | "sunday"
    | "monday"
    | "tuesday"
    | "wednesday"
    | "thursday"
    | "friday"
    | "saturday";
  monthly_income_target: number;
  emergency_buffer_goal: number;
  spending_style: "strict" | "balanced" | "flexible";
  top_priority:
    | "avoid_overspending"
    | "pay_down_debt"
    | "save_more"
    | "manage_bills"
    | "control_shopping"
    | "build_emergency_fund";
  notes: string | null;
};

const defaultSettings = {
  paycheck_frequency: "biweekly",
  weekly_reset_day: "sunday",
  monthly_income_target: 0,
  emergency_buffer_goal: 0,
  spending_style: "balanced",
  top_priority: "avoid_overspending",
  notes: "",
} as const;

function money(value: number) {
  return Number(value || 0).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });
}

function formatLabel(value: string) {
  return value
    .replaceAll("_", " ")
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export default function SettingsPage() {
  const router = useRouter();

  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState("");

  const [paycheckFrequency, setPaycheckFrequency] = useState<
    UserSettings["paycheck_frequency"]
  >(defaultSettings.paycheck_frequency);

  const [weeklyResetDay, setWeeklyResetDay] = useState<
    UserSettings["weekly_reset_day"]
  >(defaultSettings.weekly_reset_day);

  const [monthlyIncomeTarget, setMonthlyIncomeTarget] = useState("");
  const [emergencyBufferGoal, setEmergencyBufferGoal] = useState("");

  const [spendingStyle, setSpendingStyle] = useState<
    UserSettings["spending_style"]
  >(defaultSettings.spending_style);

  const [topPriority, setTopPriority] = useState<UserSettings["top_priority"]>(
    defaultSettings.top_priority
  );

  const [notes, setNotes] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    checkUserAndLoadSettings();
  }, []);

  async function checkUserAndLoadSettings() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/login");
      return;
    }

    setUserId(user.id);
    setEmail(user.email || "");

    const { data, error } = await supabase
      .from("user_settings")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    if (data) {
      setPaycheckFrequency(data.paycheck_frequency || "biweekly");
      setWeeklyResetDay(data.weekly_reset_day || "sunday");
      setMonthlyIncomeTarget(
        data.monthly_income_target ? String(data.monthly_income_target) : ""
      );
      setEmergencyBufferGoal(
        data.emergency_buffer_goal ? String(data.emergency_buffer_goal) : ""
      );
      setSpendingStyle(data.spending_style || "balanced");
      setTopPriority(data.top_priority || "avoid_overspending");
      setNotes(data.notes || "");
    }

    setLoading(false);
  }

  async function handleSaveSettings(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!userId) return;

    setSaving(true);
    setStatus("");
    setError("");

    const monthlyIncome = Number(monthlyIncomeTarget || 0);
    const emergencyGoal = Number(emergencyBufferGoal || 0);

    if (monthlyIncome < 0 || emergencyGoal < 0) {
      setError("Money targets cannot be negative.");
      setSaving(false);
      return;
    }

    const payload = {
      user_id: userId,
      paycheck_frequency: paycheckFrequency,
      weekly_reset_day: weeklyResetDay,
      monthly_income_target: monthlyIncome,
      emergency_buffer_goal: emergencyGoal,
      spending_style: spendingStyle,
      top_priority: topPriority,
      notes: notes.trim() || null,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from("user_settings")
      .upsert(payload, { onConflict: "user_id" });

    if (error) {
      setError(error.message);
      setSaving(false);
      return;
    }

    setStatus("Settings saved. SafeSpend AI can now use these preferences.");
    setSaving(false);
  }

  const monthlyIncomeNumber = Number(monthlyIncomeTarget || 0);
  const emergencyGoalNumber = Number(emergencyBufferGoal || 0);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f4f8fb]">
        <p className="text-lg font-bold text-[#061b3d]">
          Loading settings...
        </p>
      </main>
    );
  }

  return (
    <AppShell
      email={email}
      title="Personalize your spending coach."
      subtitle="Set your paycheck rhythm, weekly reset day, money goals, spending style, and top priority so SafeSpend AI can give more relevant guidance."
    >
      <section className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          label="Paycheck"
          value={formatLabel(paycheckFrequency)}
          helper="Income rhythm"
        />

        <SummaryCard
          label="Weekly Reset"
          value={formatLabel(weeklyResetDay)}
          helper="Budget reset day"
        />

        <SummaryCard
          label="Income Target"
          value={money(monthlyIncomeNumber)}
          helper="Monthly goal"
        />

        <SummaryCard
          label="Emergency Buffer"
          value={money(emergencyGoalNumber)}
          helper="Protected cushion"
          warning={emergencyGoalNumber > 0}
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

      <section className="grid gap-6 xl:grid-cols-[1fr_.85fr]">
        <form
          onSubmit={handleSaveSettings}
          className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl"
        >
          <div className="mb-6">
            <h3 className="text-2xl font-black text-[#061b3d]">
              Coaching Preferences
            </h3>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              SafeSpend uses these settings when giving purchase checks,
              overspending recovery plans, and bill-aware guidance.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-bold text-[#061b3d]">
                Paycheck Frequency
              </label>
              <select
                value={paycheckFrequency}
                onChange={(event) =>
                  setPaycheckFrequency(
                    event.target.value as UserSettings["paycheck_frequency"]
                  )
                }
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:ring-4 focus:ring-cyan-100"
              >
                <option value="weekly">Weekly</option>
                <option value="biweekly">Biweekly</option>
                <option value="semimonthly">Twice a month</option>
                <option value="monthly">Monthly</option>
                <option value="irregular">Irregular / varies</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-[#061b3d]">
                Weekly Reset Day
              </label>
              <select
                value={weeklyResetDay}
                onChange={(event) =>
                  setWeeklyResetDay(
                    event.target.value as UserSettings["weekly_reset_day"]
                  )
                }
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:ring-4 focus:ring-cyan-100"
              >
                <option value="sunday">Sunday</option>
                <option value="monday">Monday</option>
                <option value="tuesday">Tuesday</option>
                <option value="wednesday">Wednesday</option>
                <option value="thursday">Thursday</option>
                <option value="friday">Friday</option>
                <option value="saturday">Saturday</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-[#061b3d]">
                Monthly Income Target
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={monthlyIncomeTarget}
                onChange={(event) => setMonthlyIncomeTarget(event.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:ring-4 focus:ring-cyan-100"
                placeholder="Example: 3200"
              />
              <p className="mt-2 text-xs leading-5 text-slate-500">
                Used to help SafeSpend understand whether current income is on
                track.
              </p>
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-[#061b3d]">
                Emergency Buffer Goal
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={emergencyBufferGoal}
                onChange={(event) =>
                  setEmergencyBufferGoal(event.target.value)
                }
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:ring-4 focus:ring-cyan-100"
                placeholder="Example: 500"
              />
              <p className="mt-2 text-xs leading-5 text-slate-500">
                Helps SafeSpend avoid encouraging extra discretionary spending
                before your cushion is protected.
              </p>
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-[#061b3d]">
                Spending Style
              </label>
              <select
                value={spendingStyle}
                onChange={(event) =>
                  setSpendingStyle(
                    event.target.value as UserSettings["spending_style"]
                  )
                }
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:ring-4 focus:ring-cyan-100"
              >
                <option value="strict">Strict — warn me early</option>
                <option value="balanced">Balanced — practical guidance</option>
                <option value="flexible">Flexible — lighter coaching</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-[#061b3d]">
                Top Money Priority
              </label>
              <select
                value={topPriority}
                onChange={(event) =>
                  setTopPriority(
                    event.target.value as UserSettings["top_priority"]
                  )
                }
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:ring-4 focus:ring-cyan-100"
              >
                <option value="avoid_overspending">Avoid overspending</option>
                <option value="pay_down_debt">Pay down debt</option>
                <option value="save_more">Save more</option>
                <option value="manage_bills">Manage bills</option>
                <option value="control_shopping">Control shopping</option>
                <option value="build_emergency_fund">
                  Build emergency fund
                </option>
              </select>
            </div>
          </div>

          <div className="mt-5">
            <label className="mb-2 block text-sm font-bold text-[#061b3d]">
              Notes for SafeSpend AI
            </label>
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              className="min-h-32 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:ring-4 focus:ring-cyan-100"
              placeholder="Example: I want to avoid impulse shopping, keep grocery spending under control, and avoid using credit cards unless necessary."
            />
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={saving}
              className="rounded-full bg-gradient-to-r from-[#0b4edb] via-[#00b7c7] to-[#5ce05c] px-6 py-3 font-black text-white shadow-lg disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save Settings"}
            </button>

            <a
              href="/coach"
              className="rounded-full border border-slate-200 bg-white px-6 py-3 font-black text-[#061b3d]"
            >
              Test in Coach
            </a>
          </div>
        </form>

        <aside className="space-y-6">
          <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl">
            <h3 className="text-2xl font-black text-[#061b3d]">
              Current AI Profile
            </h3>

            <div className="mt-5 space-y-3">
              <ProfileRow
                label="Spending Style"
                value={formatLabel(spendingStyle)}
              />

              <ProfileRow
                label="Top Priority"
                value={formatLabel(topPriority)}
              />

              <ProfileRow
                label="Paycheck Frequency"
                value={formatLabel(paycheckFrequency)}
              />

              <ProfileRow
                label="Weekly Reset"
                value={formatLabel(weeklyResetDay)}
              />

              <ProfileRow
                label="Income Target"
                value={money(monthlyIncomeNumber)}
              />

              <ProfileRow
                label="Emergency Buffer"
                value={money(emergencyGoalNumber)}
              />
            </div>
          </section>

          <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl">
            <h3 className="text-2xl font-black text-[#061b3d]">
              How SafeSpend Uses This
            </h3>

            <div className="mt-5 space-y-3">
              <InfoCard
                title="Strict style"
                description="SafeSpend warns earlier and is firmer about discretionary spending."
              />

              <InfoCard
                title="Balanced style"
                description="SafeSpend gives practical guidance and clear tradeoffs."
              />

              <InfoCard
                title="Flexible style"
                description="SafeSpend keeps advice lighter while still flagging risky spending."
              />

              <InfoCard
                title="Top priority"
                description="SafeSpend uses your main priority to shape purchase checks and recovery plans."
              />
            </div>
          </section>

          <section className="rounded-[2rem] border border-yellow-100 bg-yellow-50 p-6 shadow-xl">
            <h3 className="text-xl font-black text-yellow-800">
              Best Practice
            </h3>

            <p className="mt-2 text-sm leading-6 text-yellow-700">
              Update these settings when your paycheck rhythm, money goals, or
              spending behavior changes. The more accurate your settings are,
              the better SafeSpend’s coaching becomes.
            </p>
          </section>
        </aside>
      </section>
    </AppShell>
  );
}

function SummaryCard({
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

function ProfileRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl bg-slate-50 p-4">
      <p className="text-sm font-bold text-slate-500">{label}</p>
      <p className="text-right text-sm font-black text-[#061b3d]">{value}</p>
    </div>
  );
}

function InfoCard({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-3xl border border-slate-100 bg-slate-50 p-4">
      <p className="font-black text-[#061b3d]">{title}</p>
      <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>
    </div>
  );
}