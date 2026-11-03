-- AlterTable
ALTER TABLE "games" ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "games_isActive_idx" ON "games"("isActive");
