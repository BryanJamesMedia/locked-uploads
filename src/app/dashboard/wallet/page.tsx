import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { payouts } from "@/db/schema";
import { PayoutButton } from "@/components/dashboard/payout-button";
import { Badge, Card, CardTitle } from "@/components/ui/card";
import { requireSeller } from "@/lib/session";
import { formatCurrency, formatDate } from "@/lib/utils";

export default async function WalletPage() {
  const seller = await requireSeller();
  const history = await db
    .select()
    .from(payouts)
    .where(eq(payouts.sellerId, seller.id))
    .orderBy(desc(payouts.createdAt));

  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold text-slate-900">Wallet</h1>

      <Card>
        <p className="text-sm text-slate-500">Available balance</p>
        <p className="mt-1 text-3xl font-semibold text-slate-900">
          {formatCurrency(seller.balance)}
        </p>
        <p className="mt-2 text-xs text-slate-500">
          Minimum withdrawal is $10.00. Payouts arrive in your Stripe account in 1-2 business days.
        </p>
        <PayoutButton
          disabled={!seller.stripeConnected || Number(seller.balance) < 10}
          hint={
            !seller.stripeConnected
              ? "Connect Stripe to withdraw."
              : Number(seller.balance) < 10
                ? "You need at least $10.00 to withdraw."
                : undefined
          }
        />
      </Card>

      <Card className="mt-6">
        <CardTitle>Payout history</CardTitle>
        {history.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">No payouts yet.</p>
        ) : (
          <ul className="mt-3 divide-y divide-slate-100">
            {history.map((payout) => (
              <li key={payout.id} className="flex items-center justify-between py-2.5 text-sm">
                <div>
                  <p className="font-medium text-slate-900">{formatCurrency(payout.amount)}</p>
                  <p className="text-xs text-slate-500">{formatDate(payout.createdAt)}</p>
                </div>
                <Badge tone={payout.status === "completed" ? "green" : "amber"}>
                  {payout.status}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
