import { IsOptional, IsInt, IsBoolean } from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class GetPlaylistsQueryDto {
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true')
  latest?: boolean;

  // 리밋
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  limit?: number;

  // 커서
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  cursor?: number;
}
