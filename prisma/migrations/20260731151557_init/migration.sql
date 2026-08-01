-- CreateEnum
CREATE TYPE "SearchProfileStatus" AS ENUM ('active', 'paused', 'archived');

-- CreateTable
CREATE TABLE "search_profiles" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "SearchProfileStatus" NOT NULL,
    "preferences" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_matched_at" TIMESTAMP(3),

    CONSTRAINT "search_profiles_pkey" PRIMARY KEY ("id")
);
