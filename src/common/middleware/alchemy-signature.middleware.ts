import {
  Injectable,
  NestMiddleware,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response, NextFunction } from 'express';
import * as crypto from 'crypto';

@Injectable()
export class AlchemySignatureMiddleware implements NestMiddleware {
  private readonly logger = new Logger(AlchemySignatureMiddleware.name);
  constructor(private configService: ConfigService) {}

  use(req: Request, res: Response, next: NextFunction) {
    let signature = req.headers['x-alchemy-signature'] as string | undefined;
    const signingKey = this.configService.get<string>('alchemy.signingKey');

    if (!signature) {
      throw new UnauthorizedException('Missing x-alchemy-signature header');
    }

    if (!signingKey) {
      throw new UnauthorizedException('Alchemy signing key not configured');
    }

    const rawBody = req['rawBody'];
    if (!rawBody) {
      throw new UnauthorizedException(
        'Raw body not available for signature validation',
      );
    }

    const hmac = crypto.createHmac('sha256', signingKey);
    hmac.update(rawBody);
    const digest = hmac.digest('hex');

    // Normalize header: support optional "sha256=" prefix and case-insensitive hex
    if (signature?.startsWith('sha256=')) {
      signature = signature.slice('sha256='.length);
    }
    const received = signature?.toLowerCase();
    const expected = digest.toLowerCase();

    if (process.env.NODE_ENV === 'development') {
      this.logger.debug(
        `Signature check: received=${received?.slice(0, 16)}..., expected=${expected.slice(
          0,
          16,
        )}...`,
      );
    }

    // Constant-time comparison to avoid timing attacks
    const receivedBuf = Buffer.from(received ?? '', 'utf8');
    const expectedBuf = Buffer.from(expected, 'utf8');
    const matches =
      receivedBuf.length === expectedBuf.length &&
      crypto.timingSafeEqual(receivedBuf, expectedBuf);

    if (!matches) {
      throw new UnauthorizedException('Invalid Alchemy signature');
    }

    next();
  }
}
