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

          <p className="mt-5 max-w-2xl text-sm leading-6 text-white/80">
            Your current plan is {formatPlanLabel(currentPlan)} with status{" "}
            {formatPlanLabel(currentStatus)}. Upgrade to unlock this feature and
            keep using SafeSpend as a full spending control system.
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

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <FeatureCard
            title="Free"
            description="Dashboard, transactions, and basic budgets."
          />
          <FeatureCard
            title="Plus"
            description="Bills, protected safe-to-spend, reports, and full AI Coach."
            highlighted
          />
          <FeatureCard
            title="Pro"
            description="Advanced reports, exports, and future premium tools."
          />
        </div>
      </section>
    );
  }

  return <>{children}</>;
}

function FeatureCard({
  title,
  description,
  highlighted = false,
}: {
  title: string;
  description: string;
  highlighted?: boolean;
}) {
  return (
    <div
      className={`rounded-3xl border p-5 ${
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
        {title}
      </p>
      <p
        className={`mt-2 text-sm leading-6 ${
          highlighted ? "text-cyan-700" : "text-slate-500"
        }`}
      >
        {description}
      </p>
    </div>
  );
}