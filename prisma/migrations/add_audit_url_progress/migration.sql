-- AlterTable
ALTER TABLE "Audit" ADD COLUMN "url" TEXT NOT NULL DEFAULT '',
ADD COLUMN "progress" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "score" INTEGER;

-- Update existing records to have non-null url
UPDATE "Audit" SET "url" = '' WHERE "url" IS NULL;
