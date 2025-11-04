import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { json } from 'express';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  const app = await NestFactory.create(AppModule, {
    bodyParser: false, // Disable default body parser for webhook endpoint
  });
  // Enable JSON body parsing for manager endpoints under /webhooks
  app.use('/webhooks', json());


  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  const configService = app.get(ConfigService);
  const port = configService.get<number>('port');
  const host = configService.get<string>('host') || '0.0.0.0';

  if (!port) {
    logger.error('PORT environment variable is required but not set');
    process.exit(1);
  }

  await app.listen(port, host);
  logger.log(`Application listening on ${host}:${port}`);
  logger.log(`Webhook endpoint: http://${host}:${port}/webhook`);
  logger.log(`Management endpoints: http://${host}:${port}/webhooks/*`);
}

bootstrap();
