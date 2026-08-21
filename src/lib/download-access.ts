import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { sales } from "@/db/schema";

export type Sale = typeof sales.$inferSelect;

function secret(): string {
  return process.env.BETTER_AUTH_SECRET ?? "insecure-development-secret";
}

function cookieName(token: string): string {
  return `dl_${token.slice(0, 16)}`;
}

function signature(token: string, email: string): string {
  return createHmac("sha256", secret()).update(`${token}:${email.toLowerCase()}`).digest("hex");
}

export function matchesBuyer(sale: Sale, email: string): boolean {
  const expected = Buffer.from(sale.buyerEmail.toLowerCase());
  const provided = Buffer.from(email.trim().toLowerCase());
  return expected.length === provided.length && timingSafeEqual(expected, provided);
}

export async function grantAccess(sale: Sale): Promise<void> {
  const store = await cookies();
  store.set(cookieName(sale.downloadToken), signature(sale.downloadToken, sale.buyerEmail), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: sale.tokenExpiresAt,
  });
}

export async function hasAccess(sale: Sale): Promise<boolean> {
  const cookie = (await cookies()).get(cookieName(sale.downloadToken))?.value;
  return cookie === signature(sale.downloadToken, sale.buyerEmail);
}

export type TokenState =
  | { state: "missing" }
  | { state: "expired"; sale: Sale }
  | { state: "valid"; sale: Sale };

export async function loadToken(token: string): Promise<TokenState> {
  const [sale] = await db.select().from(sales).where(eq(sales.downloadToken, token)).limit(1);
  if (!sale) return { state: "missing" };
  if (sale.status !== "active" || sale.tokenExpiresAt.getTime() < Date.now()) {
    return { state: "expired", sale };
  }
  return { state: "valid", sale };
}
