import { headers } from "next/headers";
import { fulfilCheckoutSession, webhookSecrets } from "@/lib/checkout";
import { stripe } from "@/lib/stripe";
import type Stripe from "stripe";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const signature = (await headers()).get("stripe-signature");
  const secrets = webhookSecrets();
  if (!signature || secrets.length === 0)
    return new Response("Webhook not configured", { status: 400 });

  const payload = await request.text();
  let event: Stripe.Event | null = null;
  for (const secret of secrets) {
    try {
      event = stripe().webhooks.constructEvent(payload, signature, secret);
      break;
    } catch {
      continue;
    }
  }
  if (!event) {
    console.error(
      `[stripe] signature verification failed against ${secrets.length} configured secret(s); ` +
        "STRIPE_WEBHOOK_SECRET does not match the endpoint that sent this event " +
        "(live and test endpoints have different signing secrets)",
    );
    return new Response("Invalid signature", { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    await fulfilCheckoutSession(event.data.object);
  }

  return Response.json({ received: true });
}
