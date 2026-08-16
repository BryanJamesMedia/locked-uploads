import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { notifications } from "@/db/schema";
import { MarkReadButton } from "@/components/dashboard/mark-read-button";
import { Card, EmptyState } from "@/components/ui/card";
import { requireSeller } from "@/lib/session";
import { formatDate } from "@/lib/utils";

export default async function NotificationsPage() {
  const seller = await requireSeller();
  const rows = await db
    .select()
    .from(notifications)
    .where(eq(notifications.sellerId, seller.id))
    .orderBy(desc(notifications.createdAt))
    .limit(50);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-900">Notifications</h1>
        {rows.some((row) => !row.read) ? <MarkReadButton /> : null}
      </div>
      {rows.length === 0 ? (
        <EmptyState title="Nothing yet" description="Sales and payouts will show up here." />
      ) : (
        <div className="space-y-2">
          {rows.map((row) => (
            <Card key={row.id} className={row.read ? "opacity-70" : undefined}>
              <p className="text-sm text-slate-900">{row.text}</p>
              <p className="mt-1 text-xs text-slate-500">{formatDate(row.createdAt)}</p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
