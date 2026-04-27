import { supabase } from "@/lib/supabase/client";

type CategoryPressureItem = {
  category: string;
  spent: number;
  limit: number;
  percentUsed: number;
  status: string;
};

type Bill = {
  id: string;
  bill_name: string;
  amount: number;
  due_date: string;
  is_paid: boolean;
};

type GenerateNotificationInput = {
  userId: string;
  safeToSpend: number;
  riskLevel: string;
  categoryPressure?: CategoryPressureItem[];
  bills?: Bill[];
};

type NotificationPreference = {
  safe_to_spend_alerts: boolean;
  budget_alerts: boolean;
  bill_due_alerts: boolean;
  ai_coach_reminders: boolean;
  weekly_summary: boolean;
};

const defaultPreferences: NotificationPreference = {
  safe_to_spend_alerts: true,
  budget_alerts: true,
  bill_due_alerts: true,
  ai_coach_reminders: true,
  weekly_summary: true,
};

function getTodayKey() {
  return new Date().toISOString().split("T")[0];
}

function daysUntil(dateValue: string) {
  const today = new Date(`${getTodayKey()}T00:00:00`);
  const due = new Date(`${dateValue}T00:00:00`);
  const diff = due.getTime() - today.getTime();

  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

async function getPreferences(userId: string) {
  const { data, error } = await supabase
    .from("notification_preferences")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.warn("Unable to load notification preferences:", error.message);
    return defaultPreferences;
  }

  if (!data) {
    const { data: inserted } = await supabase
      .from("notification_preferences")
      .insert({
        user_id: userId,
        ...defaultPreferences,
      })
      .select("*")
      .single();

    return (inserted || defaultPreferences) as NotificationPreference;
  }

  return data as NotificationPreference;
}

export async function generateSafeSpendNotifications({
  userId,
  safeToSpend,
  riskLevel,
  categoryPressure = [],
  bills = [],
}: GenerateNotificationInput) {
  const preferences = await getPreferences(userId);
  const todayKey = getTodayKey();

  const notifications = [];

  if (preferences.safe_to_spend_alerts) {
    if (safeToSpend <= 0) {
      notifications.push({
        user_id: userId,
        type: "safe_to_spend",
        title: "Pause non-essential spending",
        message:
          "Your safe-to-spend is at or below $0. Focus on essentials until more income is added or spending is adjusted.",
        severity: "critical",
        action_label: "Open Dashboard",
        action_href: "/dashboard",
        dedupe_key: `${todayKey}:safe-to-spend-critical`,
      });
    } else if (safeToSpend < 100) {
      notifications.push({
        user_id: userId,
        type: "safe_to_spend",
        title: "Safe-to-spend is getting low",
        message:
          "Your available safe-to-spend is under $100. Check before making any flexible purchases.",
        severity: "warning",
        action_label: "Check Spending",
        action_href: "/dashboard",
        dedupe_key: `${todayKey}:safe-to-spend-low`,
      });
    }
  }

  if (preferences.budget_alerts) {
    categoryPressure.forEach((item) => {
      if (item.percentUsed >= 100) {
        notifications.push({
          user_id: userId,
          type: "budget",
          title: `${item.category} is over budget`,
          message: `${item.category} has reached ${item.percentUsed}% of its weekly limit.`,
          severity: "critical",
          action_label: "View Budgets",
          action_href: "/budgets",
          dedupe_key: `${todayKey}:budget:${item.category}:over`,
        });
      } else if (item.percentUsed >= 80) {
        notifications.push({
          user_id: userId,
          type: "budget",
          title: `${item.category} is close to the limit`,
          message: `${item.category} has reached ${item.percentUsed}% of its weekly limit.`,
          severity: "warning",
          action_label: "View Budgets",
          action_href: "/budgets",
          dedupe_key: `${todayKey}:budget:${item.category}:close`,
        });
      }
    });
  }

  if (preferences.bill_due_alerts) {
    bills
      .filter((bill) => !bill.is_paid)
      .forEach((bill) => {
        const days = daysUntil(bill.due_date);

        if (days < 0) {
          notifications.push({
            user_id: userId,
            type: "bill",
            title: `${bill.bill_name} is overdue`,
            message: `${bill.bill_name} is overdue by ${Math.abs(
              days
            )} day(s). Make sure this is handled before spending extra money.`,
            severity: "critical",
            action_label: "Open Bills",
            action_href: "/bills",
            dedupe_key: `${todayKey}:bill:${bill.id}:overdue`,
          });
        } else if (days <= 3) {
          notifications.push({
            user_id: userId,
            type: "bill",
            title: `${bill.bill_name} is due soon`,
            message: `${bill.bill_name} is due in ${days} day(s). Keep that money protected.`,
            severity: "warning",
            action_label: "Open Bills",
            action_href: "/bills",
            dedupe_key: `${todayKey}:bill:${bill.id}:soon`,
          });
        }
      });
  }

  if (preferences.ai_coach_reminders && riskLevel !== "Low") {
    notifications.push({
      user_id: userId,
      type: "coach",
      title: "Check in with SafeSpend Coach",
      message:
        "Your spending risk is elevated. Ask SafeSpend before making another non-essential purchase.",
      severity: "info",
      action_label: "Open Coach",
      action_href: "/coach",
      dedupe_key: `${todayKey}:coach:${riskLevel.toLowerCase()}`,
    });
  }

  if (notifications.length === 0) return;

  const { error } = await supabase
    .from("notifications")
    .upsert(notifications, {
      onConflict: "user_id,dedupe_key",
      ignoreDuplicates: true,
    });

  if (error) {
    console.warn("Unable to create notifications:", error.message);
  }
}