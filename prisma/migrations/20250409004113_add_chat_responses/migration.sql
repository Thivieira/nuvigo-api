/*
  Warnings:

  - You are about to drop the column `condition` on the `Chat` table. All the data in the column will be lost.
  - You are about to drop the column `location` on the `Chat` table. All the data in the column will be lost.
  - You are about to drop the column `naturalResponse` on the `Chat` table. All the data in the column will be lost.
  - You are about to drop the column `temperature` on the `Chat` table. All the data in the column will be lost.
  - Added the required column `message` to the `Chat` table without a default value. This is not possible if the table is not empty.
  - Added the required column `response` to the `Chat` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Chat" DROP COLUMN "condition",
DROP COLUMN "location",
DROP COLUMN "naturalResponse",
DROP COLUMN "temperature",
ADD COLUMN     "message" TEXT NOT NULL,
ADD COLUMN     "metadata" JSONB,
ADD COLUMN     "response" TEXT NOT NULL;
