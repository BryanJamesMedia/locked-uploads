import Link from "next/link";
import { and, desc, eq, sql } from "drizzle-orm";
import { ArrowUpRight, Plus } from "lucide-react";
import { db } from "@/db";
import { listings, sales } from "@/db/schema";
import { Button } from "@/components/ui/button";
import { Card, CardTitle, EmptyState } from "@/components/ui/card";
import { requireSeller } from "@/lib/session";
import { formatCurrency, formatDate } from "@/lib/utils";

export default async function DashboardPage() {
  const seller = await requireSeller();

  const [totals] = await db
    .select({
      count: sql<number>`count(*)::int`,
      gross: sql<string>`coalesce(sum(${sales.amount}), 0)`,
      net: sql<string>`coalesce(sum(${sales.net}), 0)`,
    })
    .from(sales)
    .where(eq(sales.sellerId, seller.id));

  const [active] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(listings)
    .where(
      and(
        eq(listings.sellerId, seller.id),
        eq(listings.draft, false),
        eq(listings.status, "active"),
      ),
    );

  const recent = await db
    .select({
      id: sales.id,
      amount: sales.amount,
      createdAt: sales.createdAt,
      buyerEmail: sales.buyerEmail,
      title: listings.title,
    })
    .from(sales)
    .innerJoin(listings, eq(listings.id, sales.listingId))
    .where(eq(sales.sellerId, seller.id))
    .orderBy(desc(sales.createdAt))
    .limit(5);

  const stats = [
    { label: "Available balance", value: formatCurrency(seller.balance) },
    { label: "Total earned", value: formatCurrency(totals.net) },
    { label: "Sales", value: String(totals.count) },
    { label: "Active listings", value: String(active.count) },
  ];

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-900">Hi, {seller.name.split(" ")[0]}</h1>
        <Link href="/dashboard/listings/new">
          <Button size="sm">
            <Plus className="size-4" />
            New listing
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <p className="text-xs text-slate-500">{stat.label}</p>
            <p className="mt-1 text-xl font-semibold text-slate-900">{stat.value}</p>
          </Card>
        ))}
      </div>

      <Card className="mt-6">
        <div className="mb-3 flex items-center justify-between">
          <CardTitle>Recent sales</CardTitle>
          <Link href="/dashboard/sales" className="text-sm text-slate-500 hover:text-slate-900">
            View all <ArrowUpRight className="inline size-3.5" />
          </Link>
        </div>
        {recent.length === 0 ? (
          <EmptyState
            title="No sales yet"
            description="Share a listing link and your first sale will show up here."
          />
        ) : (
          <ul className="divide-y divide-slate-100">
            {recent.map((sale) => (
              <li key={sale.id} className="flex items-center justify-between py-2.5 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-medium text-slate-900">{sale.title}</p>
                  <p className="truncate text-xs text-slate-500">{sale.buyerEmail}</p>
                </div>
                <div className="text-right">
                  <p className="font-medium text-slate-900">{formatCurrency(sale.amount)}</p>
                  <p className="text-xs text-slate-500">{formatDate(sale.createdAt)}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
