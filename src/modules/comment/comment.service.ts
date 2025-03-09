import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class CommentService {
  constructor(private readonly prisma: PrismaService) {}

  // 🔥 postId와 commentId를 숫자로 변환하는 유틸 함수
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

  // ✅ 댓글 작성 (userId를 직접 받음)
  async addComment(userId: number, postId: number | string, content: string) {
    const numericPostId = this.toNumber(postId, 'postId');

    // 🔎 플레이리스트 존재 확인
    const playlist = await this.prisma.playlist.findUnique({
      where: { id: numericPostId },
    });

    if (!playlist) {
      throw new HttpException('Playlist not found', HttpStatus.NOT_FOUND);
    }

    // ✍️ 댓글 저장
    const newComment = await this.prisma.comment.create({
      data: {
        postId: numericPostId,
        userId,
        content,
      },
    });

    return {
      message: { code: 200, text: '댓글이 작성되었습니다.' },
      commentId: newComment.id,
    };
  }

  // 🔍 특정 플레이리스트의 댓글 조회 (작성자 정보 포함)
  async getCommentsByPlaylist(postId: number | string) {
    const numericPostId = this.toNumber(postId, 'postId');

    const playlist = await this.prisma.playlist.findUnique({
      where: { id: numericPostId },
    });

    if (!playlist) {
      throw new HttpException('Playlist not found', HttpStatus.NOT_FOUND);
    }

    const comments = await this.prisma.comment.findMany({
      where: { postId: numericPostId },
      include: {
        user: {
          select: { id: true, nickname: true, profile_url: true },
        },
      },
    });

    return {
      comments: comments.map((comment) => ({
        commentId: comment.id,
        userId: comment.user.id,
        userNickname: comment.user.nickname,
        userProfileUrl: comment.user.profile_url,
        content: comment.content,
        createdAt: comment.createdAt,
      })),
      message: {
        code: 200,
        text: '특정 플레이리스트 댓글을 정상적으로 조회했습니다.',
      },
    };
  }

  // ✅ 댓글 삭제 (본인만 가능)
  async deleteComment(commentId: number | string, userId: number) {
    const numericCommentId = this.toNumber(commentId, 'commentId');

    const comment = await this.prisma.comment.findUnique({
      where: { id: numericCommentId },
    });

    if (!comment) {
      throw new HttpException('Comment not found', HttpStatus.NOT_FOUND);
    }

    // 🛑 본인 댓글인지 확인
    if (comment.userId !== userId) {
      throw new HttpException('Unauthorized', HttpStatus.FORBIDDEN);
    }

    await this.prisma.comment.delete({ where: { id: numericCommentId } });

    return { message: { code: 200, text: '댓글이 삭제되었습니다.' } };
  }

  // ✅ 댓글 수정 (본인만 가능)
  async updateComment(
    commentId: number | string,
    userId: number,
    content: string,
  ) {
    const numericCommentId = this.toNumber(commentId, 'commentId');

    const comment = await this.prisma.comment.findUnique({
      where: { id: numericCommentId },
    });

    if (!comment) {
      throw new HttpException('Comment not found', HttpStatus.NOT_FOUND);
    }

    // 🛑 본인 댓글인지 확인
    if (comment.userId !== userId) {
      throw new HttpException('Unauthorized', HttpStatus.FORBIDDEN);
    }

    const updatedComment = await this.prisma.comment.update({
      where: { id: numericCommentId },
      data: { content },
    });

    return {
      message: { code: 200, text: '댓글이 수정되었습니다.' },
      comment: {
        commentId: updatedComment.id,
        content: updatedComment.content,
        updatedAt: updatedComment.createdAt,
      },
    };
  }
}
