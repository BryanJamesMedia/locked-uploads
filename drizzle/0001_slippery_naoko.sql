ALTER TABLE "sellers" ADD COLUMN "public_id" text;--> statement-breakpoint
UPDATE "sellers" SET "public_id" = substr(replace(gen_random_uuid()::text, '-', ''), 1, 10) WHERE "public_id" IS NULL;--> statement-breakpoint
ALTER TABLE "sellers" ALTER COLUMN "public_id" SET NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "sellers_public_id_idx" ON "sellers" USING btree ("public_id");
