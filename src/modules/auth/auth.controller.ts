import {
  Controller,
  Post,
  Get,
  Res,
  HttpStatus,
  Body,
  HttpCode,
  UseGuards,
  Req,
  HttpException,
} from '@nestjs/common';
import { Response } from 'express';
import { AuthService } from './auth.service';
import { ApiBody, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtService } from '@nestjs/jwt';
import { AuthGuard } from '@nestjs/passport';
import { HttpStatusCodes } from 'src/common/constants/http-status-code';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { MyApiResponse } from 'src/common/dto/response.dto';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly jwtService: JwtService,
  ) {}

  @Get('spotify')
  @UseGuards(AuthGuard('spotify'))
  async spotifyLogin() {}

  @Post('spotify/callback')
  async spotifyCallback(@Body('code') code: string, @Res() res: Response) {
    const { user, accessToken, refreshToken } =
      await this.authService.handleSpotifyCallback(code);
    const response = {
      message: {
        code: 200,
        message: '스포티파이 로그인 성공',
      },
      user,
      accessToken,
      refreshToken,
    };
    return res.status(HttpStatus.OK).json(response);
  }

  // 로컬 로그인
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '로그인',
    description: '이메일과 비밀번호로 로그인을 수행합니다.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '로그인 성공',
    schema: {
      example: {
        message: '일반 로그인 성공',
        user: {
          userId: 1,
          email: 'user@example.com',
          name: 'nickname123',
          nickname: 'nickname123',
          profileUrl: null,
          authProvider: 'plify',
          followersCount: '0',
        },
        accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: '잘못된 이메일 또는 비밀번호',
    schema: {
      example: {
        statusCode: 401,
        message: '유효하지 않은 이메일 혹은 비밀번호 입니다',
      },
    },
  })
  @ApiBody({
    description: '로그인 요청 데이터',
    schema: {
      type: 'object',
      properties: {
        email: { type: 'string', example: 'user@example.com' },
        password: { type: 'string', example: 'password123' },
      },
      required: ['email', 'password'],
    },
  })
  async login(@Body() body: { email: string; password: string }) {
    const result = await this.authService.login(body.email, body.password);
    return {
      message: '일반 로그인 성공',
      user: result.user,
      accessToken: result.accessToken,
    };
  }
  @Post('logout')
  @UseGuards(JwtAuthGuard)
  async logout(@Res() res: Response) {
    return res
      .status(HttpStatusCodes.OK)
      .json(
        new MyApiResponse(
          HttpStatusCodes.OK,
          '로그아웃 성공 (토큰 삭제는 클라이언트에서 수행)',
        ),
      );
  }

  @Post('signup')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: '회원가입',
    description: '이메일, 닉네임, 비밀번호로 회원가입을 합니다.',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: '회원가입 성공',
    schema: {
      example: {
        message: '일반 회원가입 성공',
        user: {
          userId: 1,
          email: 'user@example.com',
          nickname: 'nickname123',
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: '이메일이 이미 존재할 경우',
    schema: {
      example: {
        statusCode: 400,
        message: 'Email already exists',
      },
    },
  })
  @ApiBody({
    description: '회원가입 요청 데이터',
    schema: {
      type: 'object',
      properties: {
        email: { type: 'string', example: 'user@example.com' },
        nickname: { type: 'string', example: 'nickname123' },
        password: { type: 'string', example: 'password123' },
      },
      required: ['email', 'nickname', 'password'],
    },
  })
  async signup(
    @Body() body: { email: string; nickname: string; password: string },
  ) {
    const result = await this.authService.signup(
      body.email,
      body.nickname,
      body.password,
    );
    return {
      message: '일반 회원가입 성공',
      user: result,
    };
  }
}
