export interface BalanceResponse {
  success: boolean;
  message?: string;
  data?: {
    account: string;
    network: string;
    totalUsdValue: number;
    balances: Array<{
      token: {
        contractAddress: string;
        name: string;
        symbol: string;
        decimals: number;
      };
      amount: {
        raw: string; // Amount in wei (as string)
        formatted: string;
      };
      price?: {
        usd: number;
        usd_24h_change?: number;
      };
      usdValue?: number;
    }>;
  };
  error?: string;
  timestamp?: string;
}

