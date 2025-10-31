export interface TradeNotificationDto {
  telegramId: string;
  configId: string;
  accountName: string;
  tradeType: 'BUY' | 'SELL';
  tokenSymbol: string;
  tokenAddress: string;
  tokenAmount: string; // Formatted amount
  transactionHash: string;
  transactionExplorer: string;
  network: string;
}

