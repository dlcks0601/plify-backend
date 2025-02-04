import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UserModule } from '../user/user.module';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'default_secret_key', // ✅ 비밀 키 설정
      signOptions: { expiresIn: '1h' }, // ✅ 토큰 만료 시간 설정
    }),
    UserModule,
  ],
  providers: [AuthService],
  controllers: [AuthController],
  exports: [AuthService], // ✅ AuthService를 외부로 내보내기
})
export class AuthModule {}
