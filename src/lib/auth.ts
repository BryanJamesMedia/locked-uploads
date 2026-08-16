import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { sellers, users, sessions, accounts, verifications } from "@/db/schema";
import { sendPasswordResetEmail, sendWelcomeEmail } from "./email";
import { slugify } from "./utils";

async function uniqueHandle(base: string): Promise<string> {
  const root = slugify(base);
  for (let attempt = 0; ; attempt++) {
    const candidate = attempt === 0 ? root : `${root}-${attempt}`;
    const existing = await db
      .select({ id: sellers.id })
      .from(sellers)
      .where(eq(sellers.handle, candidate))
      .limit(1);
    if (existing.length === 0) return candidate;
  }
}

export async function provisionSeller(user: { id: string; name: string; email: string }) {
  const existing = await db
    .select({ id: sellers.id })
    .from(sellers)
    .where(eq(sellers.id, user.id))
    .limit(1);
  if (existing.length > 0) return;

  const handle = await uniqueHandle(user.name || user.email.split("@")[0]);
  await db.insert(sellers).values({
    id: user.id,
    name: user.name || user.email.split("@")[0],
    handle,
    email: user.email,
  });
}

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    usePlural: true,
    schema: { users, sessions, accounts, verifications },
  }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    sendResetPassword: async ({ user, url }) => {
      await sendPasswordResetEmail(user.email, url);
    },
  },
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          await provisionSeller(user);
          void sendWelcomeEmail(user.email, user.name);
        },
      },
    },
  },
  plugins: [nextCookies()],
});
