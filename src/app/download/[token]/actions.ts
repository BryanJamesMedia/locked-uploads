"use server";

import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { sales } from "@/db/schema";
import { grantAccess, loadToken, matchesBuyer } from "@/lib/download-access";

const emailSchema = z.string().trim().email("Enter a valid email address");

export async function unlockDownload(
  token: string,
  formData: FormData,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = emailSchema.safeParse(formData.get("email"));
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const result = await loadToken(token);
  if (result.state !== "valid") return { ok: false, error: "This link is no longer active." };
  if (!matchesBuyer(result.sale, parsed.data)) {
    return { ok: false, error: "That email doesn't match this purchase." };
  }

  await grantAccess(result.sale);
  if (!result.sale.accessedAt) {
    await db.update(sales).set({ accessedAt: new Date() }).where(eq(sales.id, result.sale.id));
  }
  return { ok: true };
}
