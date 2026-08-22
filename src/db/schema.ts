import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  bigint,
  numeric,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const plans = ["free", "pro", "studio"] as const;
export type Plan = (typeof plans)[number];

export const fileTypes = ["image", "video", "pdf", "document", "archive"] as const;
export type FileType = (typeof fileTypes)[number];

export const linkTypes = ["permanent", "single_use"] as const;
export const visibilities = ["public", "private"] as const;
export const listingStatuses = ["active", "sold"] as const;
export const saleStatuses = ["active", "expired", "reissued"] as const;
export const payoutStatuses = ["pending", "completed"] as const;
export const notificationTypes = ["sale", "payout", "system"] as const;

/* ---------------------------------------------------------------- auth */

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const accounts = pgTable("accounts", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  idToken: text("id_token"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const verifications = pgTable("verifications", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

/* ------------------------------------------------------------- sellers */

export const sellers = pgTable(
  "sellers",
  {
    id: text("id")
      .primaryKey()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    handle: text("handle").notNull(),
    /** Immutable id used in listing URLs, so links survive a handle change. */
    publicId: text("public_id").notNull(),
    bio: text("bio"),
    email: text("email").notNull(),
    stripeAccountId: text("stripe_account_id"),
    stripeEmail: text("stripe_email"),
    stripeConnected: boolean("stripe_connected").notNull().default(false),
    plan: text("plan").$type<Plan>().notNull().default("free"),
    balance: numeric("balance", { precision: 12, scale: 2 }).notNull().default("0"),
    rating: numeric("rating", { precision: 3, scale: 2 }),
    profileImagePathname: text("profile_image_pathname"),
    /** Hex colour behind the seller's public pages; null renders the default. */
    pageBackground: text("page_background"),
    /** One URL per line, shown as plain links under the seller's catalogue. */
    socialLinks: text("social_links"),
    publicProfileEnabled: boolean("public_profile_enabled").notNull().default(true),
    emailOnSale: boolean("email_on_sale").notNull().default(true),
    emailOnPayout: boolean("email_on_payout").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("sellers_handle_lower_idx").on(t.handle),
    uniqueIndex("sellers_public_id_idx").on(t.publicId),
  ],
);

/* ------------------------------------------------------------ listings */

export const listings = pgTable(
  "listings",
  {
    id: text("id").primaryKey(),
    sellerId: text("seller_id")
      .notNull()
      .references(() => sellers.id, { onDelete: "cascade" }),
    slug: text("slug").notNull().unique(),
    title: text("title").notNull(),
    description: text("description"),
    price: numeric("price", { precision: 12, scale: 2 }).notNull(),
    linkType: text("link_type").$type<(typeof linkTypes)[number]>().notNull().default("permanent"),
    visibility: text("visibility").$type<(typeof visibilities)[number]>().notNull().default("public"),
    status: text("status").$type<(typeof listingStatuses)[number]>().notNull().default("active"),
    /** Listings in the multi-step creation flow are not yet purchasable or listed. */
    draft: boolean("draft").notNull().default(true),
    coverImage: text("cover_image"),
    fileCount: integer("file_count").notNull().default(0),
    totalSizeBytes: bigint("total_size_bytes", { mode: "number" }).notNull().default(0),
    salesCount: integer("sales_count").notNull().default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [index("listings_seller_idx").on(t.sellerId)],
);

/* --------------------------------------------------------------- files */

export const files = pgTable(
  "files",
  {
    id: text("id").primaryKey(),
    listingId: text("listing_id")
      .notNull()
      .references(() => listings.id, { onDelete: "cascade" }),
    sellerId: text("seller_id")
      .notNull()
      .references(() => sellers.id, { onDelete: "cascade" }),
    fileName: text("file_name").notNull(),
    fileType: text("file_type").$type<FileType>().notNull(),
    mimeType: text("mime_type").notNull(),
    sizeBytes: bigint("size_bytes", { mode: "number" }).notNull(),
    blobPathname: text("blob_pathname").notNull(),
    previewPathname: text("preview_pathname"),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("files_listing_idx").on(t.listingId)],
);

/* --------------------------------------------------------------- sales */

export const sales = pgTable(
  "sales",
  {
    id: text("id").primaryKey(),
    listingId: text("listing_id")
      .notNull()
      .references(() => listings.id, { onDelete: "cascade" }),
    sellerId: text("seller_id")
      .notNull()
      .references(() => sellers.id, { onDelete: "cascade" }),
    buyerEmail: text("buyer_email").notNull(),
    amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
    fee: numeric("fee", { precision: 12, scale: 2 }).notNull(),
    net: numeric("net", { precision: 12, scale: 2 }).notNull(),
    stripeSessionId: text("stripe_session_id").unique(),
    downloadToken: text("download_token").notNull().unique(),
    tokenExpiresAt: timestamp("token_expires_at").notNull(),
    zipDownloadCount: integer("zip_download_count").notNull().default(0),
    reissueCount: integer("reissue_count").notNull().default(0),
    accessedAt: timestamp("accessed_at"),
    status: text("status").$type<(typeof saleStatuses)[number]>().notNull().default("active"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("sales_seller_idx").on(t.sellerId)],
);

export const fileDownloads = pgTable(
  "file_downloads",
  {
    id: text("id").primaryKey(),
    saleId: text("sale_id")
      .notNull()
      .references(() => sales.id, { onDelete: "cascade" }),
    fileId: text("file_id")
      .notNull()
      .references(() => files.id, { onDelete: "cascade" }),
    downloadCount: integer("download_count").notNull().default(0),
  },
  (t) => [uniqueIndex("file_downloads_sale_file_idx").on(t.saleId, t.fileId)],
);

/* ------------------------------------------------------------- payouts */

export const payouts = pgTable("payouts", {
  id: text("id").primaryKey(),
  sellerId: text("seller_id")
    .notNull()
    .references(() => sellers.id, { onDelete: "cascade" }),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  status: text("status").$type<(typeof payoutStatuses)[number]>().notNull().default("pending"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
});

/* ------------------------------------------------------- notifications */

export const notifications = pgTable(
  "notifications",
  {
    id: text("id").primaryKey(),
    sellerId: text("seller_id")
      .notNull()
      .references(() => sellers.id, { onDelete: "cascade" }),
    type: text("type").$type<(typeof notificationTypes)[number]>().notNull(),
    text: text("text").notNull(),
    read: boolean("read").notNull().default(false),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("notifications_seller_idx").on(t.sellerId)],
);
