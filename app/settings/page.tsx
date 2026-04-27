"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

type UserSettings = {
  id?: string;
  user_id: string;
  paycheck_frequency: "weekly" | "biweekly" | "semimonthly" | "monthly" | "irregular";
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

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

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
    <main className="min-h-screen bg-gradient-to-br from-[#eefbff] via-white to-[#f7fbfd] px-6 py-8 text-[#102033]">
      <section className="mx-auto max-w-5xl">
        <header className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <img
              src="/safespend-logo.png"
              alt="SafeSpend AI logo"
              className="h-14 w-14 rounded-2xl shadow-lg"
            />

            <div>
              <h1 className="text-2xl font-black text-[#061b3d]">
                SafeSpend Settings
              </h1>
              <p className="text-sm text-slate-500">{email}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <a
              href="/dashboard"
              className="rounded-full border border-slate-200 bg-white px-5 py-3 font-black text-[#061b3d] shadow-sm"
            >
              Dashboard
            </a>

            <a
              href="/budgets"
              className="rounded-full border border-slate-200 bg-white px-5 py-3 font-black text-[#061b3d] shadow-sm"
            >
              Budgets
            </a>

            <button
              type="button"
              onClick={handleLogout}
              className="rounded-full border border-slate-200 bg-white px-5 py-3 font-black text-[#061b3d] shadow-sm"
            >
              Log Out
            </button>
          </div>
        </header>

        <section className="mb-6 rounded-[2rem] bg-gradient-to-br from-[#0637b8] via-[#0072b8] to-[#00a878] p-8 text-white shadow-2xl">
          <p className="mb-3 inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-bold">
            Personalize SafeSpend AI
          </p>

          <h2 className="max-w-3xl text-5xl font-black leading-[0.95] tracking-[-0.05em] md:text-6xl">
            Make your spending coach fit your real life.
          </h2>

          <p className="mt-5 max-w-2xl text-white/80">
            These settings help SafeSpend understand your paycheck rhythm,
            spending style, reset day, and top money priority.
          </p>
        </section>

        <form
          onSubmit={handleSaveSettings}
          className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl"
        >
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
              <p className="mt-2 text-xs text-slate-500">
                Used to help SafeSpend understand whether your current income is
                on track.
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
              <p className="mt-2 text-xs text-slate-500">
                This gives SafeSpend a buffer target before encouraging extra
                discretionary spending.
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
              placeholder="Example: I want to stop impulse shopping, keep grocery spending under control, and avoid using credit cards unless necessary."
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
              href="/dashboard"
              className="rounded-full border border-slate-200 bg-white px-6 py-3 font-black text-[#061b3d]"
            >
              Back to Dashboard
            </a>
          </div>

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
      </section>
    </main>
  );
}