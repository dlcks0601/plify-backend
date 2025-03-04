/*
  Warnings:

  - You are about to drop the column `playlistId` on the `Comment` table. All the data in the column will be lost.
  - You are about to drop the column `playlistId` on the `PlaylistLike` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[userId,postId]` on the table `PlaylistLike` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `postId` to the `Comment` table without a default value. This is not possible if the table is not empty.
  - Added the required column `postId` to the `PlaylistLike` table without a default value. This is not possible if the table is not empty.
*/

-- DropForeignKey from Comment table for playlistId
ALTER TABLE `Comment` DROP FOREIGN KEY `Comment_playlistId_fkey`;

-- DropForeignKey from PlaylistLike table for playlistId and userId
ALTER TABLE `PlaylistLike` DROP FOREIGN KEY `PlaylistLike_playlistId_fkey`;
ALTER TABLE `PlaylistLike` DROP FOREIGN KEY `PlaylistLike_userId_fkey`;

-- Drop indexes related to playlistId on Comment and PlaylistLike
DROP INDEX `Comment_playlistId_fkey` ON `Comment`;
DROP INDEX `PlaylistLike_playlistId_fkey` ON `PlaylistLike`;
DROP INDEX `PlaylistLike_userId_playlistId_key` ON `PlaylistLike`;

-- Alter Comment table: Drop column playlistId, add column postId
ALTER TABLE `Comment`
  DROP COLUMN `playlistId`,
  ADD COLUMN `postId` INTEGER NOT NULL;

-- Alter PlaylistLike table: Drop column playlistId, add column postId
ALTER TABLE `PlaylistLike`
  DROP COLUMN `playlistId`,
  ADD COLUMN `postId` INTEGER NOT NULL;

-- Create unique index on PlaylistLike for (userId, postId)
CREATE UNIQUE INDEX `PlaylistLike_userId_postId_key` ON `PlaylistLike`(`userId`, `postId`);

-- Add foreign key constraint for Comment table on postId
ALTER TABLE `Comment`
  ADD CONSTRAINT `Comment_postId_fkey` FOREIGN KEY (`postId`) REFERENCES `Playlist`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- Add foreign key constraint for PlaylistLike table on postId
ALTER TABLE `PlaylistLike`
  ADD CONSTRAINT `PlaylistLike_postId_fkey` FOREIGN KEY (`postId`) REFERENCES `Playlist`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;