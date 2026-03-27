import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/http-filter.exception';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  // console.log(process.env.POSTGRES_USER)
  // app.use(
  //   helmet({
  //     contentSecurityPolicy: {
  //       directives: {
  //         defaultSrc: ["'self'"], // Trust our own domain
  //         scriptSrc: ["'self'", "https://apis.google.com"], // Allow Google scripts
  //         imgSrc: ["'self'", "https://my-bucket.s3.amazonaws.com", "data:"], // Allow S3 images
  //         styleSrc: ["'self'", "'unsafe-inline'"], // Allow internal styles
  //       },
  //     },
  //   }),
  // );

    app.use(
    helmet({
      contentSecurityPolicy: false, // Disable CSP for development
    }),
  );

  app.enableCors({
    origin: ['http://localhost:5500', 'http://127.0.0.1:5500'],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true, // This should be false in production
  });
  app.useGlobalPipes(new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true
  }))
  app.set('trust proxy', 1);
  app.useGlobalFilters(new HttpExceptionFilter())
  await app.listen(process.env.PORT ?? 3009);
}
bootstrap();
