import { Module, MiddlewareConsumer, RequestMethod } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config'; // ConfigModule 추가
import { AuthModule } from './modules/auth/auth.module';
import { PlaylistModule } from './modules/playlist/playlist.module';
import { CommentModule } from './modules/comment/comment.module';
import { PlaylistLikeModule } from './modules/playlist-like/playlist-like.module';
import { CommentLikeModule } from './modules/comment-like/comment-like.module';

@Module({
  imports: [
    // .env 파일을 로드하고, 전역에서 사용 가능하도록 설정
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    AuthModule,
    PlaylistModule,
    CommentModule,
    PlaylistLikeModule,
    CommentLikeModule,
  ],
})
export class AppModule {}
