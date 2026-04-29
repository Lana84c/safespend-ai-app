"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

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
];

export default function AppShell({
  email,
  title,
  subtitle,
  children,
}: AppShellProps) {
  const pathname = usePathname();

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#eefbff] via-white to-[#f7fbfd] px-4 py-5 text-[#102033] sm:px-6 lg:px-8">
      <section className="mx-auto w-full max-w-7xl">
        <header className="mb-6 rounded-[1.75rem] border border-slate-200 bg-white/90 p-4 shadow-lg backdrop-blur sm:p-5 lg:mb-8 lg:rounded-[2rem]">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex items-center gap-4">
              <img
                src="/safespend-logo.png"
                alt="SafeSpend AI logo"
                className="h-12 w-12 shrink-0 rounded-2xl object-cover shadow-lg sm:h-14 sm:w-14"
              />

              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-widest text-cyan-700">
                  SafeSpend AI
                </p>

                <h1 className="mt-1 text-2xl font-black leading-tight tracking-[-0.04em] text-[#061b3d] sm:text-3xl lg:text-4xl">
                  {title}
                </h1>

                {subtitle && (
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500 sm:text-base">
                    {subtitle}
                  </p>
                )}

                {email && (
                  <p className="mt-2 truncate text-xs font-bold text-slate-400 sm:text-sm">
                    {email}
                  </p>
                )}
              </div>
            </div>

            <nav className="flex gap-2 overflow-x-auto pb-1 xl:max-w-[620px] xl:flex-wrap xl:justify-end xl:overflow-visible">
              {navItems.map((item) => {
                const active =
                  pathname === item.href || pathname.startsWith(`${item.href}/`);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`shrink-0 rounded-full px-4 py-2.5 text-sm font-black transition ${
                      active
                        ? "bg-gradient-to-r from-[#0b4edb] via-[#00b7c7] to-[#5ce05c] text-white shadow-lg"
                        : "border border-slate-200 bg-white text-[#061b3d] hover:-translate-y-0.5 hover:shadow-md"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        </header>

        <div className="w-full">{children}</div>
      </section>
    </main>
  );
}