import Link from "next/link";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { sales } from "@/db/schema";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default async function SuccessPage(props: PageProps<"/success">) {
  const params = await props.searchParams;
  const sessionId = typeof params.session_id === "string" ? params.session_id : null;
  const directToken = typeof params.token === "string" ? params.token : null;

  let token = directToken;
  if (!token && sessionId) {
    const [sale] = await db
      .select({ downloadToken: sales.downloadToken })
      .from(sales)
      .where(eq(sales.stripeSessionId, sessionId))
      .limit(1);
    token = sale?.downloadToken ?? null;
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4 py-10">
      <Card className="text-center">
        <h1 className="text-xl font-semibold text-slate-900">Payment complete</h1>
        <p className="mt-2 text-sm text-slate-600">
          We&apos;ve emailed your download link. It stays active for 24 hours.
        </p>
        {token ? (
          <Link href={`/download/${token}`} className="mt-5 inline-block">
            <Button size="lg">Open my downloads</Button>
          </Link>
        ) : (
          <p className="mt-5 text-sm text-slate-500">
            Your link will arrive by email in a moment — check your inbox.
          </p>
        )}
      </Card>
    </main>
  );
}
