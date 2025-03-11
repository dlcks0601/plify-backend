import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import axios from 'axios';
import { PrismaService } from 'src/prisma/prisma.service';
import { AuthUserDto } from './dto/auth-user.dto';
import { SpotifyAuthDto } from './dto/spotify-auth.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
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
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        },
      );
      // 토큰 응답 데이터에서 access_token, refresh_token 추출
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

      // 기존 유저 찾기 또는 업데이트
      let user = await this.prisma.user.findUnique({
        where: { spotifyId: spotifyUser.spotifyId },
      });

      if (user) {
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
        // 신규 유저 생성
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

      const responseUser = this.filterUserFields(user);
      // 여기서는 리프레시 토큰은 반환하되, 저장하지 않습니다.
      return {
        user: responseUser,
        accessToken: access_token,
        refreshToken: refresh_token, // 클라이언트에 전달 (클라이언트가 보관)
      };
    } catch (error) {
      console.error(error);
      throw new HttpException('스포티파이 인증 실패', HttpStatus.BAD_REQUEST);
    }
  }

  async signup(email: string, nickname: string, password: string) {
    const existingUserByEmail = await this.prisma.user.findUnique({
      where: { email },
    });
    if (existingUserByEmail) {
      throw new HttpException('Email already exists', HttpStatus.BAD_REQUEST);
    }
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
    // refresh token은 생성은 하되, 저장하지 않습니다.
    const refreshToken = this.generateRefreshToken(user.id);
    const responseUser = this.filterUserFields(user);
    return {
      user: responseUser,
      accessToken,
      refreshToken,
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

  async renewAccessToken(
    userId: number,
    providedRefreshToken: string,
  ): Promise<{ accessToken: string; provider: string }> {
    // 사용자 정보 조회
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }

    if (user.auth_provider === 'spotify') {
      // Spotify 로그인 사용자는, 클라이언트가 제공한 refresh token을 사용하여 토큰 갱신 요청
      const params = new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: providedRefreshToken,
        client_id: process.env.SPOTIFY_CLIENT_ID!,
        client_secret: process.env.SPOTIFY_CLIENT_SECRET!,
      });
      try {
        const spotifyResponse = await axios.post(
          'https://accounts.spotify.com/api/token',
          params.toString(),
          {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          },
        );
        const newAccessToken = spotifyResponse.data.access_token;
        console.log(`Spotify 새로운 access token: ${newAccessToken}`);
        return { accessToken: newAccessToken, provider: 'spotify' };
      } catch (error) {
        console.error('Spotify 토큰 갱신 실패:', error);
        throw new HttpException(
          'Spotify 토큰 갱신 실패',
          HttpStatus.UNAUTHORIZED,
        );
      }
    } else {
      // 일반 로그인 사용자의 경우, 클라이언트가 제공한 refresh token을 검증
      try {
        const payload = this.jwtService.verify(providedRefreshToken, {
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
      console.log(`새로운 access token 발급: ${newAccessToken}`);
      return { accessToken: newAccessToken, provider: 'plify' };
    }
  }
}
