/*
  Warnings:

  - A unique constraint covering the columns `[spotifyId]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE `User` ADD COLUMN `spotifyId` VARCHAR(191) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `User_spotifyId_key` ON `User`(`spotifyId`);
