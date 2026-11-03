/*
  Warnings:

  - You are about to drop the column `maxPlaytime` on the `games` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "games" DROP COLUMN "maxPlaytime",
ADD COLUMN     "downtime" DOUBLE PRECISION,
ADD COLUMN     "interaction" DOUBLE PRECISION,
ADD COLUMN     "luck" DOUBLE PRECISION,
ADD COLUMN     "replayability" DOUBLE PRECISION;
