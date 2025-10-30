import {
  Injectable,
  NestMiddleware,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response, NextFunction } from 'express';
import * as crypto from 'crypto';

@Injectable()
export class AlchemySignatureMiddleware implements NestMiddleware {
  constructor(private configService: ConfigService) {}

  use(req: Request, res: Response, next: NextFunction) {
    const signature = req.headers['x-alchemy-signature'] as string;
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

    if (signature !== digest) {
      throw new UnauthorizedException('Invalid Alchemy signature');
    }

    next();
  }
}
