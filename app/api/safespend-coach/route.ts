import { GoogleGenAI, Type } from "@google/genai";
import { NextResponse } from "next/server";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

const allowedTypes = [
  "Income",
  "Expense",
  "Transfer",
  "Debt",
  "Savings",
  "Event",
];

const allowedCategories = [
  "Income",
  "Groceries",
  "Bills",
  "Shopping",
  "Transportation",
  "Dining",
  "Debt",
  "Savings",
  "Subscriptions",
  "Personal",
  "Other",
];

const allowedIntents = [
  "log_transaction",
  "purchase_check",
  "overspending_help",
  "general_guidance",
];

function getTodayDate() {
  return new Date().toISOString().split("T")[0];
}

function getYesterdayDate() {
  const date = new Date();
  date.setDate(date.getDate() - 1);
  return date.toISOString().split("T")[0];
}

function normalizeIntent(value: unknown) {
  const text = String(value || "").trim();
  return allowedIntents.includes(text) ? text : "general_guidance";
}

function normalizeType(value: unknown) {
  const text = String(value || "").trim();
  return allowedTypes.includes(text) ? text : "Expense";
}

function normalizeCategory(value: unknown) {
  const text = String(value || "").trim();
  return allowedCategories.includes(text) ? text : "Other";
}

function normalizeAmount(value: unknown) {
  const amount = Number(value);
  return Number.isFinite(amount) && amount >= 0 ? amount : 0;
}

function normalizeDate(value: unknown) {
  const text = String(value || "").trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    return text;
  }

  return getTodayDate();
}

function safeText(value: unknown, fallback = "") {
  const text = String(value || "").trim();
  return text || fallback;
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    route: "/api/safespend-coach",
    provider: "gemini",
    message: "SafeSpend Coach API is running. Use POST to send a message.",
  });
}

export async function POST(request: Request) {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: "Missing GEMINI_API_KEY environment variable." },
        { status: 500 }
      );
    }

    const body = await request.json();

    const message = String(body.message || "").trim();

    const dashboardContext = {
      safeToSpend: Number(body.safeToSpend || 0),
      totalIncome: Number(body.totalIncome || 0),
      totalSpent: Number(body.totalSpent || 0),
      filterRange: String(body.filterRange || "week"),
      categoryPressure: Array.isArray(body.categoryPressure)
        ? body.categoryPressure
        : [],
    };

    if (!message) {
      return NextResponse.json(
        { error: "Please enter a message for SafeSpend AI." },
        { status: 400 }
      );
    }

    const today = getTodayDate();
    const yesterday = getYesterdayDate();

    const prompt = `
You are SafeSpend AI, a structured financial assistant and spending coach.

Your job is to:
1. Understand natural language money activity.
2. Detect whether the user is logging a transaction, asking if they can afford something, asking for overspending help, or asking for general guidance.
3. Return clean structured JSON only.
4. Provide helpful, non-judgmental spending coaching.

Today's date is ${today}.
Yesterday's date is ${yesterday}.

User message:
${message}

Dashboard context:
Safe to spend: ${dashboardContext.safeToSpend}
Total income: ${dashboardContext.totalIncome}
Total spent: ${dashboardContext.totalSpent}
Current filter range: ${dashboardContext.filterRange}
Category pressure JSON: ${JSON.stringify(dashboardContext.categoryPressure)}

Rules:
- You are not a financial advisor.
- Do not give investment, legal, tax, or credit repair advice.
- Keep guidance practical, supportive, and spending-awareness focused.
- Amount should always be positive in the transaction object. The app will decide how to save income vs expense.
- Use exact enum values only.
- If the user is asking "Can I afford..." treat it as purchase_check.
- If the user says they overspent, treat it as overspending_help.
- If the user describes a purchase or payment that already happened, treat it as log_transaction.
- If the user describes getting paid, paycheck, deposit, refund, or income, type is Income and category is Income.
- If the user describes paying a credit card, loan, Klarna, Afterpay, or debt, type is Debt and category is Debt.
- If the user describes moving money to savings, type is Savings and category is Savings.
- If the user describes moving money between accounts, type is Transfer.
- Most purchases are Expense.

Category rules:
- Publix, Kroger, Aldi, Instacart, grocery store = Groceries
- Restaurants, coffee, DoorDash, Uber Eats = Dining
- Gas, fuel, Uber, Lyft, parking, bus = Transportation
- Clothes, Victoria's Secret, Amazon shopping, Target general shopping, beauty stores = Shopping
- Power, electricity, rent, water, phone, internet, insurance = Bills
- Netflix, Hulu, Spotify, app subscriptions, memberships = Subscriptions
- Hair, nails, gifts, small personal spending = Personal
- Unknown = Other

Coaching rules:
- safeToSpendImpact should say how the action changes safe-to-spend, for example "-$64", "+$1200", or "-$150 if purchased".
- categoryStatus must be one of: OK, Close, Over Budget, Check First, Not Applicable.
- riskLevel must be one of: Low, Medium, High, Critical.
- recommendation should be direct and helpful.
- nextBestAction should tell the user what to do next.
- For discretionary purchases, be more cautious.
- For essentials, acknowledge necessity while still encouraging awareness.
- For overspending_help, give a recovery plan instead of filling a normal purchase recommendation.
`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            intent: {
              type: Type.STRING,
              enum: allowedIntents,
            },
            shouldAutofillTransaction: {
              type: Type.BOOLEAN,
            },
            transaction: {
              type: Type.OBJECT,
              properties: {
                date: { type: Type.STRING },
                type: {
                  type: Type.STRING,
                  enum: allowedTypes,
                },
                category: {
                  type: Type.STRING,
                  enum: allowedCategories,
                },
                merchant: { type: Type.STRING },
                description: { type: Type.STRING },
                amount: { type: Type.NUMBER },
              },
              required: [
                "date",
                "type",
                "category",
                "merchant",
                "description",
                "amount",
              ],
            },
            coach: {
              type: Type.OBJECT,
              properties: {
                summary: { type: Type.STRING },
                safeToSpendImpact: { type: Type.STRING },
                categoryStatus: {
                  type: Type.STRING,
                  enum: [
                    "OK",
                    "Close",
                    "Over Budget",
                    "Check First",
                    "Not Applicable",
                  ],
                },
                weeklyImpact: { type: Type.STRING },
                riskLevel: {
                  type: Type.STRING,
                  enum: ["Low", "Medium", "High", "Critical"],
                },
                recommendation: { type: Type.STRING },
                nextBestAction: { type: Type.STRING },
              },
              required: [
                "summary",
                "safeToSpendImpact",
                "categoryStatus",
                "weeklyImpact",
                "riskLevel",
                "recommendation",
                "nextBestAction",
              ],
            },
          },
          required: [
            "intent",
            "shouldAutofillTransaction",
            "transaction",
            "coach",
          ],
        },
      },
    });

    const outputText = response.text;

    if (!outputText) {
      return NextResponse.json(
        { error: "SafeSpend AI could not generate a response." },
        { status: 422 }
      );
    }

    const parsed = JSON.parse(outputText);

    const transaction = {
      date: normalizeDate(parsed.transaction?.date),
      type: normalizeType(parsed.transaction?.type),
      category: normalizeCategory(parsed.transaction?.category),
      merchant: safeText(parsed.transaction?.merchant, "Unknown"),
      description: safeText(
        parsed.transaction?.description,
        "SafeSpend AI transaction"
      ),
      amount: normalizeAmount(parsed.transaction?.amount),
    };

    const result = {
      intent: normalizeIntent(parsed.intent),
      shouldAutofillTransaction: Boolean(parsed.shouldAutofillTransaction),
      transaction,
      coach: {
        summary: safeText(parsed.coach?.summary),
        safeToSpendImpact: safeText(parsed.coach?.safeToSpendImpact),
        categoryStatus: safeText(parsed.coach?.categoryStatus, "Check First"),
        weeklyImpact: safeText(parsed.coach?.weeklyImpact),
        riskLevel: safeText(parsed.coach?.riskLevel, "Medium"),
        recommendation: safeText(parsed.coach?.recommendation),
        nextBestAction: safeText(parsed.coach?.nextBestAction),
      },
    };

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("SafeSpend Gemini API error:", error);

    const status = error?.status || error?.statusCode || 500;
    const message =
      error?.message || "Something went wrong while running SafeSpend AI.";

    return NextResponse.json(
      {
        error: message,
        provider: "gemini",
        status,
      },
      { status }
    );
  }
}