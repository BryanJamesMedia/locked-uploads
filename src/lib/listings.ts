import type { LinkType } from "@/db/schema";

export const MAX_SALE_LIMIT = 1000;

/** Buyers a link may still serve, or null when it never runs out. */
export function salesAllowed(linkType: LinkType, saleLimit: number | null): number | null {
  if (linkType === "single_use") return 1;
  if (linkType === "limited") return saleLimit ?? 1;
  return null;
}

/** Whether a link has served every buyer it is allowed to. */
export function soldOut(
  linkType: LinkType,
  saleLimit: number | null,
  salesCount: number,
): boolean {
  const allowed = salesAllowed(linkType, saleLimit);
  return allowed !== null && salesCount >= allowed;
}

export function linkTypeLabel(linkType: LinkType, saleLimit: number | null): string {
  if (linkType === "single_use") return "Single-use";
  if (linkType === "limited") return `Limited · ${saleLimit ?? 1}`;
  return "Permanent";
}
