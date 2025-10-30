import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  const app = await NestFactory.create(AppModule, {
    bodyParser: false, // Disable default body parser for webhook endpoint
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  const configService = app.get(ConfigService);
  const port = configService.get<number>('port') ?? 3000;
  const host = configService.get<string>('host') ?? '0.0.0.0';

  await app.listen(port, host);
  logger.log(`Application listening on ${host}:${port}`);
  logger.log(`Webhook endpoint: http://${host}:${port}/webhook`);
  logger.log(`Management endpoints: http://${host}:${port}/webhooks/*`);
}

bootstrap();
