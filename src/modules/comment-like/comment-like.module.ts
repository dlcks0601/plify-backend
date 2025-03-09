import { Module } from '@nestjs/common';
import { CommentLikeService } from './comment-like.service';
import { CommentLikeController } from './comment-like.controller';
import { PrismaService } from 'src/prisma/prisma.service';
import { CommentService } from '../comment/comment.service';

@Module({
  providers: [CommentLikeService, PrismaService, CommentService],
  controllers: [CommentLikeController],
  exports: [CommentLikeService],
})
export class CommentLikeModule {}
