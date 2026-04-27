"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";

type NotificationItem = {
  id: string;
  title: string;
  message: string;
  severity: string;
  is_read: boolean;
  created_at: string;
};

export default function NotificationBell({ userId }: { userId: string }) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [latest, setLatest] = useState<NotificationItem[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    loadNotifications();
  }, [userId]);

  async function loadNotifications() {
    const { data } = await supabase
      .from("notifications")
      .select("id, title, message, severity, is_read, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(5);

    const rows = (data || []) as NotificationItem[];

    setLatest(rows);
    setUnreadCount(rows.filter((item) => !item.is_read).length);
  }

  async function markAllRead() {
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", userId)
      .eq("is_read", false);

    await loadNotifications();
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="relative rounded-full border border-slate-200 bg-white px-4 py-3 font-black text-[#061b3d] shadow-sm"
      >
        Notifications
        {unreadCount > 0 && (
          <span className="absolute -right-2 -top-2 grid h-6 w-6 place-items-center rounded-full bg-red-500 text-xs font-black text-white">
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-3 w-80 rounded-3xl border border-slate-200 bg-white p-4 shadow-2xl">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="font-black text-[#061b3d]">Notifications</h3>

            <button
              type="button"
              onClick={markAllRead}
              className="text-xs font-black text-cyan-700"
            >
              Mark read
            </button>
          </div>

          {latest.length === 0 ? (
            <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
              No notifications yet.
            </p>
          ) : (
            <div className="space-y-2">
              {latest.map((item) => (
                <div
                  key={item.id}
                  className={`rounded-2xl p-3 ${
                    item.is_read ? "bg-slate-50" : "bg-cyan-50"
                  }`}
                >
                  <p className="text-sm font-black text-[#061b3d]">
                    {item.title}
                  </p>

                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    {item.message}
                  </p>
                </div>
              ))}
            </div>
          )}

          <a
            href="/notifications"
            className="mt-3 block rounded-full bg-gradient-to-r from-[#0b4edb] via-[#00b7c7] to-[#5ce05c] px-4 py-3 text-center text-sm font-black text-white"
          >
            View All
          </a>
        </div>
      )}
    </div>
  );
}