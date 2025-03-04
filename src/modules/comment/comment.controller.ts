import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Put,
  Delete,
  UseGuards,
  Req,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { CommentService } from './comment.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('comments')
export class CommentController {
  constructor(private readonly commentService: CommentService) {}

  // 댓글 생성 (인증 필요)
  @Post()
  @UseGuards(JwtAuthGuard)
  async addComment(
    @Body() body: { playlistId: string; comment: string },
    @Req() req,
  ) {
    const userId = req.user.id;
    return await this.commentService.addComment(
      body.playlistId,
      userId,
      body.comment,
    );
  }

  // 특정 플레이리스트의 모든 댓글 조회
  @Get(':playlistId')
  async getComments(@Param('playlistId') playlistId: string) {
    return await this.commentService.getCommentsByPlaylist(playlistId);
  }

  // 댓글 수정 (본인 작성 댓글만 가능)
  @Put(':commentId')
  @UseGuards(JwtAuthGuard)
  async updateComment(
    @Param('commentId') commentId: number,
    @Body() body: { comment: string },
    @Req() req,
  ) {
    const userId = req.user.id;
    return await this.commentService.updateComment(
      commentId,
      userId,
      body.comment,
    );
  }

  // 댓글 삭제 (본인 작성 댓글만 가능)
  @Delete(':commentId')
  @UseGuards(JwtAuthGuard)
  async deleteComment(@Param('commentId') commentId: number, @Req() req) {
    const userId = req.user.id;
    return await this.commentService.deleteComment(commentId, userId);
  }
}
