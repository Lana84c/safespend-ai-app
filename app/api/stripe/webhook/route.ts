import { NextResponse } from "next/server";
import Stripe from "stripe";
import { supabaseAdmin } from "@/lib/supabase/admin";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "");

function planFromPriceId(priceId?: string | null) {
  if (!priceId) return "free";

  if (priceId === process.env.NEXT_PUBLIC_STRIPE_PLUS_PRICE_ID) {
    return "plus";
  }

  if (priceId === process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID) {
    return "pro";
  }

  return "free";
}

async function findUserIdByCustomer(stripeCustomerId: string) {
  const { data, error } = await supabaseAdmin
    .from("user_billing")
    .select("user_id")
    .eq("stripe_customer_id", stripeCustomerId)
    .maybeSingle();

  if (error) {
    console.error("Find user by Stripe customer error:", error);
    return null;
  }

  return data?.user_id || null;
}

async function syncSubscription(
  subscription: Stripe.Subscription,
  overrideUserId?: string | null
) {
  const stripeCustomerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer.id;

  const priceId = subscription.items.data[0]?.price?.id || null;
  const plan = planFromPriceId(priceId);

  const userId =
    overrideUserId ||
    subscription.metadata?.user_id ||
    (await findUserIdByCustomer(stripeCustomerId));

  if (!userId) {
    console.error("No user_id found for subscription:", subscription.id);
    return;
  }

  const currentPeriodEnd = (subscription as any).current_period_end
    ? new Date((subscription as any).current_period_end * 1000).toISOString()
    : null;

  const { error } = await supabaseAdmin.from("user_billing").upsert(
    {
      user_id: userId,
      stripe_customer_id: stripeCustomerId,
      stripe_subscription_id: subscription.id,
      plan,
      status: subscription.status,
      current_period_end: currentPeriodEnd,
      cancel_at_period_end: subscription.cancel_at_period_end || false,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );

  if (error) {
    console.error("Sync subscription Supabase error:", error);
  }
}

async function markSubscriptionCanceled(subscription: Stripe.Subscription) {
  const stripeCustomerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer.id;

  const userId =
    subscription.metadata?.user_id ||
    (await findUserIdByCustomer(stripeCustomerId));

  if (!userId) {
    console.error("No user_id found for canceled subscription:", subscription.id);
    return;
  }

  const { error } = await supabaseAdmin
    .from("user_billing")
    .update({
      plan: "free",
      status: "canceled",
      cancel_at_period_end: false,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);

  if (error) {
    console.error("Cancel subscription Supabase error:", error);
  }
}

export async function POST(request: Request) {
  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json(
      { error: "Missing STRIPE_SECRET_KEY." },
      { status: 500 }
    );
  }

  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json(
      { error: "Missing STRIPE_WEBHOOK_SECRET." },
      { status: 500 }
    );
  }

  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      { error: "Missing Stripe signature." },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    const rawBody = await request.text();

    event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (error: any) {
    console.error("Stripe webhook signature verification failed:", error);

    return NextResponse.json(
      { error: `Webhook Error: ${error.message}` },
      { status: 400 }
    );
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;

        const userId =
          session.client_reference_id || session.metadata?.user_id || null;

        const stripeCustomerId =
          typeof session.customer === "string" ? session.customer : null;

        const stripeSubscriptionId =
          typeof session.subscription === "string"
            ? session.subscription
            : null;

        if (userId && stripeCustomerId) {
          await supabaseAdmin.from("user_billing").upsert(
            {
              user_id: userId,
              stripe_customer_id: stripeCustomerId,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "user_id" }
          );
        }

        if (stripeSubscriptionId) {
          const subscription =
            await stripe.subscriptions.retrieve(stripeSubscriptionId);

          await syncSubscription(subscription, userId);
        }

        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        await syncSubscription(subscription);
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await markSubscriptionCanceled(subscription);
        break;
      }

      case "invoice.payment_succeeded":
      case "invoice.payment_failed": {
        const invoice = event.data.object as any;
        const subscriptionId = invoice.subscription;

        if (subscriptionId && typeof subscriptionId === "string") {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          await syncSubscription(subscription);
        }

        break;
      }

      default:
        break;
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error("Stripe webhook processing error:", error);

    return NextResponse.json(
      {
        error: error?.message || "Webhook processing failed.",
      },
      { status: 500 }
    );
  }
}