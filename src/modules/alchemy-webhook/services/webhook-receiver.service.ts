import { Injectable, Logger } from '@nestjs/common';
import { WebhookEventDto } from '../dto/webhook-event.dto';

@Injectable()
export class WebhookReceiverService {
  private readonly logger = new Logger(WebhookReceiverService.name);

  // Heuristics/Config
  private readonly poolManagerAddresses = new Set(
    [
      // User-provided pool manager
      '0x498581ff718922c3f8e6a244956af099b2652b2b',
    ].map((a) => a.toLowerCase()),
  );

  private readonly commonQuoteSymbols = new Set([
    'ETH',
    'WETH',
    'USDC',
    'USDT',
    'DAI',
  ]);

  private classifyActivity(activity: any):
    | {
        type: 'BUY' | 'SELL';
        baseAsset: string; // token being acquired/sold
        quoteAsset?: string; // if detectable by symbol
        hash: string;
        tokenAddress?: string;
      }
    | null {
    // Require token-related category if present
    const category = (activity.category || '').toString().toUpperCase();
    if (category && category !== 'TOKEN') {
      return null;
    }

    const from = (activity.fromAddress || '').toLowerCase();
    const to = (activity.toAddress || '').toLowerCase();
    const asset = activity.asset as string | undefined; // token symbol if provided
    const tokenAddress: string | undefined =
      activity?.rawContract?.address || activity?.log?.address;
    const value = activity.value; // string number

    // Ensure we have an interaction with pool manager
    const touchesPool = this.poolManagerAddresses.has(from) || this.poolManagerAddresses.has(to);
    if (!touchesPool) {
      return null;
    }

    // Heuristic: if asset looks like a token symbol (not a pure native transfer)
    const isTokenSymbol = !!asset && asset.length >= 2 && asset.length <= 15;
    if (!isTokenSymbol) {
      return null;
    }

    // Direction heuristic:
    // - When TO is pool manager and asset is a token: user likely SELLING token to pool
    // - When FROM is pool manager and asset is a token: user likely BUYING token from pool
    // We don't know the monitored wallet here; we treat activity record as the user's perspective.
    let type: 'BUY' | 'SELL' | null = null;
    if (this.poolManagerAddresses.has(to)) {
      type = 'SELL';
    } else if (this.poolManagerAddresses.has(from)) {
      type = 'BUY';
    }

    if (!type) return null;

    // If the asset is a well-known quote symbol, flip semantics: asset is quote, so base is unknown
    // We'll still emit, but prefer when asset isn't a quote
    const quoteAsset = this.commonQuoteSymbols.has(asset!) ? asset : undefined;

    return {
      type,
      baseAsset: asset!,
      quoteAsset,
      hash: activity.hash,
      tokenAddress: tokenAddress?.toLowerCase(),
    };
  }

  async processWebhookEvent(event: WebhookEventDto): Promise<void> {
    this.logger.log(`Processing webhook event ID: ${event.id}`);
    this.logger.log(`Event type: ${event.type}`);
    this.logger.log(`Network: ${event.event.network}`);
    this.logger.log(`Activities count: ${event.event.activity.length}`);

    // Log each activity
    event.event.activity.forEach((activity, index) => {
      this.logger.log(`Activity ${index + 1}:`);
      this.logger.log(`  From: ${activity.fromAddress}`);
      this.logger.log(`  To: ${activity.toAddress}`);
      this.logger.log(`  Asset: ${activity.asset}`);
      this.logger.log(`  Value: ${activity.value}`);
      this.logger.log(`  Category: ${activity.category}`);
      this.logger.log(`  Hash: ${activity.hash}`);
    });

    // Classify trades (BUY/SELL) and ignore other interactions
    for (const activity of event.event.activity) {
      const trade = this.classifyActivity(activity);
      if (trade) {
        this.logger.log(
          `Trade detected: ${trade.type} ${trade.baseAsset} tx=${trade.hash} token=${trade.tokenAddress ?? 'n/a'}`,
        );
        // TODO: trigger copy-trade pipeline here
      }
    }
  }
}