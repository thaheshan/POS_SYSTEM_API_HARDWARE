import 'dotenv/config';
import { NestFactory, HttpAdapterHost } from '@nestjs/core';
import { AppModule } from './app.module';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { DetailedLoggingInterceptor } from './common/interceptors/detailed-logging.interceptor';
import { LoggingExceptionFilter } from './common/filters/logging-exception.filter';
import { VersioningType } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  app.enableCors({
    origin: ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:4000'],
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

  const httpAdapterHost = app.get(HttpAdapterHost);
  app.useGlobalFilters(new LoggingExceptionFilter(httpAdapterHost));

  await app.listen(process.env.PORT ?? 3000);
}

bootstrap();
