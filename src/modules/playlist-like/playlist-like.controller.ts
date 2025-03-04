import {
  Controller,
  Post,
  Get,
  Param,
  Headers,
  HttpException,
  HttpStatus,
  ParseIntPipe,
} from '@nestjs/common';
import { PlaylistLikeService } from './playlist-like.service';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import axios from 'axios';

@ApiTags('Playlist Likes')
@Controller('playlists/:postId/like')
export class PlaylistLikeController {
  constructor(private readonly playlistLikeService: PlaylistLikeService) {}

  // 🎵 좋아요 추가/취소 (토글 방식)
  @Post()
  @ApiOperation({
    summary: '플레이리스트 좋아요 추가/취소',
    description: '사용자가 특정 플레이리스트에 좋아요를 추가하거나 취소합니다.',
  })
  @ApiResponse({ status: 200, description: '좋아요 토글 성공' })
  @ApiParam({ name: 'postId', type: 'number', description: '플레이리스트 ID' })
  async toggleLike(
    @Param('postId', ParseIntPipe) postId: number,
    @Headers('authorization') authHeader: string,
  ) {
    const userInfo = await this.getSpotifyUser(authHeader);
    return await this.playlistLikeService.toggleLike(postId, userInfo.userId);
  }

  // 🎵 좋아요 상태 확인
  @Get()
  @ApiOperation({
    summary: '좋아요 상태 확인',
    description:
      '사용자가 특정 플레이리스트에 대해 좋아요를 눌렀는지 여부를 확인합니다.',
  })
  @ApiResponse({ status: 200, description: '좋아요 상태 확인 성공' })
  @ApiParam({ name: 'postId', type: 'number', description: '플레이리스트 ID' })
  async getLikeStatus(
    @Param('postId', ParseIntPipe) postId: number,
    @Headers('authorization') authHeader: string,
  ) {
    const userInfo = await this.getSpotifyUser(authHeader);
    return await this.playlistLikeService.getLikeStatus(
      postId,
      userInfo.userId,
    );
  }

  // 🎧 Spotify 사용자 정보 조회
  private async getSpotifyUser(authHeader: string) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new HttpException(
        'Missing or invalid authorization token',
        HttpStatus.UNAUTHORIZED,
      );
    }
    const accessToken = authHeader.replace('Bearer ', '');

    try {
      const response = await axios.get('https://api.spotify.com/v1/me', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      // 🔎 DB에서 유저 찾기 (spotifyId 기준)
      const user = await this.playlistLikeService.findOrCreateUser(
        response.data,
      );

      return { userId: user.id }; // ✅ DB의 user.id 반환!
    } catch (error) {
      throw new HttpException(
        'Invalid Spotify access token',
        HttpStatus.UNAUTHORIZED,
      );
    }
  }
}
