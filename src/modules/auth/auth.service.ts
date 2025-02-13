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
      // Spotify 액세스 토큰 발급 요청 (URL 인코딩 방식)
      const params = new URLSearchParams({
        code,
        client_id: process.env.SPOTIFY_CLIENT_ID!, // 값이 반드시 존재함을 보장
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
      const { access_token } = tokenResponse.data;
      console.log('Spotify Access Token:', access_token);

      // Spotify 사용자 정보 요청
      const userInfoResponse = await axios.get(
        'https://api.spotify.com/v1/me',
        {
          headers: { Authorization: `Bearer ${access_token}` },
        },
      );
      const userData = userInfoResponse.data;
      console.log('Spotify User Data:', userData);

      if (!userData.id) {
        throw new Error('Spotify 사용자 ID를 가져올 수 없음');
      }

      // Spotify 데이터 DTO 매핑
      const spotifyUser: SpotifyAuthDto = {
        spotifyId: userData.id,
        email: userData.email || `${userData.id}@spotify.com`,
        displayName: userData.display_name || userData.id,
        profileImageUrl: userData.images?.[0]?.url || null,
      };

      // 기존 유저 존재 여부 확인 (이메일)
      const isExistingUser = await this.checkUserExist(spotifyUser.email);

      // Spotify 유저 찾기 또는 생성
      const user = await this.findOrCreateSpotifyUser(spotifyUser);

      // JWT 액세스 토큰 및 리프레시 토큰 생성
      const accessToken = this.generateAccessToken(user.id);
      const refreshToken = this.generateRefreshToken(user.id);

      // Redis에 리프레시 토큰 저장
      await this.storeRefreshToken(user.id, refreshToken);

      const responseUser = this.filterUserFields(user);

      return {
        user: responseUser,
        accessToken,
        refreshToken,
        isExistingUser,
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

    // ④ Spotify 인증 유저 생성 (비밀번호 없이 생성)
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

    // 로컬 회원가입 (auth_provider를 'local'로 지정)
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

  async renewAccessToken(userId: number): Promise<string> {
    const redisKey = `refresh_token:${userId}`;
    const refreshToken = await this.redisService.get(redisKey);
    if (!refreshToken) {
      console.error(`No refresh token found for Redis key: ${redisKey}`);
      throw new HttpException(
        'Refresh token not found for user',
        HttpStatus.BAD_REQUEST,
      );
    }
    console.log(`Retrieved refresh token from Redis: ${refreshToken}`);
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: process.env.REFRESH_TOKEN_SECRET,
        algorithms: ['HS256'],
      });
      console.log('Decoded payload:', payload);
      if (payload.userId !== userId) {
        console.error(
          `Token userId mismatch. Expected: ${userId}, Got: ${payload.userId}`,
        );
        throw new Error('Invalid refresh token');
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
    console.log(`Generated new access token: ${newAccessToken}`);
    return newAccessToken;
  }

  async deleteRefreshToken(userId: number): Promise<void> {
    const key = `refresh_token:${userId}`;
    await this.redisService.del(key);
  }
}
