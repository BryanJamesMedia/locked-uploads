import type { FileType } from "@/db/schema";

type Spec = { type: FileType; mimes: string[]; extensions: string[] };

const SPECS: Spec[] = [
  {
    type: "image",
    mimes: ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"],
    extensions: ["jpg", "jpeg", "png", "webp", "heic", "heif"],
  },
  {
    type: "video",
    mimes: ["video/mp4", "video/quicktime", "video/webm"],
    extensions: ["mp4", "mov", "webm"],
  },
  { type: "pdf", mimes: ["application/pdf"], extensions: ["pdf"] },
  {
    type: "document",
    mimes: [
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ],
    extensions: ["doc", "docx"],
  },
  {
    type: "archive",
    mimes: ["application/zip", "application/x-zip-compressed", "multipart/x-zip"],
    extensions: ["zip"],
  },
];

export const ACCEPTED_EXTENSIONS = SPECS.flatMap((s) => s.extensions.map((e) => `.${e}`));

export function classifyFile(fileName: string, mimeType: string): FileType | null {
  const extension = fileName.split(".").pop()?.toLowerCase() ?? "";
  const spec =
    SPECS.find((s) => s.mimes.includes(mimeType.toLowerCase())) ??
    SPECS.find((s) => s.extensions.includes(extension));
  return spec?.type ?? null;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value >= 10 || Number.isInteger(value) ? Math.round(value) : value.toFixed(1)} ${units[unit]}`;
}
