/*
  Warnings:

  - You are about to drop the column `likes` on the `Playlist` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `Playlist` DROP COLUMN `likes`;

-- CreateTable
CREATE TABLE `PlaylistLike` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `playlistId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `PlaylistLike_userId_playlistId_key`(`userId`, `playlistId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `PlaylistLike` ADD CONSTRAINT `PlaylistLike_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PlaylistLike` ADD CONSTRAINT `PlaylistLike_playlistId_fkey` FOREIGN KEY (`playlistId`) REFERENCES `Playlist`(`playlistId`) ON DELETE CASCADE ON UPDATE CASCADE;
