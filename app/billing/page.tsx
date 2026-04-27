"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import AppShell from "@/components/AppShell";

type BillingRecord = {
  id: string;
  user_id: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  plan: "free" | "plus" | "pro";
  status:
    | "free"
    | "active"
    | "trialing"
    | "past_due"
    | "canceled"
    | "incomplete"
    | "incomplete_expired"
    | "unpaid";
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  created_at: string;
  updated_at: string;
};

function formatDate(value: string | null) {
  if (!value) return "Not available";

  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatPlan(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export default function BillingPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [billing, setBilling] = useState<BillingRecord | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [workingPlan, setWorkingPlan] = useState<"plus" | "pro" | "portal" | null>(
    null
  );
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");

  useEffect(() => {
    checkUserAndLoadBilling();
  }, []);

  async function checkUserAndLoadBilling() {
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError) {
      setError(sessionError.message);
      setLoading(false);
      return;
    }

    if (!session?.user) {
      router.push("/login");
      return;
    }

    setEmail(session.user.email || "");
    setSessionToken(session.access_token);

    await loadBilling(session.user.id);

    const params = new URLSearchParams(window.location.search);

    if (params.get("success") === "true") {
      setStatus(
        "Checkout completed. Stripe may take a moment to update your plan. Refresh if it does not update right away."
      );
    }

    if (params.get("canceled") === "true") {
      setStatus("Checkout was canceled. Your plan was not changed.");
    }

    setLoading(false);
  }

  async function loadBilling(userId: string) {
    const { data, error } = await supabase
      .from("user_billing")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      setError(error.message);
      return;
    }

    setBilling((data || null) as BillingRecord | null);
  }

  const currentPlan = billing?.plan || "free";
  const currentStatus = billing?.status || "free";

  const hasPaidAccess = useMemo(() => {
    return (
      billing?.status === "active" ||
      billing?.status === "trialing"
    );
  }, [billing]);

  async function startCheckout(plan: "plus" | "pro") {
    setError("");
    setStatus("");
    setWorkingPlan(plan);

    try {
      if (!sessionToken) {
        setError("You must be logged in to upgrade.");
        setWorkingPlan(null);
        return;
      }

      const response = await fetch("/api/stripe/create-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({ plan }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Could not start checkout.");
        setWorkingPlan(null);
        return;
      }

      if (!data.url) {
        setError("Stripe did not return a checkout URL.");
        setWorkingPlan(null);
        return;
      }

      window.location.href = data.url;
    } catch {
      setError("Could not connect to Stripe Checkout.");
      setWorkingPlan(null);
    }
  }

  async function openCustomerPortal() {
    setError("");
    setStatus("");
    setWorkingPlan("portal");

    try {
      if (!sessionToken) {
        setError("You must be logged in to manage billing.");
        setWorkingPlan(null);
        return;
      }

      const response = await fetch("/api/stripe/create-portal-session", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${sessionToken}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Could not open billing portal.");
        setWorkingPlan(null);
        return;
      }

      if (!data.url) {
        setError("Stripe did not return a portal URL.");
        setWorkingPlan(null);
        return;
      }

      window.location.href = data.url;
    } catch {
      setError("Could not connect to Stripe Billing Portal.");
      setWorkingPlan(null);
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f4f8fb]">
        <p className="text-lg font-bold text-[#061b3d]">Loading billing...</p>
      </main>
    );
  }

  return (
    <AppShell
      email={email}
      title="Choose your SafeSpend plan."
      subtitle="Start free, then upgrade when you want bill-aware safe-to-spend, reports, and full AI coaching."
    >
      <section className="mb-6 grid gap-4 md:grid-cols-3">
        <SummaryCard
          label="Current Plan"
          value={formatPlan(currentPlan)}
          helper={`Status: ${currentStatus}`}
        />

        <SummaryCard
          label="Paid Access"
          value={hasPaidAccess ? "Active" : "Not Active"}
          helper={hasPaidAccess ? "Premium features available" : "Free access only"}
          warning={!hasPaidAccess}
        />

        <SummaryCard
          label="Period Ends"
          value={formatDate(billing?.current_period_end || null)}
          helper={
            billing?.cancel_at_period_end
              ? "Cancels at period end"
              : "Subscription renewal date"
          }
        />
      </section>

      {status && (
        <section className="mb-6 rounded-2xl bg-green-50 p-4 text-sm font-bold text-green-700">
          {status}
        </section>
      )}

      {error && (
        <section className="mb-6 rounded-2xl bg-red-50 p-4 text-sm font-bold text-red-600">
          {error}
        </section>
      )}

      <section className="mb-6 grid gap-6 xl:grid-cols-3">
        <PlanCard
          name="Free"
          price="$0"
          description="For basic spending awareness."
          features={[
            "Dashboard overview",
            "Manual transactions",
            "Basic budgets",
            "Account access",
          ]}
          current={currentPlan === "free"}
          buttonLabel="Current Plan"
          disabled
        />

        <PlanCard
          name="Plus"
          price="$7/mo"
          description="For bill-aware spending decisions."
          features={[
            "Everything in Free",
            "Bills and upcoming obligations",
            "Protected safe-to-spend",
            "Reports",
            "Full AI spending coach",
          ]}
          current={currentPlan === "plus" && hasPaidAccess}
          buttonLabel={
            workingPlan === "plus"
              ? "Opening Checkout..."
              : currentPlan === "plus" && hasPaidAccess
                ? "Current Plan"
                : "Upgrade to Plus"
          }
          disabled={workingPlan !== null || (currentPlan === "plus" && hasPaidAccess)}
          onClick={() => startCheckout("plus")}
          highlighted
        />

        <PlanCard
          name="Pro"
          price="$15/mo"
          description="For deeper future features and advanced use."
          features={[
            "Everything in Plus",
            "Advanced reports",
            "Future exports",
            "Future premium coaching",
            "Priority feature access",
          ]}
          current={currentPlan === "pro" && hasPaidAccess}
          buttonLabel={
            workingPlan === "pro"
              ? "Opening Checkout..."
              : currentPlan === "pro" && hasPaidAccess
                ? "Current Plan"
                : "Upgrade to Pro"
          }
          disabled={workingPlan !== null || (currentPlan === "pro" && hasPaidAccess)}
          onClick={() => startCheckout("pro")}
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[.9fr_1.1fr]">
        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl">
          <h3 className="text-2xl font-black text-[#061b3d]">
            Manage Subscription
          </h3>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            Use Stripe’s secure customer portal to manage payment methods,
            invoices, renewals, and cancellation.
          </p>

          <button
            type="button"
            onClick={openCustomerPortal}
            disabled={workingPlan !== null || !billing?.stripe_customer_id}
            className="mt-5 rounded-full bg-gradient-to-r from-[#0b4edb] via-[#00b7c7] to-[#5ce05c] px-6 py-3 text-sm font-black text-white shadow-lg disabled:opacity-60"
          >
            {workingPlan === "portal" ? "Opening Portal..." : "Open Billing Portal"}
          </button>

          {!billing?.stripe_customer_id && (
            <p className="mt-3 rounded-2xl bg-yellow-50 p-3 text-sm font-bold text-yellow-700">
              You will get billing portal access after starting a paid
              subscription.
            </p>
          )}
        </section>

        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl">
          <h3 className="text-2xl font-black text-[#061b3d]">
            Billing Notes
          </h3>

          <div className="mt-5 space-y-3">
            <InfoCard
              title="Secure checkout"
              description="Payments are handled by Stripe Checkout. SafeSpend does not store card numbers."
            />

            <InfoCard
              title="Subscription updates"
              description="Stripe webhooks update your SafeSpend plan after checkout, renewal, cancellation, or payment failure."
            />

            <InfoCard
              title="MVP access"
              description="Feature gates can be tightened after checkout is fully tested. For now, this page establishes the subscription foundation."
            />
          </div>
        </section>
      </section>
    </AppShell>
  );
}

function SummaryCard({
  label,
  value,
  helper,
  warning = false,
}: {
  label: string;
  value: string;
  helper: string;
  warning?: boolean;
}) {
  return (
    <div
      className={`rounded-3xl border p-5 shadow-lg ${
        warning ? "border-yellow-100 bg-yellow-50" : "border-slate-200 bg-white"
      }`}
    >
      <p
        className={`text-xs font-black uppercase tracking-widest ${
          warning ? "text-yellow-600" : "text-slate-500"
        }`}
      >
        {label}
      </p>

      <p
        className={`mt-2 text-2xl font-black ${
          warning ? "text-yellow-800" : "text-[#061b3d]"
        }`}
      >
        {value}
      </p>

      <p
        className={`mt-1 text-xs ${
          warning ? "text-yellow-700" : "text-slate-500"
        }`}
      >
        {helper}
      </p>
    </div>
  );
}

function PlanCard({
  name,
  price,
  description,
  features,
  current = false,
  highlighted = false,
  buttonLabel,
  disabled = false,
  onClick,
}: {
  name: string;
  price: string;
  description: string;
  features: string[];
  current?: boolean;
  highlighted?: boolean;
  buttonLabel: string;
  disabled?: boolean;
  onClick?: () => void;
}) {
  return (
    <section
      className={`rounded-[2rem] border p-6 shadow-xl ${
        highlighted
          ? "border-cyan-200 bg-gradient-to-br from-white to-cyan-50"
          : "border-slate-200 bg-white"
      }`}
    >
      {highlighted && (
        <p className="mb-3 inline-flex rounded-full bg-cyan-100 px-4 py-2 text-xs font-black uppercase tracking-widest text-cyan-700">
          Recommended
        </p>
      )}

      {current && (
        <p className="mb-3 inline-flex rounded-full bg-green-100 px-4 py-2 text-xs font-black uppercase tracking-widest text-green-700">
          Current Plan
        </p>
      )}

      <h3 className="text-2xl font-black text-[#061b3d]">{name}</h3>

      <p className="mt-3 text-4xl font-black text-[#061b3d]">{price}</p>

      <p className="mt-3 text-sm leading-6 text-slate-500">{description}</p>

      <div className="mt-5 space-y-3">
        {features.map((feature) => (
          <div
            key={feature}
            className="rounded-2xl border border-slate-100 bg-slate-50 p-3 text-sm font-bold text-[#061b3d]"
          >
            {feature}
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className={`mt-6 w-full rounded-full px-6 py-3 font-black shadow-lg disabled:opacity-60 ${
          highlighted
            ? "bg-gradient-to-r from-[#0b4edb] via-[#00b7c7] to-[#5ce05c] text-white"
            : "border border-slate-200 bg-white text-[#061b3d]"
        }`}
      >
        {buttonLabel}
      </button>
    </section>
  );
}

function InfoCard({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-3xl border border-slate-100 bg-slate-50 p-4">
      <p className="font-black text-[#061b3d]">{title}</p>
      <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>
    </div>
  );
}