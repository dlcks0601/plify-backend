import { Controller, Get, Post, Body, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { UserService } from './user.service';
import { CreateUserDto } from './create-user.dto';

@ApiTags('auth')
@Controller('auth')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post('signup')
  @ApiOperation({
    summary: '회원가입',
    description: '이메일, 비밀번호, 닉네임으로 회원가입을 합니다.',
  })
  @ApiResponse({
    status: 201,
    description: '회원가입 성공',
    content: {
      'application/json': {
        example: {
          message: '일반 회원가입 성공',
          user: {
            userId: 1,
            email: 'user@example.com',
            nickname: 'nickname123',
          },
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: '잘못된 요청' })
  @ApiBody({ type: CreateUserDto })
  async create(@Body() body: CreateUserDto) {
    const newUser = await this.userService.createUser(
      body.email,
      body.password,
      body.nickname,
    );

    return {
      message: '일반 회원가입 성공',
      user: {
        userId: newUser.id,
        email: newUser.email,
        nickname: newUser.nickname,
      },
    };
  }

  @Get('users')
  @ApiOperation({
    summary: '사용자 목록 조회',
    description: '모든 사용자 정보를 조회합니다.',
  })
  @ApiResponse({
    status: 200,
    description: '사용자 목록 조회 성공',
    content: {
      'application/json': {
        example: {
          message: '사용자 목록 조회 성공',
          users: [
            {
              userId: 1,
              email: 'user1@example.com',
              nickname: 'nickname1',
            },
            {
              userId: 2,
              email: 'user2@example.com',
              nickname: 'nickname2',
            },
          ],
        },
      },
    },
  })
  async findAll() {
    const users = await this.userService.findAll();

    return {
      message: '사용자 목록 조회 성공',
      users: users.map((user) => ({
        userId: user.id,
        email: user.email,
        nickname: user.nickname,
      })),
    };
  }
}
