import type Stripe from "stripe";
import { completePurchase } from "./purchase";
import { isStripeConfigured, stripe } from "./stripe";

/**
 * Signing secrets the webhook accepts. Several may be configured (comma or
 * whitespace separated) so live and test endpoints can share one deployment.
 */
export function webhookSecrets(): string[] {
  return (process.env.STRIPE_WEBHOOK_SECRET ?? "")
    .split(/[,\s]+/)
    .map((value) => value.trim().replace(/^["']|["']$/g, ""))
    .filter((value) => value.length > 0);
}

/** Records the sale for a paid Checkout Session. Safe to call repeatedly. */
export async function fulfilCheckoutSession(
  session: Stripe.Checkout.Session,
): Promise<{ token: string } | null> {
  if (session.payment_status === "unpaid") return null;
  const listingId = session.metadata?.listingId;
  const buyerEmail =
    session.metadata?.buyerEmail ?? session.customer_details?.email ?? session.customer_email;
  if (!listingId || !buyerEmail) return null;

  return completePurchase({
    listingId,
    buyerEmail,
    amountCents: session.amount_total ?? 0,
    feeCents: Number(session.metadata?.feeCents ?? 0),
    stripeSessionId: session.id,
  });
}

/**
 * Fallback for the success page: fulfils straight from Stripe when the webhook
 * has not delivered the sale (misconfigured secret, retry backlog, outage).
 */
export async function fulfilSessionById(sessionId: string): Promise<{ token: string } | null> {
  if (!isStripeConfigured()) return null;
  try {
    const session = await stripe().checkout.sessions.retrieve(sessionId);
    return await fulfilCheckoutSession(session);
  } catch (error) {
    console.error(`[stripe] could not fulfil session ${sessionId} directly`, error);
    return null;
  }
}
