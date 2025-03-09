import { Controller, Post, Param, Body } from '@nestjs/common';
import { CommentLikeService } from './comment-like.service';
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiBody,
} from '@nestjs/swagger';

@ApiTags('댓글 좋아요 API')
@Controller('playlists/:postId/comments/:commentId/like') // ✅ 엔드포인트 수정
export class CommentLikeController {
  constructor(private readonly commentLikeService: CommentLikeService) {}

  // ❤️ 댓글 좋아요 추가/삭제 (토글 방식)
  @Post()
  @ApiOperation({
    summary: '댓글 좋아요 추가/삭제',
    description: '댓글에 좋아요를 추가하거나 취소합니다.',
  })
  @ApiParam({
    name: 'postId',
    type: Number,
    description: '플레이리스트 ID',
    example: 1,
  })
  @ApiParam({
    name: 'commentId',
    type: Number,
    description: '좋아요를 추가/삭제할 댓글 ID',
    example: 6,
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        userId: {
          type: 'number',
          description: '좋아요를 누르는 사용자 ID',
          example: 123,
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: '좋아요 추가 또는 취소 성공',
    schema: {
      example: {
        message: { code: 200, text: '좋아요가 추가되었습니다.' },
        isLiked: true,
        likeCount: 1,
      },
    },
  })
  async toggleLike(
    @Param('postId') postId: number, // ✅ postId 추가
    @Param('commentId') commentId: number,
    @Body() body: { userId: number },
  ) {
    return await this.commentLikeService.toggleLike(
      body.userId,
      postId,
      commentId,
    );
  }
}
