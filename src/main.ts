// import { NestFactory } from '@nestjs/core';
// import { AppModule } from './app.module';
// import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
// import * as dotenv from 'dotenv';

// dotenv.config(); // 환경 변수 로드

// async function bootstrap() {
//   const isLocal = process.env.NODE_ENV === 'local';
//   let app;

//   if (isLocal) {
//     // 🏠 로컬 환경 (HTTPS)
//     /*
//     const httpsOptions = {
//       key: fs.readFileSync('localhost-key.pem'),
//       cert: fs.readFileSync('localhost.pem'),
//     };
//     app = await NestFactory.create(AppModule, { httpsOptions });
//     */
//   } else {
//     // 🚀 배포 환경
//     app = await NestFactory.create(AppModule);
//   }

//   app.enableCors({
//     origin: isLocal ? 'https://localhost:3000' : 'https://plify.store',
//     credentials: true,
//     methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS', 'PUT'],
//     allowedHeaders: ['Authorization', 'Content-Type'],
//     exposedHeaders: ['Authorization'],
//   });

//   // Swagger 설정
//   const config = new DocumentBuilder()
//     .setTitle('Plify API')
//     .setDescription('플리피 회원가입 및 인증 API')
//     .setVersion('1.0')
//     .addBearerAuth()
//     .build();

//   const document = SwaggerModule.createDocument(app, config);
//   SwaggerModule.setup('api', app, document, {
//     swaggerOptions: { url: '/api' },
//     customSiteTitle: 'API 문서',
//   });

//   const port = 4000;
//   await app.listen(port, isLocal ? 'localhost' : '0.0.0.0');
//   console.log(`🚀 Server running at ${isLocal ? 'https://localhost' : 'http://0.0.0.0'}:${port}`);
// }
// bootstrap();

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { config } from './config/config'; // ✅ config.ts에서 설정 불러오기

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: config.isLocal ? 'https://localhost:3000' : config.apiUrl,
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS', 'PUT'],
    allowedHeaders: ['Authorization', 'Content-Type'],
    exposedHeaders: ['Authorization'],
  });

  // Swagger 설정
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Plify API')
    .setDescription('플리피 회원가입 및 인증 API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api', app, document, {
    swaggerOptions: { url: '/api' },
    customSiteTitle: 'API 문서',
  });

  await app.listen(config.port, '0.0.0.0'); // ✅ .env의 포트 값 사용
  console.log(`🚀 Server running at ${config.apiUrl}:${config.port}`);
}

bootstrap();
