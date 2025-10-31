export interface ExecuteSwapDto {
  accountName: string;
  fromToken: string;
  toToken: string;
  fromAmount: string; // Amount in wei (as string)
  slippageBps: number; // Slippage in basis points (100 = 1%)
  network: string;
}

export interface SwapResponse {
  success: boolean;
  message?: string;
  data?: {
    transactionHash: string;
    fromAmount: string;
    network: string;
    blockNumber: number;
    gasUsed: string;
    status: string;
    transactionExplorer: string;
  };
  error?: string;
  timestamp?: string;
}

