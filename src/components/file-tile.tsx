import { FileArchive, FileText, FileType2, Film, ImageIcon } from "lucide-react";
import type { FileType } from "@/db/schema";
import { formatBytes } from "@/lib/files";
import { cn } from "@/lib/utils";

const icons: Record<FileType, typeof FileText> = {
  image: ImageIcon,
  video: Film,
  pdf: FileText,
  document: FileType2,
  archive: FileArchive,
};

export function previewUrl(pathname: string): string {
  return `/api/preview/${pathname.split("/").map(encodeURIComponent).join("/")}`;
}

/**
 * Renders either the irreversibly degraded preview (images) or a file-type card.
 * Never receives or references the original file path.
 */
export function FileTile({
  fileName,
  fileType,
  sizeBytes,
  previewPathname,
  className,
}: {
  fileName: string;
  fileType: FileType;
  sizeBytes: number;
  previewPathname?: string | null;
  className?: string;
}) {
  const Icon = icons[fileType];

  if (fileType === "image" && previewPathname) {
    return (
      <div className={cn("relative aspect-square overflow-hidden rounded-lg bg-slate-100", className)}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={previewUrl(previewPathname)}
          alt="Obscured preview"
          className="size-full object-cover"
        />
        <span className="absolute bottom-1 right-1 rounded bg-black/50 px-1.5 py-0.5 text-[10px] font-medium text-white">
          Locked
        </span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex aspect-square flex-col items-center justify-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-center",
        className,
      )}
    >
      <Icon className="size-7 text-slate-400" />
      <p className="line-clamp-2 w-full break-all text-xs font-medium text-slate-700">{fileName}</p>
      <p className="text-[11px] text-slate-500">{formatBytes(sizeBytes)}</p>
    </div>
  );
}
