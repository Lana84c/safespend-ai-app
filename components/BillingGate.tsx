"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import {
  formatPlanLabel,
  hasPlanAccess,
  type BillingStatus,
  type PlanKey,
} from "@/lib/billing/plans";

type BillingRecord = {
  plan: PlanKey;
  status: BillingStatus;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
};

type BillingGateProps = {
  requiredPlan: PlanKey;
  featureName: string;
  children: React.ReactNode;
};

export default function BillingGate({
  requiredPlan,
  featureName,
  children,
}: BillingGateProps) {
  const [billing, setBilling] = useState<BillingRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadBilling();
  }, []);

  async function loadBilling() {
    setLoading(true);
    setError("");

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
      setError("You must be logged in to access this feature.");
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("user_billing")
      .select("plan, status, current_period_end, cancel_at_period_end")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    setBilling(
      data
        ? (data as BillingRecord)
        : {
            plan: "free",
            status: "free",
            current_period_end: null,
            cancel_at_period_end: false,
          }
    );

    setLoading(false);
  }

  const currentPlan = billing?.plan || "free";
  const currentStatus = billing?.status || "free";

  const allowed = hasPlanAccess({
    currentPlan,
    currentStatus,
    requiredPlan,
  });

  if (loading) {
    return (
      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl">
        <p className="text-sm font-bold text-slate-500">
          Checking subscription access...
        </p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="rounded-[2rem] border border-red-100 bg-red-50 p-6 shadow-xl">
        <h3 className="text-xl font-black text-red-700">
          Could not verify billing access
        </h3>

        <p className="mt-2 text-sm font-bold leading-6 text-red-600">
          {error}
        </p>

        <div className="mt-5 flex flex-wrap gap-3">
          <a
            href="/billing"
            className="rounded-full bg-white px-5 py-3 text-sm font-black text-red-700 shadow-sm"
          >
            Open Billing
          </a>

          <a
            href="/dashboard"
            className="rounded-full border border-red-100 bg-red-100 px-5 py-3 text-sm font-black text-red-700"
          >
            Back to Dashboard
          </a>
        </div>
      </section>
    );
  }

  if (!allowed) {
    return (
      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl">
        <div className="rounded-[2rem] bg-gradient-to-br from-[#0637b8] via-[#0072b8] to-[#00a878] p-7 text-white shadow-2xl">
          <p className="mb-3 inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-bold">
            Upgrade Required
          </p>

          <h3 className="max-w-3xl text-4xl font-black leading-[0.95] tracking-[-0.04em] md:text-5xl">
            {featureName} is included with {formatPlanLabel(requiredPlan)}.
          </h3>

          <p className="mt-5 max-w-3xl text-sm leading-6 text-white/80">
            Your current plan is {formatPlanLabel(currentPlan)} with status{" "}
            {formatPlanLabel(currentStatus)}. Upgrade to unlock this feature and
            use SafeSpend as a full spending control system.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <a
              href="/billing"
              className="rounded-full bg-white px-5 py-3 text-sm font-black text-[#061b3d]"
            >
              View Plans
            </a>

            <a
              href="/dashboard"
              className="rounded-full border border-white/25 bg-white/10 px-5 py-3 text-sm font-black text-white"
            >
              Back to Dashboard
            </a>
          </div>
        </div>

        <section className="mt-6 grid gap-4 xl:grid-cols-3">
          <PlanCard
            name="Free"
            price="$0"
            description="For trying SafeSpend and building basic money awareness."
            features={[
              "100 transactions per month",
              "3 budgets max",
              "10 AI coach messages per month",
              "Dashboard overview",
              "Manual transaction tracking",
              "Basic safe-to-spend view",
              "Up to 10 bills tracked",
              "No reports",
            ]}
          />

          <PlanCard
            name="Plus"
            price="$7/mo"
            description="Everything you need to stay on top of your money and reach your goals."
            highlighted
            features={[
              "Unlimited transactions",
              "Unlimited budgets",
              "Bills tracking — up to 50 bills",
              "Protected safe-to-spend",
              "Spending reports — up to 20/month",
              "AI coaching — up to 100 messages/month",
              "Cancel anytime",
              "No hidden fees",
            ]}
          />

          <PlanCard
            name="Pro"
            price="$15/mo"
            description="The complete financial command center powered by AI."
            features={[
              "Everything in Plus",
              "Higher AI coach usage",
              "Advanced reports",
              "Custom filters and deeper analytics",
              "Deeper spending insights",
              "Priority future features",
              "Future CSV exports",
              "Future paycheck and debt payoff planning",
            ]}
          />
        </section>
      </section>
    );
  }

  return <>{children}</>;
}

function PlanCard({
  name,
  price,
  description,
  features,
  highlighted = false,
}: {
  name: string;
  price: string;
  description: string;
  features: string[];
  highlighted?: boolean;
}) {
  return (
    <div
      className={`rounded-[2rem] border p-6 shadow-lg ${
        highlighted
          ? "border-cyan-200 bg-gradient-to-br from-white to-cyan-50"
          : "border-slate-200 bg-white"
      }`}
    >
      {highlighted && (
        <p className="mb-3 inline-flex rounded-full bg-cyan-100 px-3 py-1 text-xs font-black uppercase tracking-widest text-cyan-700">
          Recommended
        </p>
      )}

      <h4 className="text-2xl font-black text-[#061b3d]">{name}</h4>

      <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>

      <p className="mt-5 text-4xl font-black text-[#061b3d]">{price}</p>

      <div className="mt-5 space-y-3">
        {features.map((feature) => (
          <div
            key={feature}
            className={`rounded-2xl p-3 text-sm font-bold leading-6 ${
              highlighted
                ? "bg-white text-slate-700"
                : "bg-slate-50 text-slate-600"
            }`}
          >
            {feature}
          </div>
        ))}
      </div>

      <a
        href="/billing"
        className={`mt-6 inline-flex w-full justify-center rounded-full px-5 py-3 text-sm font-black shadow-lg ${
          highlighted
            ? "bg-gradient-to-r from-[#0b4edb] via-[#00b7c7] to-[#5ce05c] text-white"
            : "border border-slate-200 bg-slate-50 text-[#061b3d]"
        }`}
      >
        {name === "Free" ? "Compare Plans" : `Upgrade to ${name}`}
      </a>
    </div>
  );
}