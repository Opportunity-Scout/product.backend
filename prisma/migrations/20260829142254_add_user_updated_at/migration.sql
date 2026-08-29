-- AlterTable
ALTER TABLE "users" ADD COLUMN     "updated_at" TIMESTAMP(3);

-- Backfill existing rows: no prior signal for "last changed", so
-- created_at is the closest honest value.
UPDATE "users" SET "updated_at" = "created_at" WHERE "updated_at" IS NULL;

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "updated_at" SET NOT NULL;
