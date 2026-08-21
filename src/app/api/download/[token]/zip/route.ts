import { ZipArchive } from "archiver";
import { Readable } from "node:stream";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { files, listings, sales } from "@/db/schema";
import { hasAccess, loadToken } from "@/lib/download-access";
import { ZIP_DOWNLOADS_PER_SALE, ZIP_SIZE_LIMIT_BYTES } from "@/lib/plans";
import { getObject } from "@/lib/storage";
import { slugify } from "@/lib/utils";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function GET(_request: Request, context: RouteContext<"/api/download/[token]/zip">) {
  const { token } = await context.params;

  const result = await loadToken(token);
  if (result.state !== "valid") return new Response("Link expired", { status: 410 });
  const sale = result.sale;
  if (!(await hasAccess(sale))) return new Response("Forbidden", { status: 403 });

  const [listing] = await db
    .select()
    .from(listings)
    .where(eq(listings.id, sale.listingId))
    .limit(1);
  if (!listing) return new Response("Not found", { status: 404 });
  if (listing.totalSizeBytes > ZIP_SIZE_LIMIT_BYTES) {
    return new Response("This purchase is too large to zip", { status: 413 });
  }

  const [updated] = await db
    .update(sales)
    .set({ zipDownloadCount: sql`${sales.zipDownloadCount} + 1` })
    .where(eq(sales.id, sale.id))
    .returning();
  if (updated.zipDownloadCount > ZIP_DOWNLOADS_PER_SALE) {
    return new Response("ZIP download limit reached", { status: 429 });
  }

  const listingFiles = await db
    .select()
    .from(files)
    .where(eq(files.listingId, listing.id))
    .orderBy(files.sortOrder);

  const archive = new ZipArchive({ zlib: { level: 0 } });
  archive.on("error", (error: Error) => console.error("[zip]", error));

  void (async () => {
    for (const file of listingFiles) {
      const object = await getObject(file.blobPathname, "private");
      if (object) archive.append(Readable.fromWeb(object.stream as never), { name: file.fileName });
    }
    await archive.finalize();
  })();

  return new Response(Readable.toWeb(archive) as unknown as ReadableStream, {
    headers: {
      "Content-Type": "application/zip",
      "Cache-Control": "private, no-store",
      "Content-Disposition": `attachment; filename="${slugify(listing.title)}.zip"`,
    },
  });
}
