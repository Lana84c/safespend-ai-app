"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

export default function SignUpPage() {
  const router = useRouter();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleSignUp(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setLoading(true);
    setMessage("");
    setError("");

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    const user = data.user;

    if (user) {
      await supabase.from("profiles").insert({
        id: user.id,
        email,
        full_name: fullName,
      });
    }

    setMessage("Account created. You can now log in.");
    setLoading(false);

    setTimeout(() => {
      router.push("/login");
    }, 1000);
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
            Create your SafeSpend account
          </h1>

          <p className="mt-3 text-slate-500">
            Track your own income, expenses, and safe-to-spend dashboard.
          </p>
        </div>

        <form
          onSubmit={handleSignUp}
          className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl"
        >
          <label className="mb-2 block text-sm font-bold text-[#061b3d]">
            Full Name
          </label>
          <input
            type="text"
            required
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            className="mb-4 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:ring-4 focus:ring-cyan-100"
            placeholder="Marlena Carver"
          />

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
            minLength={6}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="mb-5 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:ring-4 focus:ring-cyan-100"
            placeholder="Create a password"
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full bg-gradient-to-r from-[#0b4edb] via-[#00b7c7] to-[#5ce05c] px-6 py-3 font-black text-white shadow-lg disabled:opacity-60"
          >
            {loading ? "Creating account..." : "Create Account"}
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

          <p className="mt-5 text-center text-sm text-slate-500">
            Already have an account?{" "}
            <a href="/login" className="font-black text-[#0b4edb]">
              Log in
            </a>
          </p>
        </form>
      </section>
    </main>
  );
}