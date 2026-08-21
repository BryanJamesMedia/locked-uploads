CREATE TABLE "accounts" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"id_token" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "file_downloads" (
	"id" text PRIMARY KEY NOT NULL,
	"sale_id" text NOT NULL,
	"file_id" text NOT NULL,
	"download_count" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "files" (
	"id" text PRIMARY KEY NOT NULL,
	"listing_id" text NOT NULL,
	"seller_id" text NOT NULL,
	"file_name" text NOT NULL,
	"file_type" text NOT NULL,
	"mime_type" text NOT NULL,
	"size_bytes" bigint NOT NULL,
	"blob_pathname" text NOT NULL,
	"preview_pathname" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "listings" (
	"id" text PRIMARY KEY NOT NULL,
	"seller_id" text NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"price" numeric(12, 2) NOT NULL,
	"link_type" text DEFAULT 'permanent' NOT NULL,
	"visibility" text DEFAULT 'public' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"draft" boolean DEFAULT true NOT NULL,
	"cover_image" text,
	"file_count" integer DEFAULT 0 NOT NULL,
	"total_size_bytes" bigint DEFAULT 0 NOT NULL,
	"sales_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "listings_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" text PRIMARY KEY NOT NULL,
	"seller_id" text NOT NULL,
	"type" text NOT NULL,
	"text" text NOT NULL,
	"read" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payouts" (
	"id" text PRIMARY KEY NOT NULL,
	"seller_id" text NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "sales" (
	"id" text PRIMARY KEY NOT NULL,
	"listing_id" text NOT NULL,
	"seller_id" text NOT NULL,
	"buyer_email" text NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"fee" numeric(12, 2) NOT NULL,
	"net" numeric(12, 2) NOT NULL,
	"stripe_session_id" text,
	"download_token" text NOT NULL,
	"token_expires_at" timestamp NOT NULL,
	"zip_download_count" integer DEFAULT 0 NOT NULL,
	"reissue_count" integer DEFAULT 0 NOT NULL,
	"accessed_at" timestamp,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "sales_stripe_session_id_unique" UNIQUE("stripe_session_id"),
	CONSTRAINT "sales_download_token_unique" UNIQUE("download_token")
);
--> statement-breakpoint
CREATE TABLE "sellers" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"handle" text NOT NULL,
	"bio" text,
	"email" text NOT NULL,
	"stripe_account_id" text,
	"stripe_email" text,
	"stripe_connected" boolean DEFAULT false NOT NULL,
	"plan" text DEFAULT 'free' NOT NULL,
	"balance" numeric(12, 2) DEFAULT '0' NOT NULL,
	"rating" numeric(3, 2),
	"profile_image_pathname" text,
	"public_profile_enabled" boolean DEFAULT true NOT NULL,
	"email_on_sale" boolean DEFAULT true NOT NULL,
	"email_on_payout" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "sessions_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verifications" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "file_downloads" ADD CONSTRAINT "file_downloads_sale_id_sales_id_fk" FOREIGN KEY ("sale_id") REFERENCES "public"."sales"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "file_downloads" ADD CONSTRAINT "file_downloads_file_id_files_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."files"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "files" ADD CONSTRAINT "files_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "files" ADD CONSTRAINT "files_seller_id_sellers_id_fk" FOREIGN KEY ("seller_id") REFERENCES "public"."sellers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listings" ADD CONSTRAINT "listings_seller_id_sellers_id_fk" FOREIGN KEY ("seller_id") REFERENCES "public"."sellers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_seller_id_sellers_id_fk" FOREIGN KEY ("seller_id") REFERENCES "public"."sellers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payouts" ADD CONSTRAINT "payouts_seller_id_sellers_id_fk" FOREIGN KEY ("seller_id") REFERENCES "public"."sellers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales" ADD CONSTRAINT "sales_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales" ADD CONSTRAINT "sales_seller_id_sellers_id_fk" FOREIGN KEY ("seller_id") REFERENCES "public"."sellers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sellers" ADD CONSTRAINT "sellers_id_users_id_fk" FOREIGN KEY ("id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "file_downloads_sale_file_idx" ON "file_downloads" USING btree ("sale_id","file_id");--> statement-breakpoint
CREATE INDEX "files_listing_idx" ON "files" USING btree ("listing_id");--> statement-breakpoint
CREATE INDEX "listings_seller_idx" ON "listings" USING btree ("seller_id");--> statement-breakpoint
CREATE INDEX "notifications_seller_idx" ON "notifications" USING btree ("seller_id");--> statement-breakpoint
CREATE INDEX "sales_seller_idx" ON "sales" USING btree ("seller_id");--> statement-breakpoint
CREATE UNIQUE INDEX "sellers_handle_lower_idx" ON "sellers" USING btree ("handle");