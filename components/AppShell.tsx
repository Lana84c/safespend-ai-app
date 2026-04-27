"use client";

import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

type AppShellProps = {
  email?: string;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
};

  const navItems = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Transactions", href: "/transactions" },
  { label: "Budgets", href: "/budgets" },
  { label: "Bills", href: "/bills" },
  { label: "Coach", href: "/coach" },
  { label: "Reports", href: "/reports" },
  { label: "Settings", href: "/settings" },
  { label: "Account", href: "/account" },
  { label: "Billing", href: "/billing" },
  { label: "Help", href: "/help" },
];

export default function AppShell({
  email,
  title,
  subtitle,
  children,
}: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#eefbff] via-white to-[#f7fbfd] px-4 py-6 text-[#102033] md:px-6 md:py-8">
      <section className="mx-auto max-w-7xl">
        <header className="mb-6 rounded-[2rem] border border-slate-200 bg-white/90 p-4 shadow-lg backdrop-blur md:p-5">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-4">
              <img
                src="/safespend-logo.png"
                alt="SafeSpend AI logo"
                className="h-14 w-14 rounded-2xl shadow-lg"
              />

              <div>
                <h1 className="text-2xl font-black text-[#061b3d]">
                  SafeSpend AI
                </h1>
                <p className="text-sm text-slate-500">
                  {email || "Your spending control center"}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="rounded-full border border-slate-200 bg-white px-5 py-3 font-black text-[#061b3d] shadow-sm"
            >
              Log Out
            </button>
          </div>

          <nav className="mt-5 flex gap-2 overflow-x-auto pb-1">
            {navItems.map((item) => {
              const active = pathname === item.href;

              return (
                <a
                  key={item.href}
                  href={item.href}
                  className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-black transition ${
                    active
                      ? "bg-gradient-to-r from-[#0b4edb] via-[#00b7c7] to-[#5ce05c] text-white shadow-lg"
                      : "border border-slate-200 bg-slate-50 text-[#061b3d]"
                  }`}
                >
                  {item.label}
                </a>
              );
            })}
          </nav>
        </header>

        <section className="mb-6 rounded-[2rem] bg-gradient-to-br from-[#0637b8] via-[#0072b8] to-[#00a878] p-7 text-white shadow-2xl md:p-8">
          <p className="mb-3 inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-bold">
            SafeSpend AI
          </p>

          <h2 className="max-w-4xl text-4xl font-black leading-[0.95] tracking-[-0.05em] md:text-6xl">
            {title}
          </h2>

          {subtitle && (
            <p className="mt-5 max-w-2xl text-white/80">{subtitle}</p>
          )}
        </section>

        {children}
      </section>
    </main>
  );
}