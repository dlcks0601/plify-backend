import {
  Controller,
  Post,
  Put,
  Body,
  Get,
  Param,
  Delete,
  Query,
} from '@nestjs/common';
import { CommentService } from './comment.service';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';

@ApiTags('댓글 API')
@Controller('playlists/:postId/comments') // ✅ RESTful한 URL 구조
export class CommentController {
  constructor(private readonly commentService: CommentService) {}

  // ✅ 댓글 작성
  @Post()
  @ApiOperation({
    summary: '댓글 작성',
    description: '특정 플레이리스트에 댓글을 작성합니다.',
  })
  @ApiParam({ name: 'postId', type: Number, description: '플레이리스트 ID' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        userId: { type: 'number', description: '댓글 작성자 ID' },
        content: { type: 'string', description: '댓글 내용' },
      },
    },
  })
  @ApiResponse({ status: 200, description: '댓글 작성 성공' })
  async addComment(
    @Param('postId') postId: number,
    @Body() body: { userId: number; content: string },
  ) {
    return await this.commentService.addComment(
      body.userId,
      postId,
      body.content,
    );
  }

  // 🔍 특정 플레이리스트의 댓글 조회 (좋아요 상태 포함)
  @Get()
  @ApiOperation({
    summary: '특정 플레이리스트의 댓글 조회',
    description:
      '해당 플레이리스트에 작성된 댓글 목록을 가져옵니다. (좋아요 상태 포함)',
  })
  @ApiParam({ name: 'postId', type: Number, description: '플레이리스트 ID' })
  @ApiQuery({
    name: 'userId',
    type: Number,
    required: false,
    description: '현재 로그인한 사용자 ID (좋아요 여부 확인용)',
  })
  @ApiResponse({
    status: 200,
    description: '댓글 목록 조회 성공',
    schema: {
      example: {
        comments: [
          {
            commentId: 1,
            userId: 123,
            userNickname: 'JohnDoe',
            userProfileUrl: 'https://example.com/profile.jpg',
            content: '좋아요 기능이 추가되었네요!',
            likeCount: 5,
            isLiked: true,
            createdAt: '2024-06-01T12:00:00Z',
          },
        ],
      },
    },
  })
  async getComments(
    @Param('postId') postId: number,
    @Query('userId') userId?: number,
  ) {
    return await this.commentService.getCommentsByPlaylist(postId, userId);
  }

  // ✍️ 댓글 수정
  @Put(':commentId')
  @ApiOperation({
    summary: '댓글 수정',
    description:
      '특정 댓글을 수정합니다. 본인이 작성한 댓글만 수정할 수 있습니다.',
  })
  @ApiParam({ name: 'postId', type: Number, description: '플레이리스트 ID' })
  @ApiParam({ name: 'commentId', type: Number, description: '댓글 ID' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        userId: { type: 'number', description: '댓글 작성자 ID (본인 확인용)' },
        content: { type: 'string', description: '새로운 댓글 내용' },
      },
    },
  })
  @ApiResponse({ status: 200, description: '댓글 수정 성공' })
  async updateComment(
    @Param('postId') postId: number,
    @Param('commentId') commentId: number,
    @Body() body: { userId: number; content: string },
  ) {
    return await this.commentService.updateComment(
      commentId,
      body.userId,
      body.content,
    );
  }

  // 🗑️ 댓글 삭제
  @Delete(':commentId')
  @ApiOperation({
    summary: '댓글 삭제',
    description:
      '특정 댓글을 삭제합니다. 본인이 작성한 댓글만 삭제할 수 있습니다.',
  })
  @ApiParam({ name: 'postId', type: Number, description: '플레이리스트 ID' })
  @ApiParam({ name: 'commentId', type: Number, description: '댓글 ID' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        userId: { type: 'number', description: '댓글 작성자 ID (본인 확인용)' },
      },
    },
  })
  @ApiResponse({ status: 200, description: '댓글 삭제 성공' })
  async deleteComment(
    @Param('postId') postId: number,
    @Param('commentId') commentId: number,
    @Body() body: { userId: number },
  ) {
    return await this.commentService.deleteComment(commentId, body.userId);
  }
}
