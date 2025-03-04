import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { PlaylistLikeController } from './playlist-like.controller';
import { PlaylistLikeService } from './playlist-like.service';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  imports: [
    PassportModule,
    JwtModule.register({
      secret: process.env.ACCESS_TOKEN_SECRET,
      signOptions: { expiresIn: '15m' },
    }),
  ],
  controllers: [PlaylistLikeController],
  providers: [PlaylistLikeService, PrismaService],
  exports: [PlaylistLikeService],
})
export class PlaylistLikeModule {}
