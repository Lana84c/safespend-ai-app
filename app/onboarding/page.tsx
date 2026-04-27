"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import AppShell from "@/components/AppShell";

type BudgetInput = {
  category: string;
  weekly_limit: string;
};

const defaultBudgets: BudgetInput[] = [
  { category: "Groceries", weekly_limit: "100" },
  { category: "Shopping", weekly_limit: "50" },
  { category: "Dining", weekly_limit: "40" },
  { category: "Transportation", weekly_limit: "60" },
  { category: "Subscriptions", weekly_limit: "25" },
];

const resetDays = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const spendingStyles = [
  { value: "strict", label: "Strict — keep me very cautious" },
  { value: "balanced", label: "Balanced — guide me without being too rigid" },
  { value: "flexible", label: "Flexible — give me room, but warn me early" },
];

const priorities = [
  "Stop overspending",
  "Pay down debt",
  "Protect bill money",
  "Build savings",
  "Control shopping",
  "Prepare for upcoming events",
];

export default function OnboardingPage() {
  const router = useRouter();

  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState("");

  const [step, setStep] = useState(1);
  const [paycheckFrequency, setPaycheckFrequency] = useState("biweekly");
  const [weeklyResetDay, setWeeklyResetDay] = useState("Sunday");
  const [monthlyIncomeTarget, setMonthlyIncomeTarget] = useState("");
  const [emergencyBufferGoal, setEmergencyBufferGoal] = useState("");
  const [spendingStyle, setSpendingStyle] = useState("balanced");
  const [topPriority, setTopPriority] = useState("Stop overspending");
  const [notes, setNotes] = useState("");
  const [budgets, setBudgets] = useState<BudgetInput[]>(defaultBudgets);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const totalWeeklyBudget = useMemo(() => {
    return budgets.reduce((sum, item) => {
      return sum + Number(item.weekly_limit || 0);
    }, 0);
  }, [budgets]);

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

    await loadExistingSettings(user.id);
    setLoading(false);
  }

  async function loadExistingSettings(currentUserId: string) {
    const { data: settings } = await supabase
      .from("user_settings")
      .select("*")
      .eq("user_id", currentUserId)
      .maybeSingle();

    if (settings) {
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
      setTopPriority(settings.top_priority || "Stop overspending");
      setNotes(settings.notes || "");
    }

    const { data: existingBudgets } = await supabase
      .from("budgets")
      .select("category, weekly_limit")
      .eq("user_id", currentUserId)
      .order("category", { ascending: true });

    if (existingBudgets && existingBudgets.length > 0) {
      setBudgets(
        existingBudgets.map((item) => ({
          category: item.category,
          weekly_limit: String(item.weekly_limit || ""),
        }))
      );
    }
  }

  function updateBudget(index: number, value: string) {
    setBudgets((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index ? { ...item, weekly_limit: value } : item
      )
    );
  }

  function updateBudgetCategory(index: number, value: string) {
    setBudgets((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index ? { ...item, category: value } : item
      )
    );
  }

  function addBudgetRow() {
    setBudgets((current) => [
      ...current,
      { category: "Other", weekly_limit: "" },
    ]);
  }

  function removeBudgetRow(index: number) {
    setBudgets((current) =>
      current.filter((_, itemIndex) => itemIndex !== index)
    );
  }

  function validateStep() {
    setError("");

    if (step === 1) {
      if (!paycheckFrequency || !weeklyResetDay) {
        setError("Please choose your paycheck frequency and weekly reset day.");
        return false;
      }
    }

    if (step === 2) {
      if (!topPriority || !spendingStyle) {
        setError("Please choose your spending style and main priority.");
        return false;
      }
    }

    if (step === 3) {
      const hasOneBudget = budgets.some(
        (item) => item.category && Number(item.weekly_limit) > 0
      );

      if (!hasOneBudget) {
        setError("Add at least one weekly budget limit.");
        return false;
      }
    }

    return true;
  }

  function nextStep() {
    if (!validateStep()) return;
    setStep((current) => Math.min(current + 1, 4));
  }

  function previousStep() {
    setError("");
    setStep((current) => Math.max(current - 1, 1));
  }

  async function finishOnboarding() {
    if (!userId) return;
    if (!validateStep()) return;

    setSaving(true);
    setError("");

    const now = new Date().toISOString();

    const { error: settingsError } = await supabase
      .from("user_settings")
      .upsert(
        {
          user_id: userId,
          paycheck_frequency: paycheckFrequency,
          weekly_reset_day: weeklyResetDay,
          monthly_income_target: Number(monthlyIncomeTarget || 0),
          emergency_buffer_goal: Number(emergencyBufferGoal || 0),
          spending_style: spendingStyle,
          top_priority: topPriority,
          notes: notes || null,
          onboarding_completed: true,
          onboarding_completed_at: now,
          updated_at: now,
        },
        { onConflict: "user_id" }
      );

    if (settingsError) {
      setError(settingsError.message);
      setSaving(false);
      return;
    }

    const cleanBudgets = budgets
      .filter((item) => item.category && Number(item.weekly_limit) > 0)
      .map((item) => ({
        user_id: userId,
        category: item.category,
        weekly_limit: Number(item.weekly_limit),
        monthly_limit: Number(item.weekly_limit) * 4,
      }));

    if (cleanBudgets.length > 0) {
      const { error: budgetError } = await supabase
        .from("budgets")
        .upsert(cleanBudgets, { onConflict: "user_id,category" });

      if (budgetError) {
        setError(budgetError.message);
        setSaving(false);
        return;
      }
    }

    router.push("/dashboard");
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f4f8fb] px-6">
        <p className="text-lg font-bold text-[#061b3d]">
          Loading SafeSpend setup...
        </p>
      </main>
    );
  }

  return (
    <AppShell
      email={email}
      title="Set your money guardrails."
      subtitle="Complete your SafeSpend setup so your dashboard, budgets, and AI coach can give better guidance."
    >
      <section className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="mb-2 inline-flex rounded-full bg-cyan-50 px-4 py-2 text-xs font-black uppercase tracking-widest text-cyan-700">
            Onboarding
          </p>

          <h2 className="text-3xl font-black tracking-[-0.04em] text-[#061b3d]">
            Let’s personalize SafeSpend.
          </h2>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            This setup only takes a few minutes and can be changed later from
            Settings and Budgets.
          </p>
        </div>

        <a
          href="/dashboard"
          className="rounded-full border border-slate-200 bg-white px-5 py-3 text-center text-sm font-black text-[#061b3d] shadow-sm"
        >
          Skip for now
        </a>
      </section>

      <section className="mb-6 rounded-[2rem] bg-gradient-to-br from-[#0637b8] via-[#0072b8] to-[#00a878] p-6 text-white shadow-2xl">
        <div className="grid gap-4 md:grid-cols-4">
          <StepPill number={1} label="Money rhythm" active={step === 1} done={step > 1} />
          <StepPill number={2} label="Priorities" active={step === 2} done={step > 2} />
          <StepPill number={3} label="Budgets" active={step === 3} done={step > 3} />
          <StepPill number={4} label="Review" active={step === 4} done={false} />
        </div>
      </section>

      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl">
        {step === 1 && (
          <div>
            <h3 className="text-2xl font-black text-[#061b3d]">
              How does your money usually arrive?
            </h3>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              This helps SafeSpend give better guidance around paychecks,
              weekly resets, and safe-to-spend timing.
            </p>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <Field label="Paycheck frequency">
                <select
                  value={paycheckFrequency}
                  onChange={(event) => setPaycheckFrequency(event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:ring-4 focus:ring-cyan-100"
                >
                  <option value="weekly">Weekly</option>
                  <option value="biweekly">Biweekly</option>
                  <option value="semimonthly">Twice a month</option>
                  <option value="monthly">Monthly</option>
                  <option value="irregular">Irregular / varies</option>
                </select>
              </Field>

              <Field label="Weekly reset day">
                <select
                  value={weeklyResetDay}
                  onChange={(event) => setWeeklyResetDay(event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:ring-4 focus:ring-cyan-100"
                >
                  {resetDays.map((day) => (
                    <option key={day} value={day}>
                      {day}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Monthly income target">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={monthlyIncomeTarget}
                  onChange={(event) => setMonthlyIncomeTarget(event.target.value)}
                  placeholder="Example: 3200"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:ring-4 focus:ring-cyan-100"
                />
              </Field>

              <Field label="Emergency buffer goal">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={emergencyBufferGoal}
                  onChange={(event) => setEmergencyBufferGoal(event.target.value)}
                  placeholder="Example: 500"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:ring-4 focus:ring-cyan-100"
                />
              </Field>
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <h3 className="text-2xl font-black text-[#061b3d]">
              What kind of guidance do you want?
            </h3>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              This helps SafeSpend coach without sounding generic.
            </p>

            <div className="mt-6 grid gap-4">
              <Field label="Spending style">
                <div className="grid gap-3">
                  {spendingStyles.map((style) => (
                    <button
                      key={style.value}
                      type="button"
                      onClick={() => setSpendingStyle(style.value)}
                      className={`rounded-3xl border p-4 text-left font-bold ${
                        spendingStyle === style.value
                          ? "border-cyan-300 bg-cyan-50 text-[#061b3d]"
                          : "border-slate-200 bg-slate-50 text-slate-600"
                      }`}
                    >
                      {style.label}
                    </button>
                  ))}
                </div>
              </Field>

              <Field label="Top priority">
                <select
                  value={topPriority}
                  onChange={(event) => setTopPriority(event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:ring-4 focus:ring-cyan-100"
                >
                  {priorities.map((priority) => (
                    <option key={priority} value={priority}>
                      {priority}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Optional notes">
                <textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="Example: I need help not spending bill money before payday."
                  className="min-h-28 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:ring-4 focus:ring-cyan-100"
                />
              </Field>
            </div>
          </div>
        )}

        {step === 3 && (
          <div>
            <h3 className="text-2xl font-black text-[#061b3d]">
              Set starter weekly budget limits.
            </h3>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              These are not permanent. You can adjust them anytime from the
              Budgets page.
            </p>

            <div className="mt-6 space-y-3">
              {budgets.map((item, index) => (
                <div
                  key={`${item.category}-${index}`}
                  className="grid gap-3 rounded-3xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-[1fr_160px_auto]"
                >
                  <input
                    value={item.category}
                    onChange={(event) =>
                      updateBudgetCategory(index, event.target.value)
                    }
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none focus:ring-4 focus:ring-cyan-100"
                  />

                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.weekly_limit}
                    onChange={(event) => updateBudget(index, event.target.value)}
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none focus:ring-4 focus:ring-cyan-100"
                    placeholder="Weekly"
                  />

                  <button
                    type="button"
                    onClick={() => removeBudgetRow(index)}
                    className="rounded-full border border-red-100 bg-red-50 px-4 py-3 text-sm font-black text-red-600"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={addBudgetRow}
                className="rounded-full border border-slate-200 bg-white px-5 py-3 font-black text-[#061b3d]"
              >
                Add Category
              </button>

              <p className="rounded-full bg-cyan-50 px-5 py-3 text-sm font-black text-cyan-700">
                Total weekly guardrails: {money(totalWeeklyBudget)}
              </p>
            </div>
          </div>
        )}

        {step === 4 && (
          <div>
            <h3 className="text-2xl font-black text-[#061b3d]">
              Review your SafeSpend setup.
            </h3>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              Once saved, SafeSpend will use this setup to personalize the
              dashboard, category pressure, and coaching.
            </p>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <ReviewCard label="Paycheck frequency" value={paycheckFrequency} />
              <ReviewCard label="Weekly reset day" value={weeklyResetDay} />
              <ReviewCard
                label="Monthly income target"
                value={money(Number(monthlyIncomeTarget || 0))}
              />
              <ReviewCard
                label="Emergency buffer goal"
                value={money(Number(emergencyBufferGoal || 0))}
              />
              <ReviewCard label="Spending style" value={spendingStyle} />
              <ReviewCard label="Top priority" value={topPriority} />
            </div>

            <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-5">
              <p className="text-xs font-black uppercase tracking-widest text-slate-500">
                Weekly budgets
              </p>

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {budgets
                  .filter((item) => Number(item.weekly_limit) > 0)
                  .map((item) => (
                    <div
                      key={item.category}
                      className="flex items-center justify-between rounded-2xl bg-white p-4"
                    >
                      <span className="font-black text-[#061b3d]">
                        {item.category}
                      </span>

                      <span className="font-black text-cyan-700">
                        {money(Number(item.weekly_limit))}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}

        {error && (
          <p className="mt-5 rounded-2xl bg-red-50 p-4 text-sm font-bold text-red-600">
            {error}
          </p>
        )}

        <div className="mt-8 flex flex-wrap justify-between gap-3">
          <button
            type="button"
            onClick={previousStep}
            disabled={step === 1 || saving}
            className="rounded-full border border-slate-200 bg-white px-6 py-3 font-black text-[#061b3d] disabled:opacity-40"
          >
            Back
          </button>

          {step < 4 ? (
            <button
              type="button"
              onClick={nextStep}
              className="rounded-full bg-gradient-to-r from-[#0b4edb] via-[#00b7c7] to-[#5ce05c] px-6 py-3 font-black text-white shadow-lg"
            >
              Continue
            </button>
          ) : (
            <button
              type="button"
              onClick={finishOnboarding}
              disabled={saving}
              className="rounded-full bg-gradient-to-r from-[#0b4edb] via-[#00b7c7] to-[#5ce05c] px-6 py-3 font-black text-white shadow-lg disabled:opacity-60"
            >
              {saving ? "Saving setup..." : "Finish Setup"}
            </button>
          )}
        </div>
      </section>
    </AppShell>
  );
}

function StepPill({
  number,
  label,
  active,
  done,
}: {
  number: number;
  label: string;
  active: boolean;
  done: boolean;
}) {
  return (
    <div
      className={`rounded-3xl border p-4 ${
        active
          ? "border-white/40 bg-white/20"
          : done
            ? "border-white/20 bg-white/15"
            : "border-white/10 bg-white/5"
      }`}
    >
      <p className="text-xs font-black uppercase tracking-widest text-white/70">
        Step {number}
      </p>

      <p className="mt-1 font-black text-white">
        {done ? "✓ " : ""}
        {label}
      </p>
    </div>
  );
}

function Field({
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

function ReviewCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
      <p className="text-xs font-black uppercase tracking-widest text-slate-500">
        {label}
      </p>

      <p className="mt-2 text-xl font-black text-[#061b3d]">{value}</p>
    </div>
  );
}

function money(value: number) {
  return Number(value || 0).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });
}