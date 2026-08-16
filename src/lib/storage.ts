import { createReadStream, existsSync } from "node:fs";
import { mkdir, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { del as blobDel, get as blobGet, put as blobPut } from "@vercel/blob";

export type Access = "public" | "private";

/**
 * Originals live under {sellerId}/files, previews under {sellerId}/previews and
 * avatars under {sellerId}/profile. Only previews and avatars are ever served
 * without an authorization check.
 */
export const storagePaths = {
  original: (sellerId: string, fileId: string, fileName: string) =>
    `${sellerId}/files/${fileId}-${sanitize(fileName)}`,
  preview: (sellerId: string, fileId: string) => `${sellerId}/previews/${fileId}.jpg`,
  avatar: (sellerId: string, fileName: string) => `${sellerId}/profile/${sanitize(fileName)}`,
};

function sanitize(fileName: string): string {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-120);
}

const blobEnabled = () => Boolean(process.env.BLOB_READ_WRITE_TOKEN);
const localRoot = () => process.env.STORAGE_LOCAL_DIR ?? path.join(process.cwd(), ".storage");

function localPath(pathname: string): string {
  const resolved = path.resolve(localRoot(), pathname);
  if (!resolved.startsWith(path.resolve(localRoot()))) throw new Error("Invalid storage path");
  return resolved;
}

export async function putObject(
  pathname: string,
  body: Buffer,
  contentType: string,
  access: Access,
): Promise<string> {
  if (blobEnabled()) {
    await blobPut(pathname, body, {
      access,
      contentType,
      addRandomSuffix: false,
      allowOverwrite: true,
    });
    return pathname;
  }
  const target = localPath(pathname);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, body);
  return pathname;
}

export type StoredObject = {
  stream: ReadableStream<Uint8Array>;
  contentType: string | null;
  size: number | null;
};

export async function getObject(pathname: string, access: Access): Promise<StoredObject | null> {
  if (blobEnabled()) {
    const result = await blobGet(pathname, { access });
    if (!result || result.statusCode !== 200) return null;
    return { stream: result.stream, contentType: result.blob.contentType, size: result.blob.size };
  }
  const target = localPath(pathname);
  if (!existsSync(target)) return null;
  const info = await stat(target);
  return {
    stream: Readable.toWeb(createReadStream(target)) as ReadableStream<Uint8Array>,
    contentType: null,
    size: info.size,
  };
}

export async function getObjectBuffer(pathname: string, access: Access): Promise<Buffer | null> {
  const object = await getObject(pathname, access);
  if (!object) return null;
  const chunks: Uint8Array[] = [];
  const reader = object.stream.getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }
  return Buffer.concat(chunks);
}

export async function deleteObjects(pathnames: string[]): Promise<void> {
  if (pathnames.length === 0) return;
  if (blobEnabled()) {
    await blobDel(pathnames).catch((error) => console.error("[storage] delete failed", error));
    return;
  }
  await Promise.all(
    pathnames.map((pathname) => rm(localPath(pathname), { force: true }).catch(() => undefined)),
  );
}
