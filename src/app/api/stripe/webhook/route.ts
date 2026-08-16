import { headers } from "next/headers";
import { completePurchase } from "@/lib/purchase";
import { stripe } from "@/lib/stripe";
import type Stripe from "stripe";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const signature = (await headers()).get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!signature || !secret) return new Response("Webhook not configured", { status: 400 });

  const payload = await request.text();
  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(payload, signature, secret);
  } catch (error) {
    console.error("[stripe] signature verification failed", error);
    return new Response("Invalid signature", { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const listingId = session.metadata?.listingId;
    const buyerEmail =
      session.metadata?.buyerEmail ?? session.customer_details?.email ?? session.customer_email;
    if (listingId && buyerEmail) {
      await completePurchase({
        listingId,
        buyerEmail,
        amountCents: session.amount_total ?? 0,
        feeCents: Number(session.metadata?.feeCents ?? 0),
        stripeSessionId: session.id,
      });
    }
  }

  return Response.json({ received: true });
}
