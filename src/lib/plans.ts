import type { Plan } from "@/db/schema";

export type PlanConfig = {
  id: Plan;
  label: string;
  monthlyPrice: number;
  /** Platform fee taken from each sale, as a fraction. */
  feeRate: number;
  storagePerListingBytes: number;
  imageCapPerListing: number;
  /** null means unlimited */
  activeListings: number | null;
  video: boolean;
};

const GB = 1024 * 1024 * 1024;

export const PLANS: Record<Plan, PlanConfig> = {
  free: {
    id: "free",
    label: "Free",
    monthlyPrice: 0,
    feeRate: 0.12,
    storagePerListingBytes: 2 * GB,
    imageCapPerListing: 20,
    activeListings: 5,
    video: false,
  },
  pro: {
    id: "pro",
    label: "Pro",
    monthlyPrice: 12,
    feeRate: 0.06,
    storagePerListingBytes: 5 * GB,
    imageCapPerListing: 20,
    activeListings: null,
    video: true,
  },
  studio: {
    id: "studio",
    label: "Studio",
    monthlyPrice: 29,
    feeRate: 0.03,
    storagePerListingBytes: 5 * GB,
    imageCapPerListing: 20,
    activeListings: null,
    video: true,
  },
};

export const MINIMUM_PLATFORM_FEE_CENTS = 50;

/** Platform fee in cents for a sale, honouring the per-transaction minimum. */
export function platformFeeCents(amountCents: number, plan: Plan): number {
  const fee = Math.round(amountCents * PLANS[plan].feeRate);
  return Math.min(amountCents, Math.max(fee, MINIMUM_PLATFORM_FEE_CENTS));
}

export const DOWNLOADS_PER_FILE = 3;
export const ZIP_DOWNLOADS_PER_SALE = 3;
export const TOKEN_TTL_MS = 24 * 60 * 60 * 1000;
/** ZIP generation is disabled above this listing size. */
export const ZIP_SIZE_LIMIT_BYTES = 2 * GB;
