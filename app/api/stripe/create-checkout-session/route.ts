import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getSupabaseServer } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase-admin";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripePriceMonthly = process.env.STRIPE_PRICE_MONTHLY;
const stripeCouponFirstMonth = process.env.STRIPE_COUPON_FIRST_MONTH;
const stripeCouponOwnerFree = process.env.STRIPE_COUPON_OWNER_FREE;
const ownerEmail = process.env.OWNER_EMAIL?.trim().toLowerCase();
const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "");

if (!stripeSecretKey) {
  throw new Error("Falta STRIPE_SECRET_KEY");
}

if (!stripePriceMonthly) {
  throw new Error("Falta STRIPE_PRICE_MONTHLY");
}

if (!stripeCouponFirstMonth) {
  throw new Error("Falta STRIPE_COUPON_FIRST_MONTH");
}

if (!stripeCouponOwnerFree) {
  throw new Error("Falta STRIPE_COUPON_OWNER_FREE");
}

if (!ownerEmail) {
  throw new Error("Falta OWNER_EMAIL");
}

if (!appUrl) {
  throw new Error("Falta NEXT_PUBLIC_APP_URL");
}

const stripe = new Stripe(stripeSecretKey);

type SubscriptionRow = {
  stripe_customer_id: string | null;
};

function normalizeEmail(value: string | null | undefined) {
  return value?.trim().toLowerCase() ?? "";
}

export async function POST() {
  try {
    const supabase = await getSupabaseServer();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: "Debes iniciar sesión para suscribirte." },
        { status: 401 }
      );
    }

    const { data: existingSubscription, error: existingSubscriptionError } =
      await supabase
        .from("subscriptions")
        .select("stripe_customer_id")
        .eq("user_id", user.id)
        .maybeSingle<SubscriptionRow>();

    if (existingSubscriptionError) {
      return NextResponse.json(
        { error: "No se pudo preparar la suscripción." },
        { status: 500 }
      );
    }

    let stripeCustomerId = existingSubscription?.stripe_customer_id ?? null;

    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: user.email ?? undefined,
        metadata: {
          user_id: user.id,
          app: "autonomoagenda",
        },
      });

      stripeCustomerId = customer.id;

      const { error: upsertError } = await supabaseAdmin
        .from("subscriptions")
        .upsert(
          {
            user_id: user.id,
            stripe_customer_id: stripeCustomerId,
            plan: "autonomoagenda_monthly",
            status: "incomplete",
          },
          {
            onConflict: "user_id",
          }
        );

      if (upsertError) {
        return NextResponse.json(
          { error: "No se pudo guardar el cliente de Stripe." },
          { status: 500 }
        );
      }
    }

    const userEmail = normalizeEmail(user.email);
    const isOwner = userEmail === ownerEmail;

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: stripeCustomerId,
      client_reference_id: user.id,
      payment_method_collection: "always",
      billing_address_collection: "auto",
      allow_promotion_codes: true,
      line_items: [{ price: stripePriceMonthly, quantity: 1 }],
      discounts: [
        {
          coupon: isOwner ? stripeCouponOwnerFree : stripeCouponFirstMonth,
        },
      ],
      metadata: {
        user_id: user.id,
        plan: "autonomoagenda_monthly",
        applied_discount: isOwner ? "owner_free" : "first_month",
      },
      subscription_data: {
        metadata: {
          user_id: user.id,
          plan: "autonomoagenda_monthly",
          applied_discount: isOwner ? "owner_free" : "first_month",
        },
      },
      success_url: `${appUrl}/cuenta?checkout=success`,
      cancel_url: `${appUrl}/cuenta?checkout=cancelled`,
    });

    if (!session.url) {
      return NextResponse.json(
        { error: "Stripe no devolvió URL de pago." },
        { status: 500 }
      );
    }

    return NextResponse.json({ url: session.url });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "No se pudo crear la sesión de pago.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
