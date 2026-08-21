import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { sellers } from "@/db/schema";
import { auth, provisionSeller } from "./auth";

export type Seller = typeof sellers.$inferSelect;

export async function getSession() {
  return auth.api.getSession({ headers: await headers() });
}

export async function getSeller(): Promise<Seller | null> {
  const session = await getSession();
  if (!session?.user) return null;
  const [seller] = await db.select().from(sellers).where(eq(sellers.id, session.user.id)).limit(1);
  if (seller) return seller;

  // The dashboard gates on a seller profile; provision one if the hook missed it.
  await provisionSeller(session.user);
  const [provisioned] = await db
    .select()
    .from(sellers)
    .where(eq(sellers.id, session.user.id))
    .limit(1);
  return provisioned ?? null;
}

export async function requireSeller(): Promise<Seller> {
  const seller = await getSeller();
  if (!seller) redirect("/login");
  return seller;
}
