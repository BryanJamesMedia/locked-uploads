import { eq, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db } from "@/db";
import { listings, notifications, sales, sellers } from "@/db/schema";
import { sendPurchaseEmail, sendSaleEmail } from "./email";
import { TOKEN_TTL_MS } from "./plans";
import { appUrl, formatCurrency } from "./utils";

export function newDownloadToken(): string {
  return nanoid(32);
}

/**
 * Records a completed purchase: sale row with a fresh download token, seller
 * balance credit, listing counters, notification and both emails.
 */
export async function completePurchase(args: {
  listingId: string;
  buyerEmail: string;
  amountCents: number;
  feeCents: number;
  stripeSessionId: string | null;
}): Promise<{ token: string } | null> {
  if (args.stripeSessionId) {
    const existing = await db
      .select({ downloadToken: sales.downloadToken })
      .from(sales)
      .where(eq(sales.stripeSessionId, args.stripeSessionId))
      .limit(1);
    if (existing.length > 0) return { token: existing[0].downloadToken };
  }

  const [listing] = await db.select().from(listings).where(eq(listings.id, args.listingId)).limit(1);
  if (!listing) return null;
  const [seller] = await db.select().from(sellers).where(eq(sellers.id, listing.sellerId)).limit(1);
  if (!seller) return null;

  const amount = (args.amountCents / 100).toFixed(2);
  const fee = (args.feeCents / 100).toFixed(2);
  const net = ((args.amountCents - args.feeCents) / 100).toFixed(2);
  const token = newDownloadToken();
  const tokenExpiresAt = new Date(Date.now() + TOKEN_TTL_MS);

  await db.insert(sales).values({
    id: nanoid(16),
    listingId: listing.id,
    sellerId: seller.id,
    buyerEmail: args.buyerEmail.toLowerCase(),
    amount,
    fee,
    net,
    stripeSessionId: args.stripeSessionId,
    downloadToken: token,
    tokenExpiresAt,
  });

  await db
    .update(sellers)
    .set({ balance: sql`${sellers.balance} + ${net}` })
    .where(eq(sellers.id, seller.id));

  await db
    .update(listings)
    .set({
      salesCount: sql`${listings.salesCount} + 1`,
      ...(listing.linkType === "single_use"
        ? { status: "sold" as const, visibility: "private" as const }
        : {}),
    })
    .where(eq(listings.id, listing.id));

  await db.insert(notifications).values({
    id: nanoid(16),
    sellerId: seller.id,
    type: "sale",
    text: `${listing.title} sold for ${formatCurrency(amount)} — ${formatCurrency(net)} credited.`,
  });

  void sendPurchaseEmail({
    to: args.buyerEmail,
    listingTitle: listing.title,
    sellerName: seller.name,
    amount,
    downloadUrl: appUrl(`/download/${token}`),
    expiresAt: tokenExpiresAt,
  });

  if (seller.emailOnSale) {
    void sendSaleEmail({ to: seller.email, listingTitle: listing.title, amount, net });
  }

  return { token };
}
