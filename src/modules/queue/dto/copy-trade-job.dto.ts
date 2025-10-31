export interface CopyTradeJobData {
  configId: string;
  accountName: string;
  walletAddress: string;
  telegramId: string;
  maxSlippage: string;
  remainingAmount: string;
  delegationAmount: string;
  
  // Trade details
  tradeType: 'BUY' | 'SELL';
  tokenAddress: string;
  tokenSymbol: string;
  traderAddress: string;
  txHash: string;
  network: string;
  value?: number; // Token amount/value from activity
}

