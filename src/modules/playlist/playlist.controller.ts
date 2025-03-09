import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Req,
  Query,
  Headers,
  HttpException,
  HttpStatus,
  Delete,
} from '@nestjs/common';
import { PlaylistService } from './playlist.service';
import { GetPlaylistsQueryDto } from './dto/getPlaylistsQuery.dto';
import axios from 'axios';

@Controller('playlists')
export class PlaylistController {
  constructor(private readonly playlistService: PlaylistService) {}

  // 🎵 Spotify 액세스 토큰을 사용한 플레이리스트 추가
  @Post()
  async addPlaylist(
    @Body() body: { spotifyPlaylistUrl: string; userId: number }, // ✅ `userId` 직접 받음
  ) {
    console.log('🟢 받은 요청 body:', body); // 디버깅 로그

    if (!body.userId) {
      throw new HttpException('User ID is missing', HttpStatus.BAD_REQUEST);
    }

    // ✅ 플레이리스트 ID 추출
    const playlistId = this.extractPlaylistId(body.spotifyPlaylistUrl);

    // ✅ `userId`를 사용해 플레이리스트 추가
    return await this.playlistService.addPlaylist(body.userId, playlistId);
  }

  // 🔍 전체 플레이리스트 조회
  @Get()
  async getPlaylists(@Req() req, @Query() queryDto: GetPlaylistsQueryDto) {
    return await this.playlistService.getAllPlaylists(req.user, queryDto);
  }

  // 🎵 단일 플레이리스트 조회
  @Get(':postId')
  async getPlaylist(@Param('postId') postId: string, @Req() req) {
    return await this.playlistService.getPlaylist(Number(postId), req.user);
  }

  @Delete(':postId')
  async deletePlaylist(
    @Param('postId') postId: string,
    @Body() body: { userId: number }, // ✅ 삭제 요청한 유저의 `userId` 받기
  ) {
    console.log('🗑️ 받은 삭제 요청:', { postId, userId: body.userId });

    if (!body.userId) {
      throw new HttpException('User ID is required', HttpStatus.BAD_REQUEST);
    }

    return await this.playlistService.deletePlaylist(
      Number(postId),
      body.userId,
    );
  }

  // 🎼 URL에서 Spotify 플레이리스트 ID 추출
  private extractPlaylistId(url: string): string {
    const regex = /playlist\/([a-zA-Z0-9]+)/;
    const match = url.match(regex);
    if (match && match[1]) {
      return match[1];
    }
    throw new HttpException(
      'Invalid Spotify playlist URL',
      HttpStatus.BAD_REQUEST,
    );
  }
}
