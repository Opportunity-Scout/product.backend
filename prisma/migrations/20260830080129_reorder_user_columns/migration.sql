-- Rebuild "users" so its physical column order matches prisma/schema.prisma's
-- declared field order (id, telegram_user_id, telegram_username, role,
-- search_profile_limit, created_at, updated_at), grouping the two timestamp
-- columns together at the end for easier ad hoc inspection. Prisma's own diff
-- engine has no concept of column order for an existing table, so this is
-- hand-written rather than generated. No production user data exists yet
-- (confirmed before writing this), and no other table has a database-level
-- foreign key into "users" (SearchProfile.userId is a plain indexed column,
-- not a @relation) — so a straight drop-and-recreate is simpler and safer
-- than a rename/copy/drop dance that would try to preserve rows.
DROP TABLE "users";

CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "telegram_user_id" TEXT NOT NULL,
    "telegram_username" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'user',
    "search_profile_limit" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "users_telegram_user_id_key" ON "users"("telegram_user_id");
