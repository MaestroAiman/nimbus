DROP INDEX "folders_owner_parent_name_idx";--> statement-breakpoint
ALTER TABLE "folders" ADD COLUMN "is_favorite" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "folders" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "files" ADD COLUMN "is_favorite" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "files" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
CREATE UNIQUE INDEX "folders_owner_parent_name_idx" ON "folders" USING btree ("owner_id","parent_id","name") WHERE "folders"."deleted_at" is null;