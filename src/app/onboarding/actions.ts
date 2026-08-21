"use server";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { sellers } from "@/db/schema";
import { requireSeller } from "@/lib/session";
import { isStripeConfigured, stripe } from "@/lib/stripe";
import { appUrl } from "@/lib/utils";

/** Creates (or reuses) the seller's Stripe Express account and returns an onboarding link. */
export async function startStripeOnboarding(): Promise<{ error?: string }> {
  const seller = await requireSeller();
  if (!isStripeConfigured()) {
    return { error: "Stripe is not configured on this deployment yet." };
  }

  let accountId = seller.stripeAccountId;
  if (!accountId) {
    const account = await stripe().accounts.create({
      type: "express",
      email: seller.email,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      business_profile: { name: seller.name, url: appUrl(`/${seller.handle}`) },
    });
    accountId = account.id;
    await db.update(sellers).set({ stripeAccountId: accountId }).where(eq(sellers.id, seller.id));
  }

  const link = await stripe().accountLinks.create({
    account: accountId,
    refresh_url: appUrl("/onboarding"),
    return_url: appUrl("/onboarding/return"),
    type: "account_onboarding",
  });

  redirect(link.url);
}

/** Reads the live Stripe account state and stores whether the seller can accept charges. */
export async function syncStripeStatus(): Promise<boolean> {
  const seller = await requireSeller();
  if (!seller.stripeAccountId || !isStripeConfigured()) return false;

  const account = await stripe().accounts.retrieve(seller.stripeAccountId);
  const connected = Boolean(account.charges_enabled && account.details_submitted);
  await db
    .update(sellers)
    .set({ stripeConnected: connected, stripeEmail: account.email ?? null })
    .where(eq(sellers.id, seller.id));
  return connected;
}
