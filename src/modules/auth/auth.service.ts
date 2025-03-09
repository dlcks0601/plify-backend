import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import axios from 'axios';
import { RedisService } from '../redis/redis.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { AuthUserDto } from './dto/auth-user.dto';
import { SpotifyAuthDto } from './dto/spotify-auth.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly redisService: RedisService,
  ) {}

  async handleSpotifyCallback(code: string) {
    try {
      const params = new URLSearchParams({
        code,
        client_id: process.env.SPOTIFY_CLIENT_ID!,
        client_secret: process.env.SPOTIFY_CLIENT_SECRET!,
        redirect_uri: process.env.SPOTIFY_REDIRECT_URI!,
        grant_type: 'authorization_code',
      });

      const tokenResponse = await axios.post(
        'https://accounts.spotify.com/api/token',
        params,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        },
      );
      // console.log(tokenResponse.data); 토큰 리스폰스 데이터

      const { access_token, refresh_token } = tokenResponse.data;

      console.log('스포티파이 리프레시 토큰:', refresh_token);
      console.log('스포티파이 엑세스 토큰:', access_token);

      const userInfoResponse = await axios.get(
        'https://api.spotify.com/v1/me',
        {
          headers: { Authorization: `Bearer ${access_token}` },
        },
      );

      const userData = userInfoResponse.data;

      console.log('스포티파이 유저 정보:', userData);

      if (!userData.id) {
        throw new Error('Spotify 사용자 ID를 가져올 수 없음');
      }

      // Spotify 데이터 DTO 매핑
      const spotifyUser: SpotifyAuthDto = {
        spotifyId: userData.id,
        email: userData.email || `${userData.id}@spotify.com`,
        displayName: userData.display_name || userData.id,
        profileImageUrl: userData.images?.[0]?.url || null,
        followersCount: userData.followers?.total || 0,
      };

      const followersCount =
        userData.followers && typeof userData.followers === 'object'
          ? userData.followers.total || 0
          : 0;

      // ✅ **유저 찾기 또는 업데이트**
      let user = await this.prisma.user.findUnique({
        where: { spotifyId: spotifyUser.spotifyId },
      });

      if (user) {
        // 🔄 **기존 유저 정보 최신화**
        user = await this.prisma.user.update({
          where: { id: user.id },
          data: {
            email: spotifyUser.email,
            name: spotifyUser.displayName,
            profile_url: spotifyUser.profileImageUrl,
            followersCount,
          },
        });

        console.log(`✅ 유저 ${user.id} 정보 업데이트 완료`);
      } else {
        // 🆕 **신규 유저 생성**
        let finalNickname = spotifyUser.displayName;
        let isNicknameTaken = await this.prisma.user.findUnique({
          where: { nickname: finalNickname },
        });

        while (isNicknameTaken) {
          const randomNumber = Math.floor(1000 + Math.random() * 9000);
          finalNickname = `${spotifyUser.displayName}${randomNumber}`;
          isNicknameTaken = await this.prisma.user.findUnique({
            where: { nickname: finalNickname },
          });
        }

        user = await this.prisma.user.create({
          data: {
            spotifyId: spotifyUser.spotifyId,
            email: spotifyUser.email,
            name: spotifyUser.displayName,
            nickname: finalNickname,
            profile_url: spotifyUser.profileImageUrl,
            followersCount: spotifyUser.followersCount,
            auth_provider: 'spotify',
          },
        });

        console.log(`🆕 신규 유저 생성: ${user.id}`);
      }

      // refresh_token이 반환되지 않는 경우 Redis에 저장된 값을 사용
      let finalRefreshToken = refresh_token;
      if (!finalRefreshToken) {
        finalRefreshToken = await this.redisService.get(
          `refresh_token:${user.id}`,
        );
      }

      // refresh token이 존재하면 Redis에 저장 (새로운 값이 있더라도 업데이트)
      if (finalRefreshToken) {
        await this.storeRefreshToken(user.id, finalRefreshToken);
      } else {
        console.warn('Spotify refresh token이 존재하지 않습니다.');
      }
      const responseUser = this.filterUserFields(user);
      return {
        user: responseUser,
        accessToken: access_token,
        refreshToken: refresh_token,
      };
    } catch (error) {
      console.error(error);
      throw new HttpException('스포티파이 인증 실패', HttpStatus.BAD_REQUEST);
    }
  }

  async findOrCreateSpotifyUser(spotifyUser: SpotifyAuthDto) {
    // ① spotifyId로 기존 유저 확인
    let existingUser = await this.prisma.user.findUnique({
      where: { spotifyId: spotifyUser.spotifyId },
    });
    if (existingUser) {
      return existingUser;
    }

    // ② 이메일로 기존 유저 확인
    existingUser = await this.prisma.user.findUnique({
      where: { email: spotifyUser.email },
    });
    if (existingUser) {
      // 이미 로컬로 가입한 경우 스포티파이로 로그인할 수 없도록 처리
      if (existingUser.auth_provider !== 'spotify') {
        throw new HttpException(
          '해당 이메일은 다른 인증 방식으로 등록되어 있습니다.',
          HttpStatus.BAD_REQUEST,
        );
      }
      return existingUser;
    }

    // ③ 닉네임 중복 확인 및 유니크한 닉네임 생성
    let finalNickname = spotifyUser.displayName;
    let isNicknameTaken = await this.prisma.user.findUnique({
      where: { nickname: finalNickname },
    });
    while (isNicknameTaken) {
      const randomNumber = Math.floor(1000 + Math.random() * 9000);
      finalNickname = `${spotifyUser.displayName}${randomNumber}`;
      isNicknameTaken = await this.prisma.user.findUnique({
        where: { nickname: finalNickname },
      });
    }

    // ④ Spotify 인증 유저 생성
    return this.prisma.user.create({
      data: {
        spotifyId: spotifyUser.spotifyId,
        email: spotifyUser.email,
        name: spotifyUser.displayName,
        nickname: finalNickname,
        profile_url: spotifyUser.profileImageUrl,
        auth_provider: 'spotify',
      },
    });
  }

  async signup(email: string, nickname: string, password: string) {
    // 이메일 중복 확인
    const existingUserByEmail = await this.prisma.user.findUnique({
      where: { email },
    });
    if (existingUserByEmail) {
      throw new HttpException('Email already exists', HttpStatus.BAD_REQUEST);
    }

    // 닉네임 중복 확인 및 처리
    let uniqueNickname = nickname;
    let isNicknameUnique = false;
    while (!isNicknameUnique) {
      const existingUserByNickname = await this.prisma.user.findUnique({
        where: { nickname: uniqueNickname },
      });
      if (!existingUserByNickname) {
        isNicknameUnique = true;
      } else {
        uniqueNickname = `${nickname}_${Math.floor(1000 + Math.random() * 9000)}`;
      }
    }

    const newUser = await this.prisma.user.create({
      data: {
        email,
        name: uniqueNickname,
        nickname: uniqueNickname,
        password,
        auth_provider: 'plify',
      },
    });

    return {
      userId: newUser.id,
      email: newUser.email,
      nickname: newUser.nickname,
    };
  }

  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new HttpException(
        '유효하지 않은 이메일 혹은 비밀번호 입니다',
        HttpStatus.FORBIDDEN,
      );
    }
    if (user.auth_provider !== 'plify') {
      throw new HttpException(
        '해당 계정은 로컬 인증 방식으로 등록되어 있지 않습니다. Spotify로 로그인 해주세요.',
        HttpStatus.FORBIDDEN,
      );
    }
    if (user.password !== password) {
      throw new HttpException(
        '유효하지 않은 이메일 혹은 비밀번호 입니다',
        HttpStatus.FORBIDDEN,
      );
    }

    const accessToken = this.generateAccessToken(user.id);
    const refreshToken = this.generateRefreshToken(user.id);

    await this.storeRefreshToken(user.id, refreshToken);
    const responseUser = this.filterUserFields(user);
    return {
      user: responseUser,
      accessToken,
    };
  }

  private filterUserFields(user: any) {
    return {
      userId: user.id,
      email: user.email,
      name: user.name,
      nickname: user.nickname,
      profileUrl: user.profile_url,
      authProvider: user.auth_provider,
    };
  }

  private async checkUserExist(email: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    return !!user;
  }

  async findOrCreateUser(profile: AuthUserDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: profile.email },
    });
    if (existingUser) {
      return existingUser;
    }
    let finalNickname = profile.nickname;
    let isNicknameTaken = await this.prisma.user.findUnique({
      where: { nickname: finalNickname },
    });
    while (isNicknameTaken) {
      const randomNumber = Math.floor(1000 + Math.random() * 9000);
      finalNickname = `${profile.nickname}${randomNumber}`;
      isNicknameTaken = await this.prisma.user.findUnique({
        where: { nickname: finalNickname },
      });
    }
    return this.prisma.user.create({
      data: {
        email: profile.email,
        name: profile.name,
        nickname: finalNickname,
        profile_url: profile.profile_url,
        auth_provider: profile.auth_provider,
      },
    });
  }

  generateAccessToken(userId: number): string {
    console.log(`Access Token 생성: userId=${userId}`);
    return this.jwtService.sign(
      { userId },
      { expiresIn: '15m', secret: process.env.ACCESS_TOKEN_SECRET },
    );
  }

  generateRefreshToken(userId: number): string {
    console.log(`Refresh Token 생성: userId=${userId}`);
    return this.jwtService.sign(
      { userId },
      { expiresIn: '7d', secret: process.env.REFRESH_TOKEN_SECRET },
    );
  }

  async storeRefreshToken(userId: number, refreshToken: string): Promise<void> {
    const key = `refresh_token:${userId}`;
    const ttl = 7 * 24 * 60 * 60; // 7일
    console.log(
      `Redis에 Refresh Token 저장: key=${key}, token=${refreshToken}`,
    );
    await this.redisService.set(key, refreshToken, ttl);
  }

  async renewAccessToken(
    userId: number,
  ): Promise<{ accessToken: string; provider: string }> {
    // 사용자 정보 조회
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }

    // Spotify 로그인 사용자라면
    if (user.auth_provider === 'spotify') {
      const redisKey = `refresh_token:${userId}`;
      const spotifyRefreshToken = await this.redisService.get(redisKey);
      if (!spotifyRefreshToken) {
        throw new HttpException(
          'Spotify refresh token not found',
          HttpStatus.BAD_REQUEST,
        );
      }

      // Spotify 토큰 갱신 요청
      const params = new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: spotifyRefreshToken,
        client_id: process.env.SPOTIFY_CLIENT_ID!,
        client_secret: process.env.SPOTIFY_CLIENT_SECRET!,
      });

      try {
        const spotifyResponse = await axios.post(
          'https://accounts.spotify.com/api/token',
          params.toString(),
          {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
          },
        );
        const newAccessToken = spotifyResponse.data.access_token;
        console.log(`Spotify에서 새로운 access token 발급: ${newAccessToken}`);
        return { accessToken: newAccessToken, provider: 'spotify' };
      } catch (error) {
        console.error('Spotify 토큰 갱신 실패:', error);
        throw new HttpException(
          'Spotify 토큰 갱신에 실패했습니다.',
          HttpStatus.UNAUTHORIZED,
        );
      }
    } else {
      // 일반 로그인 사용자의 경우 기존 로직 수행
      const redisKey = `refresh_token:${userId}`;
      const refreshToken = await this.redisService.get(redisKey);
      if (!refreshToken) {
        throw new HttpException(
          'Refresh token not found for user',
          HttpStatus.BAD_REQUEST,
        );
      }
      try {
        const payload = this.jwtService.verify(refreshToken, {
          secret: process.env.REFRESH_TOKEN_SECRET,
          algorithms: ['HS256'],
        });
        if (payload.userId !== userId) {
          throw new HttpException(
            'Invalid refresh token',
            HttpStatus.UNAUTHORIZED,
          );
        }
      } catch (error: any) {
        if (error.name === 'TokenExpiredError') {
          throw new HttpException(
            'Refresh token has expired',
            HttpStatus.BAD_REQUEST,
          );
        }
        throw new HttpException(
          'Refresh token validation failed',
          HttpStatus.UNAUTHORIZED,
        );
      }
      const newAccessToken = this.jwtService.sign(
        { userId },
        { expiresIn: '15m', secret: process.env.ACCESS_TOKEN_SECRET },
      );
      console.log(
        `일반 로그인 사용자의 새로운 access token 발급: ${newAccessToken}`,
      );
      return { accessToken: newAccessToken, provider: 'plify' };
    }
  }

  async deleteRefreshToken(userId: number): Promise<void> {
    const key = `refresh_token:${userId}`;
    await this.redisService.del(key);
  }
}
