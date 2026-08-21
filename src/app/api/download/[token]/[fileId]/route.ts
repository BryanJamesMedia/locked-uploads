import { and, eq, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db } from "@/db";
import { fileDownloads, files } from "@/db/schema";
import { hasAccess, loadToken } from "@/lib/download-access";
import { DOWNLOADS_PER_FILE } from "@/lib/plans";
import { streamObject } from "@/lib/serve";
import { getObject } from "@/lib/storage";

export const runtime = "nodejs";

export async function GET(_request: Request, context: RouteContext<"/api/download/[token]/[fileId]">) {
  const { token, fileId } = await context.params;

  const result = await loadToken(token);
  if (result.state !== "valid") return new Response("Link expired", { status: 410 });
  const sale = result.sale;
  if (!(await hasAccess(sale))) return new Response("Forbidden", { status: 403 });

  const [file] = await db
    .select()
    .from(files)
    .where(and(eq(files.id, fileId), eq(files.listingId, sale.listingId)))
    .limit(1);
  if (!file) return new Response("Not found", { status: 404 });

  const [counter] = await db
    .insert(fileDownloads)
    .values({ id: nanoid(16), saleId: sale.id, fileId: file.id, downloadCount: 1 })
    .onConflictDoUpdate({
      target: [fileDownloads.saleId, fileDownloads.fileId],
      set: { downloadCount: sql`${fileDownloads.downloadCount} + 1` },
    })
    .returning();

  if (counter.downloadCount > DOWNLOADS_PER_FILE) {
    return new Response("Download limit reached for this file", { status: 429 });
  }

  const object = await getObject(file.blobPathname, "private");
  if (!object) return new Response("Not found", { status: 404 });
  return streamObject(object, {
    contentType: file.mimeType,
    fileName: file.fileName,
    download: true,
  });
}
