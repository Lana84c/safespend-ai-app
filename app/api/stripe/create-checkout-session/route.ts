import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "");

function getPriceId(plan: string) {
  if (plan === "plus") {
    return process.env.NEXT_PUBLIC_STRIPE_PLUS_PRICE_ID;
  }

  if (plan === "pro") {
    return process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID;
  }

  return null;
}

export async function POST(request: Request) {
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json(
        { error: "Missing STRIPE_SECRET_KEY." },
        { status: 500 }
      );
    }

    const body = await request.json();
    const plan = String(body.plan || "").toLowerCase();

    if (!["plus", "pro"].includes(plan)) {
      return NextResponse.json(
        { error: "Invalid plan. Use plus or pro." },
        { status: 400 }
      );
    }

    const priceId = getPriceId(plan);

    if (!priceId) {
      return NextResponse.json(
        { error: `Missing Stripe price ID for ${plan}.` },
        { status: 500 }
      );
    }

    const authHeader = request.headers.get("authorization");

    if (!authHeader) {
      return NextResponse.json(
        { error: "Missing authorization header." },
        { status: 401 }
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || "",
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
      {
        global: {
          headers: {
            Authorization: authHeader,
          },
        },
      }
    );

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: "You must be logged in to subscribe." },
        { status: 401 }
      );
    }

    const { data: existingBilling } = await supabase
      .from("user_billing")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    let stripeCustomerId = existingBilling?.stripe_customer_id || null;

    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: user.email || undefined,
        metadata: {
          user_id: user.id,
        },
      });

      stripeCustomerId = customer.id;

      await supabase.from("user_billing").upsert(
        {
          user_id: user.id,
          stripe_customer_id: stripeCustomerId,
          plan: "free",
          status: "free",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );
    }

    const origin =
      request.headers.get("origin") ||
      process.env.NEXT_PUBLIC_APP_URL ||
      "http://localhost:3000";

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: stripeCustomerId,
      client_reference_id: user.id,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${origin}/billing?success=true`,
      cancel_url: `${origin}/billing?canceled=true`,
      metadata: {
        user_id: user.id,
        plan,
      },
      subscription_data: {
        metadata: {
          user_id: user.id,
          plan,
        },
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    console.error("Create Checkout Session error:", error);

    return NextResponse.json(
      {
        error:
          error?.message || "Unable to create Stripe Checkout session.",
      },
      { status: 500 }
    );
  }
}