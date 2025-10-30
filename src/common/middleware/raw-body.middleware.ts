import { Inject, Injectable, NestMiddleware } from "@nestjs/common";
import { Request, Response, NextFunction } from "express";
import getRawBody from "raw-body";

@Injectable()
export class RawBodyMiddleware implements NestMiddleware {
    async use(req: Request, res: Response, next: NextFunction) {
        if (req.readable) {
            const raw = await getRawBody(req);
            req['rawBody'] = raw;
            req.body = JSON.parse(raw.toString('utf8'));
        }
        next();
    }
}