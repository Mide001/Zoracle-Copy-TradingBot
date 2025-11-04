export default () => ({
  port: parseInt(process.env.PORT ?? '8080', 10),
  host: process.env.HOST || '0.0.0.0',
  alchemy: {
    signingKey: process.env.ALCHEMY_SIGNING_KEY,
    authToken: process.env.ALCHEMY_AUTH_TOKEN,
    webhookId: process.env.ALCHEMY_WEBHOOK_ID,
    apiBaseUrl: process.env.ALCHEMY_API_BASE_URL || 'https://dashboard.alchemy.com/api',
  },
  mongodb: {
    uri: process.env.MONGODB_URI,
  },
  redis: {
    uri: process.env.REDIS_URI,
  },
  swap: {
    apiBaseUrl: process.env.SWAP_API_BASE_URL,
  },
  notifications: {
    telegramBotApiUrl: process.env.TELEGRAM_BOT_API_URL,
  },
});
