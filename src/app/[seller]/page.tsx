import Link from "next/link";
import { notFound } from "next/navigation";
import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { listings, sellers } from "@/db/schema";
import { previewUrl } from "@/components/file-tile";
import { Card } from "@/components/ui/card";
import { formatCurrency, listingPath } from "@/lib/utils";

export default async function ProfilePage(props: PageProps<"/[seller]">) {
  const { seller: handle } = await props.params;

  const [seller] = await db
    .select()
    .from(sellers)
    .where(sql`lower(${sellers.handle}) = lower(${handle})`)
    .limit(1);
  if (!seller || !seller.publicProfileEnabled) notFound();

  const catalogue = await db
    .select()
    .from(listings)
    .where(
      and(
        eq(listings.sellerId, seller.id),
        eq(listings.visibility, "public"),
        eq(listings.status, "active"),
        eq(listings.draft, false),
      ),
    )
    .orderBy(desc(listings.createdAt));

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8">
      <header className="flex items-center gap-4">
        <div className="size-16 overflow-hidden rounded-full bg-slate-200">
          {seller.profileImagePathname ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewUrl(seller.profileImagePathname)}
              alt=""
              className="size-full object-cover"
            />
          ) : null}
        </div>
        <div>
          <h1 className="text-xl font-semibold text-slate-900">{seller.name}</h1>
          <p className="text-sm text-slate-500">@{seller.handle}</p>
        </div>
      </header>
      {seller.bio ? <p className="mt-4 text-sm text-slate-600">{seller.bio}</p> : null}

      {catalogue.length === 0 ? (
        <p className="mt-8 text-sm text-slate-500">Nothing for sale right now.</p>
      ) : (
        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3">
          {catalogue.map((listing) => (
            <Link key={listing.id} href={listingPath(seller.publicId, listing.slug)}>
              <Card className="p-3 transition-shadow hover:shadow-md">
                <div className="aspect-square overflow-hidden rounded-lg bg-slate-100">
                  {listing.coverImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={previewUrl(listing.coverImage)}
                      alt=""
                      className="size-full object-cover"
                    />
                  ) : (
                    <div className="flex size-full items-center justify-center text-xs text-slate-400">
                      {listing.fileCount} file{listing.fileCount === 1 ? "" : "s"}
                    </div>
                  )}
                </div>
                <p className="mt-2 truncate text-sm font-medium text-slate-900">{listing.title}</p>
                <p className="text-sm text-slate-500">{formatCurrency(listing.price)}</p>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
