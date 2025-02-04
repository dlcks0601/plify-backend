import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
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
}
