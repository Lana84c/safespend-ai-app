"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

type NotificationPreferences = {
  user_id: string;
  safe_to_spend_alerts: boolean;
  budget_alerts: boolean;
  bill_due_alerts: boolean;
  ai_coach_reminders: boolean;
  weekly_summary: boolean;
};

const defaultPreferences = {
  safe_to_spend_alerts: true,
  budget_alerts: true,
  bill_due_alerts: true,
  ai_coach_reminders: true,
  weekly_summary: true,
};

export default function NotificationSettingsPage() {
  const router = useRouter();

  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [preferences, setPreferences] = useState(defaultPreferences);
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

    await loadPreferences(user.id);

    setLoading(false);
  }

  async function loadPreferences(currentUserId: string) {
    const { data, error } = await supabase
      .from("notification_preferences")
      .select("*")
      .eq("user_id", currentUserId)
      .maybeSingle();

    if (error) {
      setError(error.message);
      return;
    }

    if (!data) {
      const { data: inserted, error: insertError } = await supabase
        .from("notification_preferences")
        .insert({
          user_id: currentUserId,
          ...defaultPreferences,
        })
        .select("*")
        .single();

      if (insertError) {
        setError(insertError.message);
        return;
      }

      setPreferences({
        safe_to_spend_alerts: inserted.safe_to_spend_alerts,
        budget_alerts: inserted.budget_alerts,
        bill_due_alerts: inserted.bill_due_alerts,
        ai_coach_reminders: inserted.ai_coach_reminders,
        weekly_summary: inserted.weekly_summary,
      });

      return;
    }

    const prefs = data as NotificationPreferences;

    setPreferences({
      safe_to_spend_alerts: prefs.safe_to_spend_alerts,
      budget_alerts: prefs.budget_alerts,
      bill_due_alerts: prefs.bill_due_alerts,
      ai_coach_reminders: prefs.ai_coach_reminders,
      weekly_summary: prefs.weekly_summary,
    });
  }

  async function savePreferences() {
    if (!userId) return;

    setSaving(true);
    setError("");
    setMessage("");

    const { error } = await supabase
      .from("notification_preferences")
      .upsert(
        {
          user_id: userId,
          ...preferences,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );

    if (error) {
      setError(error.message);
      setSaving(false);
      return;
    }

    setMessage("Notification preferences saved.");
    setSaving(false);
  }

  function toggle(key: keyof typeof preferences) {
    setPreferences((current) => ({
      ...current,
      [key]: !current[key],
    }));
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f4f8fb]">
        <p className="text-lg font-bold text-[#061b3d]">
          Loading notification settings...
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#eefbff] via-white to-[#f7fbfd] px-6 py-8 text-[#102033]">
      <section className="mx-auto max-w-4xl">
        <header className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="mb-2 text-sm font-black uppercase tracking-widest text-cyan-700">
              SafeSpend AI
            </p>

            <h1 className="text-4xl font-black tracking-[-0.04em] text-[#061b3d]">
              Notification Settings
            </h1>

            <p className="mt-2 text-sm text-slate-500">{email}</p>
          </div>

          <div className="flex flex-wrap gap-3">
            <a
              href="/settings"
              className="rounded-full border border-slate-200 bg-white px-5 py-3 font-black text-[#061b3d] shadow-sm"
            >
              Back to Settings
            </a>

            <a
              href="/dashboard"
              className="rounded-full bg-gradient-to-r from-[#0b4edb] via-[#00b7c7] to-[#5ce05c] px-5 py-3 font-black text-white shadow-lg"
            >
              Dashboard
            </a>
          </div>
        </header>

        <section className="mb-6 rounded-[2rem] bg-gradient-to-br from-[#0637b8] via-[#0072b8] to-[#00a878] p-8 text-white shadow-2xl">
          <p className="mb-3 inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-bold">
            Alert Control
          </p>

          <h2 className="text-4xl font-black leading-[0.95] tracking-[-0.05em] md:text-5xl">
            Choose which spending alerts matter.
          </h2>

          <p className="mt-5 max-w-2xl text-white/80">
            Turn notification types on or off so SafeSpend only alerts you about
            the money decisions you actually want help watching.
          </p>
        </section>

        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl">
          <div className="space-y-4">
            <PreferenceRow
              title="Safe-to-spend alerts"
              description="Get alerted when your safe-to-spend amount is low or negative."
              checked={preferences.safe_to_spend_alerts}
              onClick={() => toggle("safe_to_spend_alerts")}
            />

            <PreferenceRow
              title="Budget/category alerts"
              description="Get alerted when a category is close to or over its weekly limit."
              checked={preferences.budget_alerts}
              onClick={() => toggle("budget_alerts")}
            />

            <PreferenceRow
              title="Bill due alerts"
              description="Get alerted when bills are coming due or overdue."
              checked={preferences.bill_due_alerts}
              onClick={() => toggle("bill_due_alerts")}
            />

            <PreferenceRow
              title="AI coach reminders"
              description="Get reminders to check in with SafeSpend after risky spending patterns."
              checked={preferences.ai_coach_reminders}
              onClick={() => toggle("ai_coach_reminders")}
            />

            <PreferenceRow
              title="Weekly summary"
              description="Get a weekly spending summary notification."
              checked={preferences.weekly_summary}
              onClick={() => toggle("weekly_summary")}
            />
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={savePreferences}
              disabled={saving}
              className="rounded-full bg-gradient-to-r from-[#0b4edb] via-[#00b7c7] to-[#5ce05c] px-6 py-3 font-black text-white shadow-lg disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save Preferences"}
            </button>

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
        </section>
      </section>
    </main>
  );
}

function PreferenceRow({
  title,
  description,
  checked,
  onClick,
}: {
  title: string;
  description: string;
  checked: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-between gap-4 rounded-3xl border border-slate-200 bg-slate-50 p-5 text-left transition hover:bg-white hover:shadow-md"
    >
      <div>
        <h3 className="text-lg font-black text-[#061b3d]">{title}</h3>
        <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>
      </div>

      <span
        className={`relative h-8 w-14 rounded-full transition ${
          checked ? "bg-gradient-to-r from-[#00b7c7] to-[#5ce05c]" : "bg-slate-300"
        }`}
      >
        <span
          className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition ${
            checked ? "left-7" : "left-1"
          }`}
        />
      </span>
    </button>
  );
}