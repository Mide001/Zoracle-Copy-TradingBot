import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { json } from 'express';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  // Validate required environment variables before starting
  const requiredEnvVars = [
    'PORT',
    'MONGODB_URI',
    'REDIS_URI',
    'SWAP_API_BASE_URL',
    'ALCHEMY_SIGNING_KEY',
    'ALCHEMY_AUTH_TOKEN',
    'ALCHEMY_WEBHOOK_ID',
  ];

  const missingVars = requiredEnvVars.filter((varName) => !process.env[varName]);
  if (missingVars.length > 0) {
    logger.error(`Missing required environment variables: ${missingVars.join(', ')}`);
    process.exit(1);
  }

  try {
    const app = await NestFactory.create(AppModule, {
      bodyParser: false, // Disable default body parser for webhook endpoint
      abortOnError: false, // Don't exit on error, let us handle it
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

    // Railway requires binding to 0.0.0.0 and using PORT env var directly
    // See: https://docs.railway.com/reference/errors/application-failed-to-respond
    const port = process.env.PORT ? parseInt(process.env.PORT, 10) : null;
    
    if (!port) {
      logger.error('PORT environment variable is required but not set');
      process.exit(1);
    }

    // Bind to 0.0.0.0 as required by Railway
    await app.listen(port, '0.0.0.0');
    logger.log(`Application listening on ${host}:${port}`);
    logger.log(`Webhook endpoint: http://${host}:${port}/webhook`);
    logger.log(`Management endpoints: http://${host}:${port}/webhooks/*`);
  } catch (error) {
    logger.error(`Failed to start application: ${error.message}`);
    logger.error(error.stack);
    process.exit(1);
  }
}

bootstrap().catch((error) => {
  console.error('Fatal error during bootstrap:', error);
  process.exit(1);
});
