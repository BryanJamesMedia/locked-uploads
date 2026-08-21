import { posix } from "node:path";
import { getObject } from "@/lib/storage";
import { streamObject } from "@/lib/serve";

export const runtime = "nodejs";

/** Serves public assets only: generated previews and profile avatars. */
export async function GET(_request: Request, ctx: RouteContext<"/api/preview/[...path]">) {
  const { path } = await ctx.params;
  const segments = path.map(decodeURIComponent);

  if (segments.some((segment) => segment === "" || /[/\\]/.test(segment) || segment.includes(".."))) {
    return new Response("Forbidden", { status: 403 });
  }

  const pathname = posix.normalize(segments.join("/"));

  if (!/^[^/]+\/(previews|profile)\/[^/]+$/.test(pathname)) {
    return new Response("Forbidden", { status: 403 });
  }

  const object = await getObject(pathname, "public");
  if (!object) return new Response("Not found", { status: 404 });

  return streamObject(object, {
    contentType: pathname.endsWith(".jpg") ? "image/jpeg" : "application/octet-stream",
    cache: "public, max-age=31536000, immutable",
  });
}
