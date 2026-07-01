import 'dotenv/config';
import { NestFactory, HttpAdapterHost } from '@nestjs/core';
import { AppModule } from './app.module';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { DetailedLoggingInterceptor } from './common/interceptors/detailed-logging.interceptor';
import { LoggingExceptionFilter } from './common/filters/logging-exception.filter';
import { VersioningType, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.enableCors({
    origin: [
      'http://localhost:3000', 
      'http://localhost:3001', 
      'http://localhost:4000',
      ...(process.env.FRONTEND_URL ? process.env.FRONTEND_URL.split(',') : []),
    ].filter(Boolean) as string[],
    credentials: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: 'Content-Type, Authorization, Accept',
  });

  app.useGlobalInterceptors(
    new ResponseInterceptor(),
    new LoggingInterceptor(),
  );

  if (process.env.NODE_ENV !== 'production') {
    app.useGlobalInterceptors(new DetailedLoggingInterceptor());
  }
  // * Apply filters
  app.useGlobalFilters(new LoggingExceptionFilter(app.get(HttpAdapterHost)));

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Hardware POS API')
    .setDescription('API documentation for the Hardware POS system')
    .setVersion('1.0')
    .build();
  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, swaggerDocument);

  const httpAdapterHost = app.get(HttpAdapterHost);
  app.useGlobalFilters(new LoggingExceptionFilter(httpAdapterHost));

  const port = parseInt(process.env.PORT || '3000', 10);
  await app.listen(port, '0.0.0.0');
}

bootstrap();
