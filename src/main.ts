import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as fs from 'fs';

async function bootstrap() {
  // HTTPS 옵션 추가 (인증서 및 키 파일 로드)
  // const httpsOptions = {
  //   key: fs.readFileSync('localhost-key.pem'),
  //   cert: fs.readFileSync('localhost.pem'),
  // };

  // const app = await NestFactory.create(AppModule, { httpsOptions });
  const app = await NestFactory.create(AppModule);

  // CORS 설정
  // app.enableCors({
  //   origin: 'https://localhost:3000', // 프론트엔드 주소
  //   credentials: true,
  //   methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS', 'PUT'],
  //   allowedHeaders: ['Authorization', 'Content-Type'], // 💡 CORS 요청 헤더 허용
  //   exposedHeaders: ['Authorization'], // 💡 클라이언트에서 응답 헤더 사용 가능
  // });

  app.enableCors({
    origin: 'https://plify.store', // 배포된 프론트엔드 주소로 수정
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS', 'PUT'],
    allowedHeaders: ['Authorization', 'Content-Type'],
    exposedHeaders: ['Authorization'],
  });

  // Swagger 설정
  const config = new DocumentBuilder()
    .setTitle('Plify API') // API 문서 제목
    .setDescription('플리피 회원가입 및 인증 API') // 설명
    .setVersion('1.0') // 버전
    .addBearerAuth() // JWT 인증 추가
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document, {
    swaggerOptions: {
      url: '/api', // Swagger 문서 경로와 맞추기 위해 설정
    },
    customSiteTitle: 'API 문서',
  });

  await app.listen(4000);
  console.log('🚀 HTTPS server running at https://localhost:4000');
}
bootstrap();
