import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, StrategyOptions, VerifyCallback } from 'passport-spotify';
import { SpotifyAuthDto } from '../dto/spotify-auth.dto';

@Injectable()
export class SpotifyStrategy extends PassportStrategy(Strategy, 'spotify') {
  constructor() {
    super({
      clientID: process.env.SPOTIFY_CLIENT_ID,
      clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
      callbackURL: process.env.SPOTIFY_REDIRECT_URI,
      // 기존 스코프에 'user-top-read' 추가
      scope: [
        'user-read-email',
        'user-read-private',
        'user-top-read',
        'streaming',
        'user-read-playback-state',
        'user-modify-playback-state',
        'user-read-currently-playing',
      ],
      passReqToCallback: false,
    } as StrategyOptions);
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: VerifyCallback,
  ): Promise<any> {
    // Spotify 프로필 정보를 SpotifyAuthDto 형식으로 매핑
    const spotifyUser: SpotifyAuthDto = {
      spotifyId: profile.id,
      email: profile.emails?.[0]?.value || `${profile.id}@spotify.com`,
      displayName: profile.displayName || profile.id,
      profileImageUrl: profile.photos?.[0] || null,
    };
    return spotifyUser;
  }
}
