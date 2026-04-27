import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "");

export async function POST(request: Request) {
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json(
        { error: "Missing STRIPE_SECRET_KEY." },
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
        { error: "You must be logged in to manage billing." },
        { status: 401 }
      );
    }

    const { data: billing, error: billingError } = await supabase
      .from("user_billing")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (billingError) {
      return NextResponse.json(
        { error: billingError.message },
        { status: 500 }
      );
    }

    if (!billing?.stripe_customer_id) {
      return NextResponse.json(
        { error: "No Stripe customer found for this account." },
        { status: 400 }
      );
    }

    const origin =
      request.headers.get("origin") ||
      process.env.NEXT_PUBLIC_APP_URL ||
      "http://localhost:3000";

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: billing.stripe_customer_id,
      return_url: `${origin}/billing`,
    });

    return NextResponse.json({ url: portalSession.url });
  } catch (error: any) {
    console.error("Create Portal Session error:", error);

    return NextResponse.json(
      {
        error:
          error?.message || "Unable to create Stripe billing portal session.",
      },
      { status: 500 }
    );
  }
}