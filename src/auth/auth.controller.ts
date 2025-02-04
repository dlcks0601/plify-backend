import { Controller, Post, Body, HttpStatus, Res } from '@nestjs/common';
import { Response } from 'express';
import { AuthService } from './auth.service';
import { UserService } from '../user/user.service';
import { LoginDto } from './login.dto';
import * as bcrypt from 'bcrypt';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UserService,
  ) {}

  @Post('login')
  async login(@Body() loginDto: LoginDto, @Res() res: Response) {
    try {
      const user = await this.usersService.findByEmail(loginDto.email);
      if (!user) {
        return res.status(HttpStatus.UNAUTHORIZED).json({
          message: 'Invalid credentials: User not found',
        });
      }

      console.log('입력한 비밀번호:', loginDto.password);
      console.log('DB에 저장된 해시된 비밀번호:', user.password);

      const isPasswordValid = await bcrypt.compare(
        loginDto.password,
        user.password,
      );

      console.log('비밀번호 비교 결과:', isPasswordValid);

      if (!isPasswordValid) {
        return res.status(HttpStatus.UNAUTHORIZED).json({
          message: 'Invalid credentials: Incorrect password',
        });
      }

      const accessToken = await this.authService.login(user);

      return res.status(HttpStatus.OK).json({
        message: 'Login successful',
        access_token: accessToken.access_token,
        user: {
          id: user.id,
          email: user.email,
          nickname: user.nickname,
        },
      });
    } catch (error) {
      console.error('로그인 처리 중 오류 발생:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        message: 'Internal server error',
        error: error.message, // 오류 메시지 추가
      });
    }
  }
}
