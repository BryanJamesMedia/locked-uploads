import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { listings, sales } from "@/db/schema";
import { SaleRow } from "@/components/dashboard/sale-row";
import { EmptyState } from "@/components/ui/card";
import { requireSeller } from "@/lib/session";
import { appUrl, isPast } from "@/lib/utils";

export default async function SalesPage() {
  const seller = await requireSeller();
  const rows = await db
    .select({
      id: sales.id,
      amount: sales.amount,
      net: sales.net,
      buyerEmail: sales.buyerEmail,
      createdAt: sales.createdAt,
      tokenExpiresAt: sales.tokenExpiresAt,
      downloadToken: sales.downloadToken,
      reissueCount: sales.reissueCount,
      accessedAt: sales.accessedAt,
      title: listings.title,
    })
    .from(sales)
    .innerJoin(listings, eq(listings.id, sales.listingId))
    .where(eq(sales.sellerId, seller.id))
    .orderBy(desc(sales.createdAt));

  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold text-slate-900">Sales</h1>
      {rows.length === 0 ? (
        <EmptyState
          title="No sales yet"
          description="When someone buys one of your listings you'll see the purchase here, and you can re-issue their download link any time."
        />
      ) : (
        <div className="space-y-3">
          {rows.map((sale) => (
            <SaleRow
              key={sale.id}
              sale={{ ...sale, createdAt: sale.createdAt.toISOString(), tokenExpiresAt: sale.tokenExpiresAt.toISOString() }}
              downloadUrl={appUrl(`/download/${sale.downloadToken}`)}
              expired={isPast(sale.tokenExpiresAt)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
