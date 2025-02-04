import { ApiProperty } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({
    example: 'user@example.com',
    description: '사용자의 이메일 주소',
  })
  email: string;

  @ApiProperty({
    example: '123456',
    description: '사용자의 비밀번호',
  })
  password: string;

  @ApiProperty({
    example: 'nickname123',
    description: '사용자의 닉네임',
  })
  nickname: string;
}
