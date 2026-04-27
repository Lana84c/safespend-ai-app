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
  "Groceries",
  "Bills",
  "Shopping",
  "Transportation",
  "Dining",
  "Subscriptions",
  "Personal",
  "Other",
];

export default function BudgetsPage() {
  const router = useRouter();

  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [budgets, setBudgets] = useState<Record<string, string>>({});
  const [existingBudgets, setExistingBudgets] = useState<Budget[]>([]);

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
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/login");
      return;
    }

    setUserId(user.id);
    setEmail(user.email || "");

    await loadBudgets(user.id);
    setLoading(false);
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

    const rows = (data || []) as Budget[];
    setExistingBudgets(rows);

    const budgetMap: Record<string, string> = {};

    defaultCategories.forEach((category) => {
      const match = rows.find((item) => item.category === category);
      budgetMap[category] = match ? String(match.weekly_limit || "") : "";
    });

    setBudgets(budgetMap);
  }

  function updateBudgetValue(category: string, value: string) {
    setBudgets((current) => ({
      ...current,
      [category]: value,
    }));
  }

  async function handleSaveBudgets(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!userId) return;

    setSaving(true);
    setMessage("");
    setError("");

    for (const category of defaultCategories) {
      const rawValue = budgets[category];
      const weeklyLimit = Number(rawValue || 0);

      if (weeklyLimit < 0) {
        setError("Budget limits cannot be negative.");
        setSaving(false);
        return;
      }

      const existing = existingBudgets.find(
        (budget) => budget.category === category
      );

      if (existing) {
        const { error } = await supabase
          .from("budgets")
          .update({
            weekly_limit: weeklyLimit,
            monthly_limit: weeklyLimit * 4,
          })
          .eq("id", existing.id)
          .eq("user_id", userId);

        if (error) {
          setError(error.message);
          setSaving(false);
          return;
        }
      } else {
        const { error } = await supabase.from("budgets").insert({
          user_id: userId,
          category,
          weekly_limit: weeklyLimit,
          monthly_limit: weeklyLimit * 4,
        });

        if (error) {
          setError(error.message);
          setSaving(false);
          return;
        }
      }
    }

    await loadBudgets(userId);

    setMessage("Budgets saved successfully.");
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
          Loading budgets...
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
                SafeSpend Budgets
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

            <button
              onClick={handleLogout}
              className="rounded-full border border-slate-200 bg-white px-5 py-3 font-black text-[#061b3d] shadow-sm"
            >
              Log Out
            </button>
          </div>
        </header>

        <section className="mb-6 rounded-[2rem] bg-gradient-to-br from-[#0637b8] via-[#0072b8] to-[#00a878] p-8 text-white shadow-2xl">
          <p className="mb-3 inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-bold">
            Weekly category limits
          </p>

          <h2 className="max-w-3xl text-5xl font-black leading-[0.95] tracking-[-0.05em] md:text-6xl">
            Set the guardrails before spending starts.
          </h2>

          <p className="mt-5 max-w-2xl text-white/80">
            Add weekly limits for each spending category. Your dashboard will use
            these limits to show category pressure and overspending risk.
          </p>
        </section>

        <form
          onSubmit={handleSaveBudgets}
          className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl"
        >
          <div className="mb-6">
            <h3 className="text-2xl font-black text-[#061b3d]">
              Weekly Budget Limits
            </h3>
            <p className="mt-2 text-sm text-slate-500">
              Enter the amount you want to allow for each category per week.
              Leave unused categories at 0.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {defaultCategories.map((category) => (
              <div
                key={category}
                className="rounded-3xl border border-slate-200 bg-slate-50 p-4"
              >
                <label className="mb-2 block text-sm font-black text-[#061b3d]">
                  {category}
                </label>

                <div className="flex items-center gap-2">
                  <span className="font-black text-slate-500">$</span>

                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={budgets[category] || ""}
                    onChange={(event) =>
                      updateBudgetValue(category, event.target.value)
                    }
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none focus:ring-4 focus:ring-cyan-100"
                    placeholder="0.00"
                  />
                </div>
              </div>
            ))}
          </div>

          <button
            type="submit"
            disabled={saving}
            className="mt-6 w-full rounded-full bg-gradient-to-r from-[#0b4edb] via-[#00b7c7] to-[#5ce05c] px-6 py-3 font-black text-white shadow-lg disabled:opacity-60"
          >
            {saving ? "Saving budgets..." : "Save Budgets"}
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
      </section>
    </main>
  );
}