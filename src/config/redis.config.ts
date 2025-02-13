import { Injectable } from '@nestjs/common';

@Injectable()
export class RedisConfig {
  public static readonly host = process.env.REDIS_HOST || 'localhost';
  public static readonly port: number = parseInt(
    process.env.REDIS_PORT ?? '6379',
    10,
  );
  public static readonly password = process.env.REDIS_PASSWORD || 'leechan99';
}
