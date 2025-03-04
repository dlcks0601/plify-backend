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
    @Body() body: { spotifyPlaylistUrl: string },
    @Headers('authorization') authHeader: string,
  ) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new HttpException(
        'Missing or invalid authorization token',
        HttpStatus.UNAUTHORIZED,
      );
    }

    // 🎫 Bearer 토큰에서 Spotify 액세스 토큰 추출
    const accessToken = authHeader.replace('Bearer ', '');

    // 🎵 Spotify API 호출하여 유저 정보 가져오기
    const spotifyUser = await this.getSpotifyUser(accessToken);

    // 🎶 플레이리스트 ID 추출
    const playlistId = this.extractPlaylistId(body.spotifyPlaylistUrl);

    // 🆕 플레이리스트 추가
    return await this.playlistService.addPlaylist(
      spotifyUser.spotifyId,
      playlistId,
    );
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

  // 🎧 Spotify 사용자 정보 조회
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
