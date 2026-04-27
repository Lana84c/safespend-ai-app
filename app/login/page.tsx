"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setLoading(true);
    setError("");

    const { error: loginError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (loginError) {
      setError(loginError.message);
      setLoading(false);
      return;
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
      setError(userError.message);
      setLoading(false);
      return;
    }

    if (!user) {
      setError("Login succeeded, but the user session could not be loaded.");
      setLoading(false);
      return;
    }

    const { data: budgets, error: budgetError } = await supabase
      .from("budgets")
      .select("id")
      .eq("user_id", user.id)
      .limit(1);

    if (budgetError) {
      setError(budgetError.message);
      setLoading(false);
      return;
    }

    if (!budgets || budgets.length === 0) {
      router.push("/onboarding");
    } else {
      router.push("/dashboard");
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#eefbff] via-white to-[#f7fbfd] px-6 py-10 text-[#102033]">
      <section className="mx-auto flex min-h-screen max-w-md flex-col justify-center">
        <div className="mb-8 text-center">
          <img
            src="/safespend-logo.png"
            alt="SafeSpend AI logo"
            className="mx-auto mb-4 h-16 w-16 rounded-2xl shadow-lg"
          />

          <h1 className="text-3xl font-black text-[#061b3d]">
            Log in to SafeSpend
          </h1>

          <p className="mt-3 text-slate-500">
            View your spending dashboard and track your transactions.
          </p>
        </div>

        <form
          onSubmit={handleLogin}
          className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl"
        >
          <label className="mb-2 block text-sm font-bold text-[#061b3d]">
            Email
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="mb-4 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:ring-4 focus:ring-cyan-100"
            placeholder="you@example.com"
          />

          <label className="mb-2 block text-sm font-bold text-[#061b3d]">
            Password
          </label>
          <input
            type="password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="mb-5 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:ring-4 focus:ring-cyan-100"
            placeholder="Enter your password"
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full bg-gradient-to-r from-[#0b4edb] via-[#00b7c7] to-[#5ce05c] px-6 py-3 font-black text-white shadow-lg disabled:opacity-60"
          >
            {loading ? "Logging in..." : "Log In"}
          </button>

          {error && (
            <p className="mt-4 rounded-2xl bg-red-50 p-3 text-sm font-bold text-red-600">
              {error}
            </p>
          )}

          <p className="mt-5 text-center text-sm text-slate-500">
            Need an account?{" "}
            <a href="/signup" className="font-black text-[#0b4edb]">
              Create one
            </a>
          </p>
        </form>
      </section>
    </main>
  );
}