import { Controller, Get, Post, Body } from '@nestjs/common';
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
    description: '이메일, 비밀번호 닉네임으로 회원가입을 합니다.',
  })
  @ApiResponse({ status: 201, description: '회원가입 성공' })
  @ApiResponse({ status: 400, description: '잘못된 요청' })
  @ApiBody({ type: CreateUserDto })
  create(@Body() body: CreateUserDto) {
    return this.userService.createUser(
      body.email,
      body.password,
      body.nickname,
    );
  }

  @Get()
  @ApiOperation({
    summary: '사용자 목록 조회',
    description: '모든 사용자 정보를 조회합니다.',
  })
  findAll() {
    return this.userService.findAll();
  }
}
