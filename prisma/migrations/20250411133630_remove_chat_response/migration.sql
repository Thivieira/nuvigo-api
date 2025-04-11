/*
  Warnings:

  - You are about to drop the column `response` on the `Chat` table. All the data in the column will be lost.
  - Added the required column `turn` to the `Chat` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Chat" DROP COLUMN "response",
ADD COLUMN     "role" TEXT NOT NULL DEFAULT 'user',
ADD COLUMN     "turn" INTEGER NOT NULL;

-- CreateIndex
CREATE INDEX "Chat_role_turn_idx" ON "Chat"("role", "turn");
