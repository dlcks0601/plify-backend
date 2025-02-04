import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // CORS 설정
  app.enableCors({
    origin: 'http://localhost:3000', // 프론트엔드 주소
    credentials: true, // ✅ 쿠키 허용 설정
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    allowedHeaders: 'Content-Type, Authorization',
  });

  // Swagger 설정
  const config = new DocumentBuilder()
    .setTitle('Plify API') // API 문서 제목
    .setDescription('플리파이 회원가입 및 인증 API') // 설명
    .setVersion('1.0') // 버전
    .addTag('auth') // 태그 (옵션)
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document); // /api 경로에서 Swagger UI 제공

  await app.listen(4000);
}
bootstrap();
