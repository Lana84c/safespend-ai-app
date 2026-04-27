export type PlanKey = "free" | "plus" | "pro";

export type BillingStatus =
  | "free"
  | "active"
  | "trialing"
  | "past_due"
  | "canceled"
  | "incomplete"
  | "incomplete_expired"
  | "unpaid";

const planRank: Record<PlanKey, number> = {
  free: 0,
  plus: 1,
  pro: 2,
};

export function isPaidStatus(status?: string | null) {
  return status === "active" || status === "trialing";
}

export function hasPlanAccess({
  currentPlan,
  currentStatus,
  requiredPlan,
}: {
  currentPlan?: string | null;
  currentStatus?: string | null;
  requiredPlan: PlanKey;
}) {
  if (requiredPlan === "free") return true;

  if (!isPaidStatus(currentStatus)) return false;

  const userPlan = (currentPlan || "free") as PlanKey;

  return planRank[userPlan] >= planRank[requiredPlan];
}

export function formatPlanLabel(plan?: string | null) {
  if (!plan) return "Free";

  return plan
    .replaceAll("_", " ")
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}