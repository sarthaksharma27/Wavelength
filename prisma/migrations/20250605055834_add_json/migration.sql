/*
  Warnings:

  - You are about to drop the column `roomIds` on the `User` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "User" DROP COLUMN "roomIds",
ADD COLUMN     "roomData" JSONB DEFAULT '[]';
