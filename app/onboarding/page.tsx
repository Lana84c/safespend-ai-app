"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

type Budget = {
  id: string;
  user_id: string;
  category: string;
  weekly_limit: number;
  monthly_limit: number;
  created_at: string;
};

const defaultCategories = [
  {
    name: "Groceries",
    description: "Food, household basics, grocery stores",
    suggested: 150,
  },
  {
    name: "Shopping",
    description: "Clothes, beauty, home goods, extras",
    suggested: 75,
  },
  {
    name: "Dining",
    description: "Restaurants, coffee, fast food, takeout",
    suggested: 60,
  },
  {
    name: "Transportation",
    description: "Gas, rideshare, parking, transit",
    suggested: 80,
  },
  {
    name: "Subscriptions",
    description: "Streaming, apps, memberships",
    suggested: 40,
  },
  {
    name: "Personal",
    description: "Self-care, gifts, small personal spending",
    suggested: 50,
  },
  {
    name: "Bills",
    description: "Recurring essentials and fixed obligations",
    suggested: 0,
  },
  {
    name: "Other",
    description: "Anything that does not fit elsewhere",
    suggested: 25,
  },
];

export default function OnboardingPage() {
  const router = useRouter();

  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [budgets, setBudgets] = useState<Record<string, string>>({});

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [message, setMessage] = useState("");
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

    const initialBudgets: Record<string, string> = {};

    defaultCategories.forEach((category) => {
      initialBudgets[category.name] = String(category.suggested);
    });

    setBudgets(initialBudgets);

    await loadExistingBudgets(user.id);

    setLoading(false);
  }

  async function loadExistingBudgets(currentUserId: string) {
    const { data, error } = await supabase
      .from("budgets")
      .select("*")
      .eq("user_id", currentUserId);

    if (error) {
      setError(error.message);
      return;
    }

    const rows = (data || []) as Budget[];

    if (rows.length === 0) {
      return;
    }

    const existingMap: Record<string, string> = {};

    defaultCategories.forEach((category) => {
      const match = rows.find((budget) => budget.category === category.name);
      existingMap[category.name] = match
        ? String(match.weekly_limit || "")
        : String(category.suggested);
    });

    setBudgets(existingMap);
  }

  function updateBudget(category: string, value: string) {
    setBudgets((current) => ({
      ...current,
      [category]: value,
    }));
  }

  async function saveBudgets(event?: React.FormEvent<HTMLFormElement>) {
    event?.preventDefault();

    if (!userId) return;

    setSaving(true);
    setError("");
    setMessage("");

    const rows = defaultCategories.map((category) => {
      const weeklyLimit = Number(budgets[category.name] || 0);

      return {
        user_id: userId,
        category: category.name,
        weekly_limit: weeklyLimit,
        monthly_limit: weeklyLimit * 4,
      };
    });

    const invalidBudget = rows.find((row) => row.weekly_limit < 0);

    if (invalidBudget) {
      setError("Budget limits cannot be negative.");
      setSaving(false);
      return;
    }

    for (const row of rows) {
      const { data: existing, error: lookupError } = await supabase
        .from("budgets")
        .select("id")
        .eq("user_id", userId)
        .eq("category", row.category)
        .maybeSingle();

      if (lookupError) {
        setError(lookupError.message);
        setSaving(false);
        return;
      }

      if (existing) {
        const { error: updateError } = await supabase
          .from("budgets")
          .update({
            weekly_limit: row.weekly_limit,
            monthly_limit: row.monthly_limit,
          })
          .eq("id", existing.id)
          .eq("user_id", userId);

        if (updateError) {
          setError(updateError.message);
          setSaving(false);
          return;
        }
      } else {
        const { error: insertError } = await supabase
          .from("budgets")
          .insert(row);

        if (insertError) {
          setError(insertError.message);
          setSaving(false);
          return;
        }
      }
    }

    setMessage("Your starter budgets are saved.");

    setTimeout(() => {
      router.push("/dashboard");
    }, 700);
  }

  function useSuggestedBudgets() {
    const suggested: Record<string, string> = {};

    defaultCategories.forEach((category) => {
      suggested[category.name] = String(category.suggested);
    });

    setBudgets(suggested);
  }

  function clearBudgets() {
    const empty: Record<string, string> = {};

    defaultCategories.forEach((category) => {
      empty[category.name] = "0";
    });

    setBudgets(empty);
  }

  function skipForNow() {
    router.push("/dashboard");
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f4f8fb]">
        <p className="text-lg font-bold text-[#061b3d]">
          Loading onboarding...
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
                Set up SafeSpend
              </h1>
              <p className="text-sm text-slate-500">{email}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={skipForNow}
              className="rounded-full border border-slate-200 bg-white px-5 py-3 font-black text-[#061b3d] shadow-sm"
            >
              Skip for Now
            </button>

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
            Starter setup
          </p>

          <h2 className="max-w-3xl text-5xl font-black leading-[0.95] tracking-[-0.05em] md:text-6xl">
            Give your money a spending plan.
          </h2>

          <p className="mt-5 max-w-2xl text-white/80">
            Set simple weekly category limits so SafeSpend can show when you are
            on track, getting close, or already over budget.
          </p>
        </section>

        <form
          onSubmit={saveBudgets}
          className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl"
        >
          <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <h3 className="text-2xl font-black text-[#061b3d]">
                Weekly Spending Limits
              </h3>
              <p className="mt-2 max-w-2xl text-sm text-slate-500">
                These can be changed anytime from the Budgets page. Use the
                suggested starter amounts or adjust them based on your real
                paycheck and spending habits.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={useSuggestedBudgets}
                className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-black text-[#061b3d]"
              >
                Use Suggested
              </button>

              <button
                type="button"
                onClick={clearBudgets}
                className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-black text-[#061b3d]"
              >
                Clear
              </button>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {defaultCategories.map((category) => (
              <div
                key={category.name}
                className="rounded-3xl border border-slate-200 bg-slate-50 p-4"
              >
                <div className="mb-3">
                  <label className="block text-sm font-black text-[#061b3d]">
                    {category.name}
                  </label>
                  <p className="mt-1 text-xs text-slate-500">
                    {category.description}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="font-black text-slate-500">$</span>

                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={budgets[category.name] || ""}
                    onChange={(event) =>
                      updateBudget(category.name, event.target.value)
                    }
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none focus:ring-4 focus:ring-cyan-100"
                    placeholder="0.00"
                  />
                </div>

                {category.suggested > 0 && (
                  <p className="mt-2 text-xs font-bold text-slate-400">
                    Suggested: ${category.suggested}/week
                  </p>
                )}
              </div>
            ))}
          </div>

          <button
            type="submit"
            disabled={saving}
            className="mt-6 w-full rounded-full bg-gradient-to-r from-[#0b4edb] via-[#00b7c7] to-[#5ce05c] px-6 py-3 font-black text-white shadow-lg disabled:opacity-60"
          >
            {saving ? "Saving setup..." : "Save Setup and Go to Dashboard"}
          </button>

          {message && (
            <p className="mt-4 rounded-2xl bg-green-50 p-3 text-sm font-bold text-green-700">
              {message}
            </p>
          )}

          {error && (
            <p className="mt-4 rounded-2xl bg-red-50 p-3 text-sm font-bold text-red-600">
              {error}
            </p>
          )}
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          SafeSpend AI is a spending-awareness tool, not financial, legal, tax,
          or investment advice.
        </p>
      </section>
    </main>
  );
}