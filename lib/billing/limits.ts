import { hasPlanAccess, isPaidStatus, type PlanKey } from "@/lib/billing/plans";

export type UsageEventType =
  | "transaction_created"
  | "budget_created"
  | "bill_created"
  | "coach_request"
  | "report_view"
  | "export_created";

export type UsageLimits = {
  monthlyTransactions: number | null;
  maxBudgets: number | null;
  maxBills: number | null;
  monthlyCoachRequests: number | null;
  monthlyReports: number | null;

  canUseBills: boolean;
  canUseReports: boolean;
  canUseProtectedSafeToSpend: boolean;
  canUseExports: boolean;
  canUseAdvancedReports: boolean;
  canUsePaycheckPlan: boolean;
  canUseDebtPayoffGuidance: boolean;
  canUsePriorityFutureFeatures: boolean;
};

export const PLAN_LIMITS: Record<PlanKey, UsageLimits> = {
  free: {
    monthlyTransactions: 100,
    maxBudgets: 3,
    maxBills: 10,
    monthlyCoachRequests: 10,
    monthlyReports: 0,

    canUseBills: true,
    canUseReports: false,
    canUseProtectedSafeToSpend: false,
    canUseExports: false,
    canUseAdvancedReports: false,
    canUsePaycheckPlan: false,
    canUseDebtPayoffGuidance: false,
    canUsePriorityFutureFeatures: false,
  },

  plus: {
    monthlyTransactions: null,
    maxBudgets: null,
    maxBills: 50,
    monthlyCoachRequests: 100,
    monthlyReports: 20,

    canUseBills: true,
    canUseReports: true,
    canUseProtectedSafeToSpend: true,
    canUseExports: false,
    canUseAdvancedReports: false,
    canUsePaycheckPlan: false,
    canUseDebtPayoffGuidance: false,
    canUsePriorityFutureFeatures: false,
  },

  pro: {
    monthlyTransactions: null,
    maxBudgets: null,
    maxBills: null,
    monthlyCoachRequests: null,
    monthlyReports: null,

    canUseBills: true,
    canUseReports: true,
    canUseProtectedSafeToSpend: true,
    canUseExports: true,
    canUseAdvancedReports: true,
    canUsePaycheckPlan: true,
    canUseDebtPayoffGuidance: true,
    canUsePriorityFutureFeatures: true,
  },
};

export function getEffectivePlan({
  plan,
  status,
}: {
  plan?: string | null;
  status?: string | null;
}): PlanKey {
  if (!isPaidStatus(status)) return "free";

  if (plan === "pro") return "pro";
  if (plan === "plus") return "plus";

  return "free";
}

export function getPlanLimits({
  plan,
  status,
}: {
  plan?: string | null;
  status?: string | null;
}) {
  const effectivePlan = getEffectivePlan({ plan, status });
  return PLAN_LIMITS[effectivePlan];
}

export function canAccessProFeature({
  plan,
  status,
}: {
  plan?: string | null;
  status?: string | null;
}) {
  return hasPlanAccess({
    currentPlan: plan,
    currentStatus: status,
    requiredPlan: "pro",
  });
}