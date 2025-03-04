import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class CommentService {
  constructor(private prisma: PrismaService) {}

  // 댓글 생성
  async addComment(playlistId: string, userId: number, commentText: string) {
    // Spotify 플레이리스트 ID를 이용해 Playlist 조회
    const playlist = await this.prisma.playlist.findUnique({
      where: { playlistId },
    });
    if (!playlist) {
      throw new HttpException('Playlist not found', HttpStatus.NOT_FOUND);
    }
    return await this.prisma.comment.create({
      data: {
        postId: playlist.id, // 내부 고유 ID를 postId로 사용
        userId,
        comment: commentText,
      },
    });
  }

  // 특정 플레이리스트의 댓글 조회 (작성자 정보 포함)
  async getCommentsByPlaylist(playlistId: string) {
    const playlist = await this.prisma.playlist.findUnique({
      where: { playlistId },
    });
    if (!playlist) {
      throw new HttpException('Playlist not found', HttpStatus.NOT_FOUND);
    }
    return await this.prisma.comment.findMany({
      where: { postId: playlist.id },
      include: { user: true },
    });
  }

  // 댓글 수정 (작성자 본인 여부 확인)
  async updateComment(commentId: number, userId: number, commentText: string) {
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId },
    });
    if (!comment || comment.userId !== userId) {
      throw new HttpException(
        'Comment not found or unauthorized',
        HttpStatus.UNAUTHORIZED,
      );
    }
    return await this.prisma.comment.update({
      where: { id: commentId },
      data: { comment: commentText },
    });
  }

  // 댓글 삭제 (작성자 본인 여부 확인)
  async deleteComment(commentId: number, userId: number) {
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId },
    });
    if (!comment || comment.userId !== userId) {
      throw new HttpException(
        'Comment not found or unauthorized',
        HttpStatus.UNAUTHORIZED,
      );
    }
    return await this.prisma.comment.delete({ where: { id: commentId } });
  }
}
