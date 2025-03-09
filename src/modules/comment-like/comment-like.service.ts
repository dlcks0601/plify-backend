import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CommentService } from '../comment/comment.service';

@Injectable()
export class CommentLikeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly commentService: CommentService,
  ) {}

  // ✅ 숫자로 변환하는 유틸 함수
  private toNumber(value: string | number, fieldName: string): number {
    const num = Number(value);
    if (isNaN(num)) {
      throw new HttpException(
        `${fieldName} must be a valid number`,
        HttpStatus.BAD_REQUEST,
      );
    }
    return num;
  }

  // ❤️ 댓글 좋아요 추가/삭제 (토글)
  async toggleLike(
    userId: number,
    postId: number | string,
    commentId: number | string,
  ) {
    const numericPostId = this.toNumber(postId, 'postId');
    const numericCommentId = this.toNumber(commentId, 'commentId');

    // 🔎 댓글 존재 확인
    const comment = await this.prisma.comment.findUnique({
      where: { id: numericCommentId, postId: numericPostId },
      select: { id: true, postId: true },
    });

    if (!comment) {
      throw new HttpException('Comment not found', HttpStatus.NOT_FOUND);
    }

    // 🔍 기존 좋아요 여부 확인
    const existingLike = await this.prisma.commentLike.findUnique({
      where: { userId_commentId: { userId, commentId: numericCommentId } },
    });

    let isLiked = false;
    let likeCount = await this.prisma.commentLike.count({
      where: { commentId: numericCommentId },
    });

    if (existingLike) {
      // 👎 좋아요 취소
      await this.prisma.commentLike.delete({
        where: { id: existingLike.id },
      });

      likeCount -= 1;
      isLiked = false;
    } else {
      // 👍 좋아요 추가
      await this.prisma.commentLike.create({
        data: { userId, commentId: numericCommentId },
      });

      likeCount += 1;
      isLiked = true;
    }

    // ✅ 최신 댓글 목록 반환 (isLiked 반영)
    return {
      message: {
        code: 200,
        text: isLiked ? '좋아요가 추가되었습니다.' : '좋아요가 취소되었습니다.',
      },
      isLiked,
      likeCount,
    };
  }
}
