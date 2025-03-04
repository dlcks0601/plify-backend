import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import axios from 'axios';

@Injectable()
export class PlaylistService {
  constructor(private readonly prisma: PrismaService) {}

  // 🎵 Spotify 액세스 토큰을 이용한 플레이리스트 추가
  async addPlaylist(userInfo: { userId: number }, playlistId: string) {
    // ✅ `userInfo.userId`가 DB의 Primary Key (user.id) 임
    const userId = userInfo.userId;

    // 🔎 이미 존재하는 플레이리스트인지 확인
    const existing = await this.prisma.playlist.findUnique({
      where: { playlistId },
    });

    if (existing) {
      throw new HttpException(
        'Playlist already exists',
        HttpStatus.BAD_REQUEST,
      );
    }

    // 🎶 플레이리스트 추가 (DB의 user.id 사용)
    return await this.prisma.playlist.create({
      data: {
        userId, // ✅ 여기서 DB의 user.id 사용!
        playlistId,
      },
    });
  }

  // 🔍 Spotify API 호출하여 유저 정보 가져오기
  private async getSpotifyUser(accessToken: string) {
    try {
      const response = await axios.get('https://api.spotify.com/v1/me', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      return {
        spotifyId: response.data.id,
        email: response.data.email || `${response.data.id}@spotify.com`,
        displayName: response.data.display_name || response.data.id,
        profileImageUrl: response.data.images?.[0]?.url || null,
      };
    } catch (error) {
      throw new HttpException(
        'Invalid Spotify access token',
        HttpStatus.UNAUTHORIZED,
      );
    }
  }

  // 🔍 전체 플레이리스트 조회
  async getAllPlaylists(user: any, queryDto: any) {
    try {
      const userId = user ? user.userId : null;
      const { limit = 20, cursor = 0 } = queryDto;

      const limitNum = Number(limit);
      const cursorNum = Number(cursor);

      const result = await this.prisma.playlist.findMany({
        orderBy: { id: 'desc' },
        where: cursorNum ? { id: { lt: cursorNum } } : {},
        take: limitNum,
        include: {
          _count: { select: { likes: true } },
          likes: userId
            ? { where: { userId }, select: { id: true } }
            : undefined,
          user: {
            select: {
              id: true,
              email: true,
              name: true,
              nickname: true,
              profile_url: true,
            },
          },
        },
      });

      const playlists = result.map((res) => this.getPlaylistObj(res, userId));
      const lastCursor =
        playlists.length > 0 ? playlists[playlists.length - 1].postId : null;

      return {
        playlists,
        pagination: { lastCursor },
        message: {
          code: 200,
          text: '전체 플레이리스트를 정상적으로 조회했습니다.',
        },
      };
    } catch (err) {
      console.error(err);
      throw new HttpException(
        '서버에서 오류가 발생했습니다.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // 🔍 단일 플레이리스트 조회
  async getPlaylist(postId: number, user: any) {
    try {
      const userId = user ? user.userId : null;
      const result = await this.prisma.playlist.findUnique({
        where: { id: postId },
        include: {
          _count: { select: { likes: true } },
          likes: userId
            ? { where: { userId }, select: { id: true } }
            : undefined,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              nickname: true,
              profile_url: true,
            },
          },
        },
      });

      if (!result) {
        throw new HttpException(
          '플레이리스트를 찾을 수 없습니다',
          HttpStatus.NOT_FOUND,
        );
      }

      const post = this.getPlaylistObj(result, userId);

      // 조회수 증가
      await this.prisma.playlist.update({
        where: { id: postId },
        data: { viewCount: { increment: 1 } },
      });

      return {
        post,
        message: {
          code: 200,
          text: '개별 플레이리스트를 정상적으로 조회했습니다.',
        },
      };
    } catch (err) {
      console.error(err);
      if (err instanceof HttpException) throw err;
      throw new HttpException(
        '서버에서 오류가 발생했습니다.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // 🎼 DB 결과 객체를 프론트에 전달할 형태로 변환
  getPlaylistObj(result: any, userId: number | null) {
    return {
      userId: result.user.id,
      userName: result.user.name,
      userNickname: result.user.nickname,
      userProfileUrl: result.user.profile_url,
      postId: result.id,
      playlistId: result.playlistId,
      likeCount: result._count.likes,
      viewCount: result.viewCount,
      createdAt: result.createdAt,
    };
  }
}
