"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useState } from "react";
import { supabase } from "@/lib/supabase/client";

type AppShellProps = {
  email?: string;
  title: string;
  subtitle?: string;
  children: ReactNode;
};

const navItems = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Transactions", href: "/transactions" },
  { label: "Budgets", href: "/budgets" },
  { label: "Bills", href: "/bills" },
  { label: "Coach", href: "/coach" },
  { label: "Reports", href: "/reports" },
  { label: "Exports", href: "/exports" },
  { label: "Billing", href: "/billing" },
  { label: "Settings", href: "/settings" },
  { label: "Account", href: "/account" },
  { label: "Help", href: "/help" },
];

export default function AppShell({
  email = "",
  title,
  subtitle,
  children,
}: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#f4f8fb] px-3 pb-8 pt-3 text-[#061b3d] sm:px-6 sm:pb-10 sm:pt-4 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="sticky top-3 z-50 mb-5 sm:top-4 sm:mb-7">
          <div className="rounded-[1.5rem] border border-white/70 bg-white/92 p-3 shadow-xl backdrop-blur-xl sm:rounded-[2rem] sm:p-4">
            <div className="flex items-center justify-between gap-3">
              <Link
                href="/dashboard"
                className="flex min-w-0 items-center gap-3"
              >
                <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-[1.25rem] bg-white shadow-[0_14px_35px_rgba(0,183,199,0.28)] ring-1 ring-cyan-100 sm:h-20 sm:w-20 sm:rounded-[1.5rem] lg:h-24 lg:w-24 lg:rounded-[1.75rem]">
                  <Image
                    src="/safespend-logo.png"
                    alt="SafeSpend AI logo"
                    width={180}
                    height={180}
                    className="h-full w-full scale-150 object-contain"
                    priority
                  />
                </div>

                <div className="min-w-0">
                  <p className="truncate text-lg font-black tracking-[-0.03em] text-[#061b3d] sm:text-xl">
                    SafeSpend AI
                  </p>
                  <p className="truncate text-xs font-bold text-slate-500">
                    Spending Coach
                  </p>
                </div>
              </Link>

              <div className="hidden items-center gap-3 lg:flex">
                {email && (
                  <div className="max-w-[280px] truncate rounded-full bg-slate-50 px-4 py-2 text-sm font-bold text-slate-500">
                    {email}
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleLogout}
                  disabled={loggingOut}
                  className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-black text-[#061b3d] shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loggingOut ? "Signing out..." : "Sign Out"}
                </button>
              </div>

              <button
                type="button"
                onClick={() => setMenuOpen((current) => !current)}
                className="shrink-0 rounded-full border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-black text-[#061b3d] sm:px-5 sm:py-3 lg:hidden"
              >
                {menuOpen ? "Close" : "Menu"}
              </button>
            </div>

            <nav className="mt-4 hidden flex-wrap gap-2 border-t border-slate-100 pt-4 lg:flex">
              {navItems.map((item) => {
                const active =
                  pathname === item.href || pathname.startsWith(`${item.href}/`);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`rounded-full px-4 py-2.5 text-sm font-black transition ${
                      active
                        ? "bg-gradient-to-r from-[#0b4edb] via-[#00b7c7] to-[#5ce05c] text-white shadow-lg"
                        : "bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-[#061b3d]"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            {menuOpen && (
              <div className="mt-4 border-t border-slate-100 pt-4 lg:hidden">
                <nav className="grid gap-2 sm:grid-cols-2">
                  {navItems.map((item) => {
                    const active =
                      pathname === item.href ||
                      pathname.startsWith(`${item.href}/`);

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMenuOpen(false)}
                        className={`rounded-2xl px-4 py-3 text-center text-sm font-black ${
                          active
                            ? "bg-gradient-to-r from-[#0b4edb] via-[#00b7c7] to-[#5ce05c] text-white shadow-lg"
                            : "bg-slate-50 text-[#061b3d]"
                        }`}
                      >
                        {item.label}
                      </Link>
                    );
                  })}
                </nav>

                <div className="mt-4 flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
                  {email && (
                    <p className="truncate rounded-full bg-slate-50 px-4 py-3 text-center text-sm font-bold text-slate-500">
                      {email}
                    </p>
                  )}

                  <button
                    type="button"
                    onClick={handleLogout}
                    disabled={loggingOut}
                    className="rounded-full border border-slate-200 bg-white px-4 py-3 text-sm font-black text-[#061b3d] shadow-sm disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {loggingOut ? "Signing out..." : "Sign Out"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </header>

        <section className="mb-5 overflow-hidden rounded-[1.5rem] border border-cyan-100 bg-gradient-to-br from-[#0637b8] via-[#0072b8] to-[#00a878] p-5 text-white shadow-xl sm:rounded-[2rem] md:mb-6 md:p-8">
          <div className="relative">
            <div className="absolute -right-10 -top-16 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
            <div className="absolute -bottom-20 left-1/3 h-44 w-44 rounded-full bg-[#5ce05c]/20 blur-3xl" />

            <h1 className="relative max-w-5xl text-2xl font-black leading-tight tracking-[-0.04em] text-white sm:text-3xl md:text-5xl">
              {title}
            </h1>

            {subtitle && (
              <p className="relative mt-3 max-w-4xl text-sm leading-6 text-white/80 md:text-base">
                {subtitle}
              </p>
            )}
          </div>
        </section>

        {children}
      </div>
    </main>
  );
}