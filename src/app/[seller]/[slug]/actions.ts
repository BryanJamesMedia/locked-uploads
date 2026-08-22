"use server";

import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { listings, sellers } from "@/db/schema";
import { platformFeeCents } from "@/lib/plans";
import { completePurchase } from "@/lib/purchase";
import { isStripeConfigured, stripe } from "@/lib/stripe";
import { appUrl, listingPath } from "@/lib/utils";

const emailSchema = z.string().trim().toLowerCase().email("Enter a valid email address");

/** Test checkout exists only for deployments without Stripe keys. */
function testCheckoutEnabled(): boolean {
  return !isStripeConfigured() && process.env.ALLOW_TEST_CHECKOUT === "1";
}

export async function startCheckout(
  slug: string,
  formData: FormData,
): Promise<{ error: string } | void> {
  const parsedEmail = emailSchema.safeParse(formData.get("email"));
  if (!parsedEmail.success) return { error: parsedEmail.error.issues[0].message };
  const buyerEmail = parsedEmail.data;

  const [row] = await db
    .select({ listing: listings, seller: sellers })
    .from(listings)
    .innerJoin(sellers, eq(sellers.id, listings.sellerId))
    .where(and(eq(listings.slug, slug), eq(listings.draft, false)))
    .limit(1);
  if (!row) return { error: "This listing is no longer available." };

  const { listing, seller } = row;
  if (listing.status === "sold") return { error: "This listing has already been sold." };

  const amountCents = Math.round(Number(listing.price) * 100);
  const feeCents = platformFeeCents(amountCents, seller.plan);

  if (testCheckoutEnabled()) {
    const result = await completePurchase({
      listingId: listing.id,
      buyerEmail,
      amountCents,
      feeCents,
      stripeSessionId: null,
    });
    if (!result) return { error: "Could not complete the purchase." };
    redirect(`/success?token=${result.token}`);
  }

  if (!seller.stripeConnected || !seller.stripeAccountId) {
    return { error: "This seller is not accepting payments yet." };
  }

  const session = await stripe().checkout.sessions.create({
    mode: "payment",
    customer_email: buyerEmail,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: amountCents,
          product_data: {
            name: listing.title,
            description: `${listing.fileCount} file${listing.fileCount === 1 ? "" : "s"} from ${seller.name}`,
          },
        },
      },
    ],
    payment_intent_data: {
      application_fee_amount: feeCents,
      transfer_data: { destination: seller.stripeAccountId },
    },
    metadata: { listingId: listing.id, buyerEmail, feeCents: String(feeCents) },
    success_url: appUrl("/success?session_id={CHECKOUT_SESSION_ID}"),
    cancel_url: appUrl(listingPath(seller.publicId, listing.slug)),
  });

  if (!session.url) return { error: "Could not start checkout." };
  redirect(session.url);
}
