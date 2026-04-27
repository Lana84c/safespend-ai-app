"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import AppShell from "@/components/AppShell";

type NotificationItem = {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  severity: "info" | "warning" | "critical" | string;
  action_label: string | null;
  action_href: string | null;
  dedupe_key: string;
  is_read: boolean;
  created_at: string;
};

export default function NotificationsPage() {
  const router = useRouter();

  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    checkUser();
  }, []);

  async function checkUser() {
    setLoading(true);
    setError("");

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

    await loadNotifications(user.id);
    setLoading(false);
  }

  async function loadNotifications(currentUserId: string) {
    const { data, error } = await supabase
      .from("notifications")
      .select(
        "id, user_id, type, title, message, severity, action_label, action_href, dedupe_key, is_read, created_at"
      )
      .eq("user_id", currentUserId)
      .order("created_at", { ascending: false });

    if (error) {
      setError(error.message);
      return;
    }

    setNotifications((data || []) as NotificationItem[]);
  }

  async function markAsRead(notificationId: string) {
    if (!userId) return;

    setSaving(true);
    setError("");

    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", notificationId)
      .eq("user_id", userId);

    if (error) {
      setError(error.message);
      setSaving(false);
      return;
    }

    await loadNotifications(userId);
    setSaving(false);
  }

  async function markAllRead() {
    if (!userId) return;

    setSaving(true);
    setError("");

    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", userId)
      .eq("is_read", false);

    if (error) {
      setError(error.message);
      setSaving(false);
      return;
    }

    await loadNotifications(userId);
    setSaving(false);
  }

  async function deleteNotification(notificationId: string) {
    if (!userId) return;

    const confirmed = window.confirm("Delete this notification?");
    if (!confirmed) return;

    setSaving(true);
    setError("");

    const { error } = await supabase
      .from("notifications")
      .delete()
      .eq("id", notificationId)
      .eq("user_id", userId);

    if (error) {
      setError(error.message);
      setSaving(false);
      return;
    }

    await loadNotifications(userId);
    setSaving(false);
  }

  async function clearReadNotifications() {
    if (!userId) return;

    const confirmed = window.confirm("Clear all read notifications?");
    if (!confirmed) return;

    setSaving(true);
    setError("");

    const { error } = await supabase
      .from("notifications")
      .delete()
      .eq("user_id", userId)
      .eq("is_read", true);

    if (error) {
      setError(error.message);
      setSaving(false);
      return;
    }

    await loadNotifications(userId);
    setSaving(false);
  }

  const unreadCount = notifications.filter((item) => !item.is_read).length;
  const criticalCount = notifications.filter(
    (item) => !item.is_read && item.severity === "critical"
  ).length;
  const warningCount = notifications.filter(
    (item) => !item.is_read && item.severity === "warning"
  ).length;

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f4f8fb] px-6">
        <p className="text-lg font-bold text-[#061b3d]">
          Loading notifications...
        </p>
      </main>
    );
  }

  return (
    <AppShell
      email={email}
      title="Stay ahead of risky spending."
      subtitle="Review SafeSpend alerts for safe-to-spend risk, category pressure, bills, and coaching reminders."
    >
      <section className="mb-6 grid gap-4 md:grid-cols-4">
        <MetricCard label="Unread" value={String(unreadCount)} />
        <MetricCard
          label="Critical"
          value={String(criticalCount)}
          danger={criticalCount > 0}
        />
        <MetricCard
          label="Warnings"
          value={String(warningCount)}
          warning={warningCount > 0}
        />
        <MetricCard label="Total" value={String(notifications.length)} />
      </section>

      <section className="mb-6 flex flex-col gap-4 rounded-[2rem] border border-slate-200 bg-white p-5 shadow-xl md:flex-row md:items-center md:justify-between">
        <div>
          <p className="mb-2 inline-flex rounded-full bg-cyan-50 px-4 py-2 text-xs font-black uppercase tracking-widest text-cyan-700">
            Notification Center
          </p>

          <h2 className="text-3xl font-black tracking-[-0.04em] text-[#061b3d]">
            Your SafeSpend alerts
          </h2>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            These alerts help you catch low safe-to-spend, budget pressure, and
            upcoming money risks before they become bigger problems.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <a
            href="/settings/notifications"
            className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-black text-[#061b3d] shadow-sm"
          >
            Preferences
          </a>

          <button
            type="button"
            onClick={markAllRead}
            disabled={saving || unreadCount === 0}
            className="rounded-full bg-gradient-to-r from-[#0b4edb] via-[#00b7c7] to-[#5ce05c] px-5 py-3 text-sm font-black text-white shadow-lg disabled:opacity-50"
          >
            Mark All Read
          </button>

          <button
            type="button"
            onClick={clearReadNotifications}
            disabled={saving || notifications.every((item) => !item.is_read)}
            className="rounded-full border border-slate-200 bg-slate-50 px-5 py-3 text-sm font-black text-[#061b3d] disabled:opacity-50"
          >
            Clear Read
          </button>
        </div>
      </section>

      {error && (
        <section className="mb-6 rounded-2xl bg-red-50 p-4 text-sm font-bold text-red-600">
          {error}
        </section>
      )}

      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl">
        {notifications.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
            <h3 className="text-2xl font-black text-[#061b3d]">
              No notifications yet
            </h3>

            <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500">
              SafeSpend will show alerts here when your safe-to-spend gets low,
              a budget category gets close to its limit, a bill needs attention,
              or your spending risk increases.
            </p>

            <div className="mt-5 flex flex-wrap justify-center gap-3">
              <a
                href="/dashboard"
                className="rounded-full bg-gradient-to-r from-[#0b4edb] via-[#00b7c7] to-[#5ce05c] px-5 py-3 text-sm font-black text-white shadow-lg"
              >
                Open Dashboard
              </a>

              <a
                href="/settings/notifications"
                className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-black text-[#061b3d]"
              >
                Notification Settings
              </a>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((item) => (
              <NotificationCard
                key={item.id}
                notification={item}
                saving={saving}
                onMarkRead={() => markAsRead(item.id)}
                onDelete={() => deleteNotification(item.id)}
              />
            ))}
          </div>
        )}
      </section>
    </AppShell>
  );
}

function NotificationCard({
  notification,
  saving,
  onMarkRead,
  onDelete,
}: {
  notification: NotificationItem;
  saving: boolean;
  onMarkRead: () => void;
  onDelete: () => void;
}) {
  const isCritical = notification.severity === "critical";
  const isWarning = notification.severity === "warning";

  return (
    <div
      className={`rounded-3xl border p-5 ${
        notification.is_read
          ? "border-slate-200 bg-slate-50"
          : isCritical
            ? "border-red-100 bg-red-50"
            : isWarning
              ? "border-yellow-100 bg-yellow-50"
              : "border-cyan-100 bg-cyan-50"
      }`}
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full px-3 py-1 text-xs font-black uppercase tracking-widest ${
                isCritical
                  ? "bg-red-100 text-red-700"
                  : isWarning
                    ? "bg-yellow-100 text-yellow-800"
                    : "bg-cyan-100 text-cyan-700"
              }`}
            >
              {notification.severity}
            </span>

            <span className="rounded-full bg-white px-3 py-1 text-xs font-black uppercase tracking-widest text-slate-500">
              {notification.type}
            </span>

            {!notification.is_read && (
              <span className="rounded-full bg-[#061b3d] px-3 py-1 text-xs font-black uppercase tracking-widest text-white">
                New
              </span>
            )}
          </div>

          <h3 className="mt-3 text-xl font-black text-[#061b3d]">
            {notification.title}
          </h3>

          <p className="mt-2 text-sm leading-6 text-slate-600">
            {notification.message}
          </p>

          <p className="mt-3 text-xs font-bold text-slate-400">
            {formatDateTime(notification.created_at)}
          </p>
        </div>

        <div className="flex flex-wrap gap-2 md:justify-end">
          {notification.action_href && notification.action_label && (
            <a
              href={notification.action_href}
              className="rounded-full bg-white px-4 py-2 text-xs font-black text-[#061b3d] shadow-sm"
            >
              {notification.action_label}
            </a>
          )}

          {!notification.is_read && (
            <button
              type="button"
              onClick={onMarkRead}
              disabled={saving}
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-black text-[#061b3d] disabled:opacity-50"
            >
              Mark Read
            </button>
          )}

          <button
            type="button"
            onClick={onDelete}
            disabled={saving}
            className="rounded-full border border-red-100 bg-white px-4 py-2 text-xs font-black text-red-600 disabled:opacity-50"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  danger = false,
  warning = false,
}: {
  label: string;
  value: string;
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
        className={`mt-2 text-3xl font-black ${
          danger
            ? "text-red-700"
            : warning
              ? "text-yellow-800"
              : "text-[#061b3d]"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function formatDateTime(value: string) {
  if (!value) return "";

  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}