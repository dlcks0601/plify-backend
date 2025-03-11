import * as dotenv from 'dotenv';
import * as path from 'path';

// .env 파일 로드 (배포/로컬 환경 모두 하나의 파일 사용)
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const isLocal = process.env.NODE_ENV === 'local';

export const config = {
  isLocal,
  port: parseInt(process.env.PORT || '4000', 10),
  apiUrl: process.env.API_URL || 'http://localhost:4000',
  jwtSecret: process.env.JWT_SECRET || 'default_jwt_secret',
  databaseUrl: process.env.DATABASE_URL || '',
  spotify: {
    clientId: process.env.SPOTIFY_CLIENT_ID || '',
    clientSecret: process.env.SPOTIFY_CLIENT_SECRET || '',
    redirectUri: process.env.SPOTIFY_REDIRECT_URI || '',
  },
};
