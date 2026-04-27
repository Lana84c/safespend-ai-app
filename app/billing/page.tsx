"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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

type PlanKey = "free" | "plus" | "pro";

const plans: {
  key: PlanKey;
  name: string;
  price: string;
  description: string;
  features: string[];
  cta: string;
  highlighted?: boolean;
  badge?: string;
}[] = [
  {
    key: "free",
    name: "Free",
    price: "$0",
    description: "For trying SafeSpend and building basic money awareness.",
    cta: "Current Free Plan",
    features: [
      "100 transactions per month",
      "3 budgets max",
      "10 AI coach messages per month",
      "Dashboard overview",
      "Manual transaction tracking",
      "Basic safe-to-spend view",
      "Up to 10 bills tracked",
      "No reports",
      "No protected safe-to-spend",
    ],
  },
  {
    key: "plus",
    name: "Plus",
    price: "$7/mo",
    description:
      "Everything you need to stay on top of your money and reach your goals.",
    cta: "Upgrade to Plus",
    highlighted: true,
    badge: "Recommended",
    features: [
      "Unlimited transactions",
      "Unlimited budgets",
      "Bills tracking — up to 50 bills",
      "Protected safe-to-spend",
      "Spending reports — up to 20/month",
      "AI coaching — up to 100 messages/month",
      "Cancel anytime",
      "No hidden fees",
    ],
  },
  {
    key: "pro",
    name: "Pro",
    price: "$15/mo",
    description: "The complete financial command center powered by AI.",
    cta: "Upgrade to Pro",
    badge: "Premium",
    features: [
      "Everything in Plus",
      "Higher AI coach usage",
      "Advanced reports",
      "Custom filters and deeper analytics",
      "Deeper spending insights",
      "Priority future features",
      "Future CSV exports",
      "Future paycheck and debt payoff planning",
    ],
  },
];

function formatDate(value: string | null) {
  if (!value) return "Not available";

  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatLabel(value: string) {
  return value
    .replaceAll("_", " ")
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function isPaidStatus(status?: string | null) {
  return status === "active" || status === "trialing";
}

export default function BillingPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-[#f4f8fb]">
          <p className="text-lg font-bold text-[#061b3d]">
            Loading billing...
          </p>
        </main>
      }
    >
      <BillingPageContent />
    </Suspense>
  );
}

function BillingPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState("");
  const [billing, setBilling] = useState<BillingRecord | null>(null);

  const [loading, setLoading] = useState(true);
  const [startingCheckout, setStartingCheckout] = useState<PlanKey | null>(
    null
  );
  const [openingPortal, setOpeningPortal] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");

  useEffect(() => {
    checkUserAndLoadBilling();
  }, []);

  useEffect(() => {
    if (searchParams.get("success") === "true") {
      setStatus(
        "Checkout completed. Your plan may take a moment to update while Stripe confirms the subscription."
      );
    }

    if (searchParams.get("canceled") === "true") {
      setStatus("Checkout was canceled. No changes were made.");
    }
  }, [searchParams]);

  async function checkUserAndLoadBilling() {
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
      router.push("/login");
      return;
    }

    setEmail(user.email || "");

    const { data, error } = await supabase
      .from("user_billing")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    if (data) {
      setBilling(data as BillingRecord);
    } else {
      const { data: createdBilling, error: insertError } = await supabase
        .from("user_billing")
        .insert({
          user_id: user.id,
          plan: "free",
          status: "free",
          updated_at: new Date().toISOString(),
        })
        .select("*")
        .single();

      if (insertError) {
        setError(insertError.message);
        setLoading(false);
        return;
      }

      setBilling(createdBilling as BillingRecord);
    }

    setLoading(false);
  }

  async function getAccessToken() {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error || !session?.access_token) {
      throw new Error("You must be logged in to manage billing.");
    }

    return session.access_token;
  }

  async function handleCheckout(plan: PlanKey) {
    if (plan === "free") return;

    setStartingCheckout(plan);
    setError("");
    setStatus("");

    try {
      const accessToken = await getAccessToken();

      const response = await fetch("/api/stripe/create-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ plan }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Unable to start checkout.");
        setStartingCheckout(null);
        return;
      }

      if (!data.url) {
        setError("Stripe did not return a checkout URL.");
        setStartingCheckout(null);
        return;
      }

      window.location.href = data.url;
    } catch (error: any) {
      setError(error?.message || "Unable to start checkout.");
      setStartingCheckout(null);
    }
  }

  async function handleCustomerPortal() {
    setOpeningPortal(true);
    setError("");
    setStatus("");

    try {
      const accessToken = await getAccessToken();

      const response = await fetch("/api/stripe/create-portal-session", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Unable to open billing portal.");
        setOpeningPortal(false);
        return;
      }

      if (!data.url) {
        setError("Stripe did not return a billing portal URL.");
        setOpeningPortal(false);
        return;
      }

      window.location.href = data.url;
    } catch (error: any) {
      setError(error?.message || "Unable to open billing portal.");
      setOpeningPortal(false);
    }
  }

  const currentPlan = billing?.plan || "free";
  const currentStatus = billing?.status || "free";
  const hasPaidAccess = isPaidStatus(currentStatus) && currentPlan !== "free";

  const billingSummary = useMemo(() => {
    return {
      plan: formatLabel(currentPlan),
      status: formatLabel(currentStatus),
      renews: billing?.current_period_end
        ? formatDate(billing.current_period_end)
        : "Not available",
      canceling: billing?.cancel_at_period_end ? "Yes" : "No",
    };
  }, [billing, currentPlan, currentStatus]);

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
      title="Choose the SafeSpend plan that fits your money goals."
      subtitle="Start free, upgrade to Plus for full spending control, or choose Pro for advanced AI-powered insights."
    >
      <section className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          label="Current Plan"
          value={billingSummary.plan}
          helper="Your active app tier"
        />

        <SummaryCard
          label="Billing Status"
          value={billingSummary.status}
          helper="Stripe subscription state"
          warning={currentStatus === "past_due" || currentStatus === "unpaid"}
        />

        <SummaryCard
          label="Current Period Ends"
          value={billingSummary.renews}
          helper={
            billing?.cancel_at_period_end
              ? "Plan will cancel after this date"
              : "Next renewal/checkpoint"
          }
        />

        <SummaryCard
          label="Canceling"
          value={billingSummary.canceling}
          helper="Managed in Stripe Portal"
          warning={Boolean(billing?.cancel_at_period_end)}
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

      <section className="mb-6 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="mb-2 inline-flex rounded-full bg-cyan-50 px-4 py-2 text-xs font-black uppercase tracking-widest text-cyan-700">
              Billing
            </p>

            <h3 className="text-2xl font-black text-[#061b3d]">
              Current subscription
            </h3>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
              Your billing is handled securely through Stripe. Use the billing
              portal to update payment methods, view invoices, or cancel a paid
              subscription.
            </p>
          </div>

          <button
            type="button"
            onClick={handleCustomerPortal}
            disabled={openingPortal || !billing?.stripe_customer_id}
            className="rounded-full border border-slate-200 bg-slate-50 px-6 py-3 font-black text-[#061b3d] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {openingPortal ? "Opening..." : "Manage Billing"}
          </button>
        </div>

        {!billing?.stripe_customer_id && (
          <p className="mt-4 rounded-2xl bg-yellow-50 p-4 text-sm font-bold leading-6 text-yellow-700">
            A Stripe customer has not been created yet. This happens
            automatically when you start checkout.
          </p>
        )}
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        {plans.map((plan) => {
          const isCurrentPlan = currentPlan === plan.key;
          const isPaidPlan = plan.key !== "free";
          const isCurrentPaidPlan = isCurrentPlan && hasPaidAccess;
          const canUpgrade =
            isPaidPlan && (!isCurrentPlan || !isPaidStatus(currentStatus));

          return (
            <div
              key={plan.key}
              className={`relative rounded-[2rem] border p-6 shadow-xl ${
                plan.highlighted
                  ? "border-cyan-200 bg-gradient-to-br from-white to-[#eefbff]"
                  : plan.key === "pro"
                    ? "border-blue-200 bg-gradient-to-br from-white to-blue-50"
                    : "border-slate-200 bg-white"
              }`}
            >
              {plan.badge && (
                <p
                  className={`absolute right-5 top-5 rounded-full px-3 py-1 text-xs font-black ${
                    plan.key === "pro"
                      ? "bg-blue-100 text-blue-700"
                      : "bg-cyan-50 text-cyan-700"
                  }`}
                >
                  {plan.badge}
                </p>
              )}

              <h3 className="text-2xl font-black text-[#061b3d]">
                {plan.name}
              </h3>

              <p className="mt-2 min-h-12 text-sm leading-6 text-slate-500">
                {plan.description}
              </p>

              <p className="mt-5 text-4xl font-black text-[#061b3d]">
                {plan.price}
              </p>

              <div className="mt-5 space-y-3">
                {plan.features.map((feature) => (
                  <div
                    key={feature}
                    className={`rounded-2xl p-3 text-sm font-bold leading-6 ${
                      plan.highlighted
                        ? "bg-white text-slate-700"
                        : "bg-slate-50 text-slate-600"
                    }`}
                  >
                    {feature}
                  </div>
                ))}
              </div>

              <div className="mt-6">
                {plan.key === "free" ? (
                  <button
                    type="button"
                    disabled
                    className="w-full rounded-full border border-slate-200 bg-slate-50 px-6 py-3 font-black text-slate-400"
                  >
                    {currentPlan === "free" ? "Current Plan" : "Included"}
                  </button>
                ) : isCurrentPaidPlan ? (
                  <button
                    type="button"
                    disabled
                    className="w-full rounded-full bg-green-50 px-6 py-3 font-black text-green-700"
                  >
                    Current Plan
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={
                      startingCheckout !== null ||
                      (isCurrentPlan && currentStatus === "incomplete")
                    }
                    onClick={() => handleCheckout(plan.key)}
                    className={`w-full rounded-full px-6 py-3 font-black text-white shadow-lg disabled:cursor-not-allowed disabled:opacity-60 ${
                      plan.key === "pro"
                        ? "bg-gradient-to-r from-[#061b3d] via-[#0b4edb] to-[#00b7c7]"
                        : "bg-gradient-to-r from-[#0b4edb] via-[#00b7c7] to-[#5ce05c]"
                    }`}
                  >
                    {startingCheckout === plan.key
                      ? "Starting checkout..."
                      : canUpgrade
                        ? plan.cta
                        : "Start Checkout"}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[1.1fr_.9fr]">
        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl">
          <h3 className="text-2xl font-black text-[#061b3d]">
            Tier access summary
          </h3>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            These limits keep Free useful, make Plus the main full-featured
            plan, and reserve deeper analysis tools for Pro.
          </p>

          <div className="mt-5 space-y-3">
            <FeatureGate
              label="Free"
              text="100 transactions/month, 3 budgets max, and 10 AI coach messages/month. Up to 10 bills tracked, no reports, and no protected safe-to-spend."
            />

            <FeatureGate
              label="Plus"
              text="Unlimited transactions and budgets, up to 50 bills, protected safe-to-spend, 20 reports/month, and 100 AI coach messages/month."
              highlighted
            />

            <FeatureGate
              label="Pro"
              text="Everything in Plus, higher AI coaching, advanced reports, deeper insights, exports, and priority future features."
            />
          </div>
        </section>

        <section className="rounded-[2rem] border border-yellow-100 bg-yellow-50 p-6 shadow-xl">
          <h3 className="text-2xl font-black text-yellow-800">
            Important disclaimer
          </h3>

          <p className="mt-3 text-sm leading-6 text-yellow-700">
            SafeSpend AI is a budgeting, spending-awareness, and organization
            tool. It is not financial, legal, tax, investment, credit repair,
            debt settlement, banking, or lending advice.
          </p>

          <div className="mt-5 rounded-3xl bg-white/70 p-4">
            <p className="text-sm font-black text-yellow-800">
              Best next step
            </p>
            <p className="mt-1 text-sm leading-6 text-yellow-700">
              Upgrade to Plus when you want bills, protected safe-to-spend,
              reports, and more AI coaching. Choose Pro when advanced reports,
              deeper insights, and premium planning tools are ready.
            </p>
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

function FeatureGate({
  label,
  text,
  highlighted = false,
}: {
  label: string;
  text: string;
  highlighted?: boolean;
}) {
  return (
    <div
      className={`rounded-3xl border p-4 ${
        highlighted
          ? "border-cyan-200 bg-cyan-50"
          : "border-slate-100 bg-slate-50"
      }`}
    >
      <p
        className={`font-black ${
          highlighted ? "text-cyan-800" : "text-[#061b3d]"
        }`}
      >
        {label}
      </p>

      <p
        className={`mt-1 text-sm leading-6 ${
          highlighted ? "text-cyan-700" : "text-slate-500"
        }`}
      >
        {text}
      </p>
    </div>
  );
}