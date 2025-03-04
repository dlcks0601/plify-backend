import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class PlaylistLikeService {
  constructor(private prisma: PrismaService) {}

  // 🎵 좋아요 추가/취소 (토글 방식)
  async toggleLike(postId: number, userId: number) {
    return await this.prisma.$transaction(async (tx) => {
      // 🎶 해당 플레이리스트가 존재하는지 확인
      const playlist = await tx.playlist.findUnique({ where: { id: postId } });

      if (!playlist) {
        throw new HttpException('Playlist not found', HttpStatus.NOT_FOUND);
      }

      // 🔍 현재 사용자가 이미 좋아요를 눌렀는지 확인
      const existingLike = await tx.playlistLike.findUnique({
        where: { userId_postId: { userId, postId } },
      });

      if (existingLike) {
        // 🎵 이미 좋아요 했으면 취소 (삭제)
        await tx.playlistLike.delete({
          where: { userId_postId: { userId, postId } },
        });

        // 🔻 좋아요 개수 감소
        await tx.playlist.update({
          where: { id: postId },
          data: { likeCount: { decrement: 1 } },
        });

        return { message: { code: 200, text: '좋아요 취소' }, isLiked: false };
      } else {
        // ❤️ 좋아요 추가
        await tx.playlistLike.create({ data: { userId, postId } });

        // 🔺 좋아요 개수 증가
        await tx.playlist.update({
          where: { id: postId },
          data: { likeCount: { increment: 1 } },
        });

        return { message: { code: 200, text: '좋아요 추가' }, isLiked: true };
      }
    });
  }

  // 🎵 좋아요 상태 확인
  async getLikeStatus(postId: number, userId: number) {
    const existingLike = await this.prisma.playlistLike.findUnique({
      where: { userId_postId: { userId, postId } },
    });

    return {
      message: { code: 200, text: '좋아요 상태 확인.' },
      isLiked: !!existingLike,
    };
  }

  // 🔎 Spotify 유저 찾기 또는 생성
  async findOrCreateUser(spotifyData: any) {
    let user = await this.prisma.user.findUnique({
      where: { spotifyId: spotifyData.id },
    });

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          spotifyId: spotifyData.id,
          email: spotifyData.email || `${spotifyData.id}@spotify.com`,
          name: spotifyData.display_name || spotifyData.id,
          nickname: spotifyData.display_name || spotifyData.id,
          profile_url: spotifyData.images?.[0]?.url || null,
          auth_provider: 'spotify',
        },
      });
    }

    return user;
  }
}
