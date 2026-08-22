"use server";

import { revalidatePath } from "next/cache";
import { and, eq, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db } from "@/db";
import { fileDownloads, listings, notifications, payouts, sellers } from "@/db/schema";
import { sales } from "@/db/schema";
import { DEFAULT_PAGE_BACKGROUND, normalizeHexColor } from "@/lib/colors";
import { sendPayoutEmail, sendReissueEmail } from "@/lib/email";
import { TOKEN_TTL_MS } from "@/lib/plans";
import { newDownloadToken } from "@/lib/purchase";
import { requireSeller } from "@/lib/session";
import { appUrl } from "@/lib/utils";

export type ActionResult = { ok: true } | { ok: false; error: string };

/** Issues a fresh 24h token, invalidating the old one and resetting counters. */
export async function reissueDownload(saleId: string): Promise<ActionResult> {
  const seller = await requireSeller();
  const [sale] = await db
    .select()
    .from(sales)
    .where(and(eq(sales.id, saleId), eq(sales.sellerId, seller.id)))
    .limit(1);
  if (!sale) return { ok: false, error: "Sale not found." };

  const token = newDownloadToken();
  const tokenExpiresAt = new Date(Date.now() + TOKEN_TTL_MS);

  await db
    .update(sales)
    .set({
      downloadToken: token,
      tokenExpiresAt,
      status: "active",
      zipDownloadCount: 0,
      accessedAt: null,
      reissueCount: sql`${sales.reissueCount} + 1`,
    })
    .where(eq(sales.id, sale.id));
  await db.delete(fileDownloads).where(eq(fileDownloads.saleId, sale.id));

  const [listing] = await db
    .select({ title: listings.title })
    .from(listings)
    .where(eq(listings.id, sale.listingId))
    .limit(1);

  void sendReissueEmail({
    to: sale.buyerEmail,
    listingTitle: listing?.title ?? "your purchase",
    downloadUrl: appUrl(`/download/${token}`),
    expiresAt: tokenExpiresAt,
  });

  revalidatePath("/dashboard/sales");
  return { ok: true };
}

export async function requestPayout(): Promise<ActionResult> {
  const seller = await requireSeller();
  const balance = Number(seller.balance);
  if (!seller.stripeConnected) return { ok: false, error: "Connect Stripe before withdrawing." };
  if (balance < 10) return { ok: false, error: "You need at least $10.00 to withdraw." };

  const amount = balance.toFixed(2);
  await db.insert(payouts).values({ id: nanoid(16), sellerId: seller.id, amount });
  await db.update(sellers).set({ balance: "0" }).where(eq(sellers.id, seller.id));
  await db.insert(notifications).values({
    id: nanoid(16),
    sellerId: seller.id,
    type: "payout",
    text: `Payout of $${amount} requested. Funds arrive in 1-2 business days.`,
  });
  if (seller.emailOnPayout) void sendPayoutEmail({ to: seller.email, amount });

  revalidatePath("/dashboard/wallet");
  return { ok: true };
}

export async function markNotificationsRead(): Promise<void> {
  const seller = await requireSeller();
  await db.update(notifications).set({ read: true }).where(eq(notifications.sellerId, seller.id));
  revalidatePath("/dashboard/notifications");
}

export async function saveProfile(formData: FormData): Promise<ActionResult> {
  const seller = await requireSeller();
  const name = String(formData.get("name") ?? "").trim();
  const bio = String(formData.get("bio") ?? "").trim();
  const handle = String(formData.get("handle") ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-");
  const backgroundInput = String(formData.get("pageBackground") ?? "").trim();
  const pageBackground = backgroundInput ? normalizeHexColor(backgroundInput) : null;
  if (name.length < 2) return { ok: false, error: "Enter your display name." };
  if (handle.length < 3) return { ok: false, error: "Handle must be at least 3 characters." };
  if (backgroundInput && !pageBackground) {
    return { ok: false, error: "Enter a background colour as a hex value, e.g. #000000." };
  }

  const clash = await db
    .select({ id: sellers.id })
    .from(sellers)
    .where(eq(sellers.handle, handle))
    .limit(1);
  if (clash.length > 0 && clash[0].id !== seller.id) {
    return { ok: false, error: "That handle is taken." };
  }

  await db
    .update(sellers)
    .set({
      name,
      bio: bio || null,
      handle,
      pageBackground: pageBackground === DEFAULT_PAGE_BACKGROUND ? null : pageBackground,
    })
    .where(eq(sellers.id, seller.id));
  revalidatePath("/dashboard/profile");
  revalidatePath(`/${handle}`);
  return { ok: true };
}

export async function saveSettings(formData: FormData): Promise<ActionResult> {
  const seller = await requireSeller();
  await db
    .update(sellers)
    .set({
      publicProfileEnabled: formData.get("publicProfileEnabled") === "on",
      emailOnSale: formData.get("emailOnSale") === "on",
      emailOnPayout: formData.get("emailOnPayout") === "on",
    })
    .where(eq(sellers.id, seller.id));
  revalidatePath("/dashboard/settings");
  return { ok: true };
}

export async function changePlan(plan: "free" | "pro" | "studio"): Promise<ActionResult> {
  const seller = await requireSeller();
  await db.update(sellers).set({ plan }).where(eq(sellers.id, seller.id));
  revalidatePath("/dashboard/subscription");
  return { ok: true };
}
