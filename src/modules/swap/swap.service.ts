import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosError } from 'axios';
import { ExecuteSwapDto, SwapResponse } from './dto/execute-swap.dto';
import type { BalanceResponse } from './dto/balance-response.dto';

@Injectable()
export class SwapService {
  private readonly logger = new Logger(SwapService.name);
  private readonly apiBaseUrl: string;

  // ETH/WETH addresses for Base network
  private readonly NATIVE_TOKEN_ADDRESS = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE'; // ETH
  private readonly WETH_ADDRESS = '0x4200000000000000000000000000000000000006'; // WETH on Base

  constructor(private configService: ConfigService) {
    const apiBaseUrl = this.configService.get<string>('swap.apiBaseUrl');
    
    if (!apiBaseUrl) {
      throw new Error(
        'SWAP_API_BASE_URL environment variable is required but not set',
      );
    }
    
    this.apiBaseUrl = apiBaseUrl;
  }

  /**
   * Execute a token swap
   */
  async executeSwap(dto: ExecuteSwapDto): Promise<SwapResponse> {
    try {
      this.logger.log(
        `Executing swap: ${dto.accountName} | ${dto.fromToken} → ${dto.toToken} | Amount: ${dto.fromAmount} | Slippage: ${dto.slippageBps}bps`,
      );

      const response = await axios.post<SwapResponse>(
        `${this.apiBaseUrl}/api/swaps/execute`,
        dto,
        {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 60000, // 60 second timeout
        },
      );

      if (response.data.success) {
        this.logger.log(
          `Swap executed successfully: ${response.data.data?.transactionHash}`,
        );
      }

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError<SwapResponse>;
        
        if (axiosError.response) {
          // Server responded with error status
          const status = axiosError.response.status;
          const errorData = axiosError.response.data;

          this.logger.error(
            `Swap API error [${status}]: ${errorData?.error || axiosError.message}`,
          );

          // Map HTTP status to NestJS exceptions
          switch (status) {
            case 400:
              throw new HttpException(
                errorData?.error || 'Invalid swap request',
                HttpStatus.BAD_REQUEST,
              );
            case 429:
              throw new HttpException(
                errorData?.error || 'Rate limit exceeded',
                HttpStatus.TOO_MANY_REQUESTS,
              );
            case 500:
              throw new HttpException(
                errorData?.error || 'Swap service error',
                HttpStatus.INTERNAL_SERVER_ERROR,
              );
            default:
              throw new HttpException(
                errorData?.error || 'Swap request failed',
                HttpStatus.BAD_GATEWAY,
              );
          }
        } else {
          // Network error or no response
          this.logger.error(`Swap API network error: ${axiosError.message}`);
          throw new HttpException(
            'Failed to connect to swap service',
            HttpStatus.BAD_GATEWAY,
          );
        }
      }

      // Unknown error
      this.logger.error(`Unexpected swap error: ${error.message}`);
      throw new HttpException(
        'Unexpected error during swap execution',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get native token address (ETH) for network
   */
  getNativeTokenAddress(network: string): string {
    return this.NATIVE_TOKEN_ADDRESS;
  }

  /**
   * Convert slippage percentage (0.01 = 1%) to basis points (100 = 1%)
   */
  convertSlippageToBps(slippage: string): number {
    const slippageNum = parseFloat(slippage);
    return Math.round(slippageNum * 10000); // 0.01 * 10000 = 100 bps
  }

  /**
   * Convert amount to wei (assuming 18 decimals)
   */
  convertToWei(amount: string): string {
    const amountNum = parseFloat(amount);
    const weiAmount = BigInt(Math.floor(amountNum * 1e18));
    return weiAmount.toString();
  }

  /**
   * Normalize network name (BASE_MAINNET → base)
   */
  normalizeNetwork(network: string): string {
    const normalized = network.toLowerCase();
    if (normalized.includes('base')) {
      return 'base';
    }
    return normalized;
  }

  /**
   * Query token balance for a wallet
   */
  async getTokenBalance(
    accountName: string,
    tokenAddress: string,
    network: string,
  ): Promise<string | null> {
    try {
      this.logger.debug(
        `Querying balance for ${accountName} token ${tokenAddress} on ${network}`,
      );

      const response = await axios.get<BalanceResponse>(
        `${this.apiBaseUrl}/api/balances/${accountName}`,
        {
          params: {
            network,
          },
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 30000,
        },
      );

      if (response.data.success && response.data.data?.balances) {
        // Normalize token address for comparison (lowercase)
        const normalizedTokenAddress = tokenAddress.toLowerCase();
        
        // Find the token in balances array
        const tokenBalance = response.data.data.balances.find(
          (balance: any) =>
            balance.token?.contractAddress?.toLowerCase() ===
            normalizedTokenAddress,
        );

        if (tokenBalance?.amount?.raw) {
          const balanceWei = tokenBalance.amount.raw;
          this.logger.log(
            `Found balance for ${tokenBalance.token.symbol}: ${tokenBalance.amount.formatted} (${balanceWei} wei)`,
          );
          return balanceWei;
        } else {
          this.logger.warn(
            `Token ${tokenAddress} not found in balances for ${accountName}`,
          );
          return null;
        }
      } else {
        this.logger.error(
          `Balance API returned unsuccessful response: ${response.data.message || 'Unknown error'}`,
        );
        return null;
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        this.logger.error(
          `Error querying balance API: ${error.message}`,
        );
      } else {
        this.logger.error(`Unexpected error querying balance: ${error.message}`);
      }
      return null;
    }
  }
}

