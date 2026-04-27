import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";

type SafeSpendIntent =
  | "log_transaction"
  | "purchase_check"
  | "overspending_help"
  | "general_guidance";

type TransactionType =
  | "Income"
  | "Expense"
  | "Transfer"
  | "Debt"
  | "Savings"
  | "Event";

type CoachRequestBody = {
  message?: string;
  safeToSpend?: number;
  totalIncome?: number;
  totalSpent?: number;
  filterRange?: "week" | "month" | "all";
  categoryPressure?: {
    category: string;
    spent: number;
    limit: number;
    percentUsed: number;
    status: string;
  }[];
  upcomingBills?: {
    bill_name?: string;
    amount?: number;
    due_date?: string;
  }[];
  dueSoonBillsTotal?: number;
  userSettings?: any;
  plan?: string;
  coachUsage?: {
    used?: number;
    limit?: number | null;
    remaining?: number | null;
  };
};

type SafeSpendCoachResponse = {
  intent: SafeSpendIntent;
  shouldAutofillTransaction: boolean;
  transaction: {
    date: string;
    type: TransactionType;
    category: string;
    merchant: string;
    description: string;
    amount: number;
  };
  coach: {
    summary: string;
    safeToSpendImpact: string;
    categoryStatus: string;
    weeklyImpact: string;
    riskLevel: string;
    recommendation: string;
    nextBestAction: string;
  };
};

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || "",
});

const GEMINI_MODEL_CHAIN = [
  process.env.GEMINI_MODEL_PRIMARY || "gemini-2.5-flash-lite",
  process.env.GEMINI_MODEL_FALLBACK || "gemini-2.5-flash",
]
  .map((model) => model.trim())
  .filter(Boolean)
  .filter((model, index, array) => array.indexOf(model) === index);

function getTodayDate() {
  return new Date().toISOString().split("T")[0];
}

function getYesterdayDate() {
  const date = new Date();
  date.setDate(date.getDate() - 1);
  return date.toISOString().split("T")[0];
}

function money(value: number) {
  return Number(value || 0).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getErrorStatus(error: any) {
  return Number(error?.status || error?.code || error?.response?.status || 0);
}

function isRetryableGeminiError(error: any) {
  const status = getErrorStatus(error);

  return (
    status === 429 ||
    status === 500 ||
    status === 502 ||
    status === 503 ||
    status === 504 ||
    String(error?.message || "").toLowerCase().includes("high demand") ||
    String(error?.message || "").toLowerCase().includes("unavailable")
  );
}

function cleanJsonText(text: string) {
  return String(text || "")
    .trim()
    .replace(/^```json/i, "")
    .replace(/^```/i, "")
    .replace(/```$/i, "")
    .trim();
}

function parseJsonResponse(text: string): SafeSpendCoachResponse {
  const cleaned = cleanJsonText(text);

  try {
    return JSON.parse(cleaned);
  } catch {
    const firstBrace = cleaned.indexOf("{");
    const lastBrace = cleaned.lastIndexOf("}");

    if (firstBrace >= 0 && lastBrace > firstBrace) {
      return JSON.parse(cleaned.slice(firstBrace, lastBrace + 1));
    }

    throw new Error("Gemini returned a non-JSON response.");
  }
}

function extractAmount(message: string) {
  const match = message.match(/(?:\$|about|around|maybe)?\s*(\d+(?:\.\d{1,2})?)/i);
  return match ? Number(match[1]) : 0;
}

function extractMerchant(message: string) {
  const cleaned = message
    .replace(/\$/g, "")
    .replace(/\b(today|yesterday|this week|this month)\b/gi, "")
    .trim();

  const patterns = [
    /\bat\s+([a-z0-9'&.\-\s]+)$/i,
    /\bfrom\s+([a-z0-9'&.\-\s]+)$/i,
    /\btoward\s+([a-z0-9'&.\-\s]+)$/i,
    /\bon\s+([a-z0-9'&.\-\s]+)$/i,
  ];

  for (const pattern of patterns) {
    const match = cleaned.match(pattern);
    if (match?.[1]) {
      return match[1].trim().replace(/[.!?]+$/, "");
    }
  }

  return "";
}

function categorize(message: string, merchant: string): string {
  const text = `${message} ${merchant}`.toLowerCase();

  if (text.includes("paid") && text.includes("credit")) return "Debt";
  if (text.includes("credit card")) return "Debt";
  if (text.includes("debt")) return "Debt";
  if (text.includes("paycheck") || text.includes("got paid") || text.includes("deposit")) {
    return "Income";
  }
  if (text.includes("publix") || text.includes("kroger") || text.includes("grocery")) {
    return "Groceries";
  }
  if (text.includes("clothes") || text.includes("victoria") || text.includes("shopping")) {
    return "Shopping";
  }
  if (text.includes("gas") || text.includes("shell") || text.includes("transport")) {
    return "Transportation";
  }
  if (text.includes("rent") || text.includes("power") || text.includes("electric") || text.includes("bill")) {
    return "Bills";
  }
  if (text.includes("restaurant") || text.includes("dining") || text.includes("food")) {
    return "Dining";
  }
  if (text.includes("save") || text.includes("savings")) return "Savings";
  if (text.includes("subscription") || text.includes("netflix") || text.includes("openai")) {
    return "Subscriptions";
  }

  return "Other";
}

function detectIntent(message: string): SafeSpendIntent {
  const text = message.toLowerCase();

  if (
    text.includes("can i") ||
    text.includes("can afford") ||
    text.includes("afford") ||
    text.includes("should i buy") ||
    text.includes("can i spend")
  ) {
    return "purchase_check";
  }

  if (
    text.includes("overspent") ||
    text.includes("over spent") ||
    text.includes("over budget") ||
    text.includes("spent too much")
  ) {
    return "overspending_help";
  }

  if (
    text.includes("spent") ||
    text.includes("paid") ||
    text.includes("got paid") ||
    text.includes("income") ||
    text.includes("deposit")
  ) {
    return "log_transaction";
  }

  return "general_guidance";
}

function detectTransactionType(message: string, intent: SafeSpendIntent): TransactionType {
  const text = message.toLowerCase();

  if (text.includes("got paid") || text.includes("paycheck") || text.includes("deposit")) {
    return "Income";
  }

  if (text.includes("paid") && text.includes("credit")) {
    return "Debt";
  }

  if (text.includes("save") || text.includes("savings")) {
    return "Savings";
  }

  if (text.includes("transfer") || text.includes("zelle") || text.includes("venmo")) {
    return "Transfer";
  }

  if (intent === "purchase_check") {
    return "Expense";
  }

  return "Expense";
}

function getRiskLevel(safeToSpend: number) {
  if (safeToSpend <= 0) return "Critical";
  if (safeToSpend < 100) return "High";
  if (safeToSpend < 250) return "Medium";
  return "Low";
}

function findCategoryStatus(
  category: string,
  categoryPressure: CoachRequestBody["categoryPressure"]
) {
  const match = categoryPressure?.find(
    (item) => item.category.toLowerCase() === category.toLowerCase()
  );

  return match?.status || "OK";
}

function buildLocalFallbackResponse(body: CoachRequestBody): SafeSpendCoachResponse {
  const message = String(body.message || "");
  const safeToSpend = Number(body.safeToSpend || 0);
  const amount = extractAmount(message);
  const intent = detectIntent(message);
  const merchant = extractMerchant(message);
  const type = detectTransactionType(message, intent);
  const category = categorize(message, merchant);
  const date = message.toLowerCase().includes("yesterday")
    ? getYesterdayDate()
    : getTodayDate();

  const signedImpact =
    type === "Income"
      ? amount
      : intent === "purchase_check"
        ? -Math.abs(amount)
        : -Math.abs(amount);

  const projectedSafeToSpend = safeToSpend + signedImpact;
  const riskLevel = getRiskLevel(projectedSafeToSpend);
  const categoryStatus = findCategoryStatus(category, body.categoryPressure);

  const shouldAutofillTransaction =
    intent === "log_transaction" && amount > 0 && type !== "Transfer";

  let summary = "SafeSpend is using a backup response because the AI model is temporarily unavailable.";

  if (intent === "purchase_check") {
    summary =
      amount > 0
        ? `This purchase would reduce your safe-to-spend by ${money(amount)}. Your projected safe-to-spend would be ${money(projectedSafeToSpend)}.`
        : "I need the purchase amount before I can give a useful spending recommendation.";
  }

  if (intent === "log_transaction") {
    summary =
      amount > 0
        ? `I detected a ${type.toLowerCase()} entry for ${money(amount)}${merchant ? ` connected to ${merchant}` : ""}. Review the filled transaction before saving it.`
        : "I detected that you may be trying to log money activity, but I could not find a clear amount.";
  }

  if (intent === "overspending_help") {
    summary =
      "You are asking for overspending recovery help. The safest move is to pause non-essential spending, protect bills first, and reduce flexible categories until the next income event.";
  }

  const recommendation =
    riskLevel === "Critical"
      ? "Pause non-essential spending until income or bills are reconciled."
      : riskLevel === "High"
        ? "Only spend on essentials until your safe-to-spend improves."
        : riskLevel === "Medium"
          ? "Spend carefully and avoid flexible purchases unless they are necessary."
          : "This looks manageable, but keep logging transactions so SafeSpend stays accurate.";

  return {
    intent,
    shouldAutofillTransaction,
    transaction: {
      date,
      type,
      category,
      merchant: merchant || (type === "Income" ? "Income" : ""),
      description:
        intent === "purchase_check"
          ? "Purchase check"
          : type === "Income"
            ? "Income received"
            : category === "Debt"
              ? "Debt payment"
              : "Money activity",
      amount,
    },
    coach: {
      summary,
      safeToSpendImpact:
        amount > 0
          ? type === "Income"
            ? `+${money(amount)}`
            : `-${money(amount)}`
          : "$0",
      categoryStatus,
      weeklyImpact:
        amount > 0
          ? `Projected safe-to-spend after this activity: ${money(projectedSafeToSpend)}.`
          : "No clear amount was detected, so weekly impact could not be calculated.",
      riskLevel,
      recommendation,
      nextBestAction:
        intent === "log_transaction" && amount > 0
          ? "Review the detected transaction and save it if it is correct."
          : intent === "purchase_check"
            ? riskLevel === "Low"
              ? "You can consider it, but check upcoming bills first."
              : "Wait or reduce the purchase amount."
            : "Review your bills, pause flexible spending, and log any missing transactions.",
    },
  };
}

function buildPrompt(body: CoachRequestBody) {
  return `
You are SafeSpend AI, a calm spending coach and transaction parser.

Return ONLY valid JSON. Do not use markdown. Do not add commentary outside JSON.

User message:
${body.message || ""}

Current financial context:
- Safe-to-spend: ${body.safeToSpend ?? 0}
- Total income: ${body.totalIncome ?? 0}
- Total spent: ${body.totalSpent ?? 0}
- Date range: ${body.filterRange || "week"}
- User plan: ${body.plan || "free"}
- Coach usage: ${JSON.stringify(body.coachUsage || null)}
- Due soon bills total: ${body.dueSoonBillsTotal ?? 0}
- Upcoming bills: ${JSON.stringify(body.upcomingBills || [])}
- Category pressure: ${JSON.stringify(body.categoryPressure || [])}
- User settings: ${JSON.stringify(body.userSettings || null)}

Rules:
- If the user reports spending, income, debt payment, savings, or a bill payment, intent should be "log_transaction".
- If the user asks whether they can buy/spend/afford something, intent should be "purchase_check".
- If the user says they overspent or are over budget, intent should be "overspending_help".
- Otherwise use "general_guidance".
- Amount should be a positive number only.
- Expense/Debt/Savings amounts are positive in the JSON transaction object. The frontend decides how to save the sign.
- Use categories only from: Income, Groceries, Bills, Shopping, Transportation, Dining, Debt, Savings, Subscriptions, Personal, Other.
- Merchant should be the business/person when clear.
- Use today's date ${getTodayDate()} unless the message clearly says yesterday, then use ${getYesterdayDate()}.
- Keep the tone supportive, direct, clear, and non-shaming.

Required JSON shape:
{
  "intent": "log_transaction" | "purchase_check" | "overspending_help" | "general_guidance",
  "shouldAutofillTransaction": boolean,
  "transaction": {
    "date": "YYYY-MM-DD",
    "type": "Income" | "Expense" | "Transfer" | "Debt" | "Savings" | "Event",
    "category": "Income" | "Groceries" | "Bills" | "Shopping" | "Transportation" | "Dining" | "Debt" | "Savings" | "Subscriptions" | "Personal" | "Other",
    "merchant": "string",
    "description": "string",
    "amount": number
  },
  "coach": {
    "summary": "string",
    "safeToSpendImpact": "string",
    "categoryStatus": "OK" | "Close" | "Over Budget" | "Unknown",
    "weeklyImpact": "string",
    "riskLevel": "Low" | "Medium" | "High" | "Critical",
    "recommendation": "string",
    "nextBestAction": "string"
  }
}
`;
}

async function generateWithGemini(prompt: string) {
  let lastError: any = null;

  for (const model of GEMINI_MODEL_CHAIN) {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: prompt,
          config: {
            responseMimeType: "application/json",
            temperature: 0.2,
          },
        });

        const text = response.text || "";
        const parsed = parseJsonResponse(text);

        return {
          parsed,
          model,
        };
      } catch (error: any) {
        lastError = error;

        console.error(
          `SafeSpend Gemini API error on ${model}, attempt ${attempt + 1}:`,
          error
        );

        if (!isRetryableGeminiError(error)) {
          throw error;
        }

        await sleep(attempt === 0 ? 350 : 800);
      }
    }
  }

  throw lastError;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CoachRequestBody;

    if (!body.message || !String(body.message).trim()) {
      return NextResponse.json(
        { error: "Message is required." },
        { status: 400 }
      );
    }

    if (!process.env.GEMINI_API_KEY) {
      console.warn("Missing GEMINI_API_KEY. Returning local fallback response.");
      return NextResponse.json(buildLocalFallbackResponse(body));
    }

    const prompt = buildPrompt(body);

    try {
      const { parsed, model } = await generateWithGemini(prompt);

      return NextResponse.json({
        ...parsed,
        meta: {
          model,
          fallback: false,
        },
      });
    } catch (error: any) {
      const status = getErrorStatus(error);

      if (isRetryableGeminiError(error)) {
        console.warn(
          `Gemini unavailable after retries. Returning local SafeSpend fallback. Status: ${status}`
        );

        return NextResponse.json({
          ...buildLocalFallbackResponse(body),
          meta: {
            model: "local_fallback",
            fallback: true,
            reason: "Gemini temporarily unavailable or rate limited.",
          },
        });
      }

      console.error("SafeSpend Gemini non-retryable API error:", error);

      return NextResponse.json(
        {
          error:
            error?.message ||
            "SafeSpend Coach could not process this request.",
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error("SafeSpend Coach route error:", error);

    return NextResponse.json(
      {
        error: error?.message || "SafeSpend Coach route failed.",
      },
      { status: 500 }
    );
  }
}