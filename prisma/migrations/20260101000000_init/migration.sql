-- CreateEnum
CREATE TYPE "FileType" AS ENUM ('COVER', 'MANUAL', 'RULEBOOK', 'ERRATA', 'QUICK_REFERENCE', 'IMAGE', 'OTHER');

-- CreateTable
CREATE TABLE "admin_users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admin_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "site_configs" (
    "id" TEXT NOT NULL,
    "hideDesigners" BOOLEAN NOT NULL DEFAULT true,
    "hidePublishers" BOOLEAN NOT NULL DEFAULT false,
    "hideArtists" BOOLEAN NOT NULL DEFAULT false,
    "hideTags" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "site_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "games" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "originalName" TEXT,
    "description" TEXT,
    "year" INTEGER,
    "minPlayers" INTEGER,
    "maxPlayers" INTEGER,
    "minPlaytime" INTEGER,
    "publisher" TEXT,
    "designer" TEXT,
    "artist" TEXT,
    "bggRating" DOUBLE PRECISION,
    "ludoRating" DOUBLE PRECISION,
    "bggRank" INTEGER,
    "weight" DOUBLE PRECISION,
    "bestPlayers" INTEGER,
    "minAge" INTEGER,
    "coverImage" TEXT,
    "notes" TEXT,
    "mechanics" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "categories" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "links" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "downtime" DOUBLE PRECISION,
    "interaction" DOUBLE PRECISION,
    "luck" DOUBLE PRECISION,
    "replayability" DOUBLE PRECISION,
    "preparationText" TEXT,
    "coverImageData" JSONB,
    "ludoRank" INTEGER,

    CONSTRAINT "games_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "game_files" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "extension" TEXT NOT NULL,
    "size" BIGINT NOT NULL,
    "path" TEXT NOT NULL,
    "type" "FileType" NOT NULL DEFAULT 'OTHER',
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "game_files_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "admin_users_email_key" ON "admin_users"("email");

-- CreateIndex
CREATE INDEX "games_name_idx" ON "games"("name");

-- CreateIndex
CREATE INDEX "games_year_idx" ON "games"("year");

-- CreateIndex
CREATE INDEX "games_designer_idx" ON "games"("designer");

-- CreateIndex
CREATE INDEX "games_publisher_idx" ON "games"("publisher");

-- CreateIndex
CREATE INDEX "games_createdAt_idx" ON "games"("createdAt");

-- CreateIndex
CREATE INDEX "game_files_gameId_idx" ON "game_files"("gameId");

-- AddForeignKey
ALTER TABLE "game_files" ADD CONSTRAINT "game_files_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "games"("id") ON DELETE CASCADE ON UPDATE CASCADE;
