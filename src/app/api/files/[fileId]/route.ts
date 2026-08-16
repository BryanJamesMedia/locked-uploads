import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { files } from "@/db/schema";
import { streamObject } from "@/lib/serve";
import { getSeller } from "@/lib/session";
import { getObject } from "@/lib/storage";

export const runtime = "nodejs";

/** Serves an original to its owner. Anonymous requests never reach storage. */
export async function GET(_request: Request, ctx: RouteContext<"/api/files/[fileId]">) {
  const seller = await getSeller();
  if (!seller) return new Response("Forbidden", { status: 403 });
  const { fileId } = await ctx.params;

  const [file] = await db
    .select()
    .from(files)
    .where(and(eq(files.id, fileId), eq(files.sellerId, seller.id)))
    .limit(1);
  if (!file) return new Response("Forbidden", { status: 403 });

  const object = await getObject(file.blobPathname, "private");
  if (!object) return new Response("Not found", { status: 404 });

  return streamObject(object, {
    contentType: file.mimeType,
    fileName: file.fileName,
    download: true,
  });
}
