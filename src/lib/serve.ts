import type { StoredObject } from "./storage";

export function streamObject(
  object: StoredObject,
  options: { contentType: string; fileName?: string; download?: boolean; cache?: string },
): Response {
  const headers = new Headers({
    "Content-Type": object.contentType ?? options.contentType,
    "Cache-Control": options.cache ?? "private, no-store",
  });
  if (object.size !== null) headers.set("Content-Length", String(object.size));
  if (options.fileName) {
    const encoded = encodeURIComponent(options.fileName);
    headers.set(
      "Content-Disposition",
      `${options.download ? "attachment" : "inline"}; filename*=UTF-8''${encoded}`,
    );
  }
  return new Response(object.stream, { headers });
}
