// import { NestFactory } from '@nestjs/core';
// import { AppModule } from './app.module';
// import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
// import { config } from './config/config';

// async function bootstrap() {
//   const app = await NestFactory.create(AppModule);

//   app.enableCors({
//     origin: 'https://plify.store',
//     credentials: true,
//     methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS', 'PUT'],
//     allowedHeaders: ['Authorization', 'Content-Type'],
//     exposedHeaders: ['Authorization'],
//   });

//   // Swagger 설정
//   const swaggerConfig = new DocumentBuilder()
//     .setTitle('Plify API')
//     .setDescription('플리피 회원가입 및 인증 API')
//     .setVersion('1.0')
//     .addBearerAuth()
//     .build();

//   const document = SwaggerModule.createDocument(app, swaggerConfig);
//   SwaggerModule.setup('api', app, document, {
//     swaggerOptions: { url: '/api' },
//     customSiteTitle: 'API 문서',
//   });

//   await app.listen(config.port, '0.0.0.0'); // .env의 포트 값 사용
//   console.log(`🚀 Server running at ${config.apiUrl}:${config.port}`);
// }

// bootstrap();

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as fs from 'fs';

async function bootstrap() {
  // HTTPS 옵션 추가 (인증서 및 키 파일 로드)
  const httpsOptions = {
    key: fs.readFileSync('localhost-key.pem'),
    cert: fs.readFileSync('localhost.pem'),
  };

  const app = await NestFactory.create(AppModule, { httpsOptions });

  // CORS 설정
  app.enableCors({
    origin: 'https://localhost:3000', // 프론트엔드 주소
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS', 'PUT'],
    allowedHeaders: ['Authorization', 'Content-Type'], // 💡 CORS 요청 헤더 허용
    exposedHeaders: ['Authorization'], // 💡 클라이언트에서 응답 헤더 사용 가능
  });

  // Swagger 설정
  const config = new DocumentBuilder()
    .setTitle('Plify API') // API 문서 제목
    .setDescription('플리피 회원가입 및 인증 API') // 설명
    .setVersion('1.0') // 버전
    .addBearerAuth() // JWT 인증 추가
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-docs', app, document, {
    swaggerOptions: {
      url: '/api-docs', // Swagger 문서 경로와 맞추기 위해 설정
    },
    customSiteTitle: 'API 문서',
  });

  await app.listen(4000);
  console.log('🚀 HTTPS server running at https://localhost:4000');
}
bootstrap();
