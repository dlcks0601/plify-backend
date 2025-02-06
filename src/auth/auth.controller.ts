import { Controller, Post, Body, HttpStatus, Res } from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { UserService } from '../user/user.service';
import { LoginDto } from './login.dto';
import * as bcrypt from 'bcrypt';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UserService,
  ) {}

  @Post('login')
  @ApiOperation({
    summary: '로그인',
    description: '이메일과 비밀번호로 로그인합니다.',
  })
  @ApiResponse({
    status: 200,
    description: '로그인 성공',
    content: {
      'application/json': {
        example: {
          message: '일반 로그인 성공',
          user: {
            userId: 1,
            email: 'user@example.com',
            nickname: 'nickname123',
            profileUrl: null,
          },
          accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: '잘못된 이메일 또는 비밀번호',
    content: {
      'application/json': {
        example: {
          message: 'Invalid credentials: Incorrect password',
        },
      },
    },
  })
  @ApiResponse({
    status: 500,
    description: '서버 오류',
    content: {
      'application/json': {
        example: {
          message: 'Internal server error',
        },
      },
    },
  })
  @ApiBody({
    type: LoginDto,
    description: '로그인에 필요한 이메일과 비밀번호를 입력합니다.',
    examples: {
      loginExample: {
        summary: '로그인 요청 예시',
        value: {
          email: 'user@example.com',
          password: 'password123',
        },
      },
    },
  })
  async login(@Body() loginDto: LoginDto, @Res() res: Response) {
    try {
      const user = await this.usersService.findByEmail(loginDto.email);
      if (!user) {
        return res.status(HttpStatus.UNAUTHORIZED).json({
          message: 'Invalid credentials: User not found',
        });
      }

      const isPasswordValid = await bcrypt.compare(
        loginDto.password,
        user.password,
      );

      if (!isPasswordValid) {
        return res.status(HttpStatus.UNAUTHORIZED).json({
          message: 'Invalid credentials: Incorrect password',
        });
      }

      const accessToken = await this.authService.login(user);

      return res.status(HttpStatus.OK).json({
        message: '일반 로그인 성공',
        user: {
          userId: user.id,
          email: user.email,
          nickname: user.nickname,
          profileUrl: user.profileUrl || null,
        },
        accessToken: accessToken.access_token,
      });
    } catch (error) {
      console.error('로그인 처리 중 오류 발생:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        message: 'Internal server error',
        error: error.message,
      });
    }
  }
}
