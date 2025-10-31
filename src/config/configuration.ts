export default () => ({
  port: parseInt(process.env.PORT ?? '8080', 10),
  host: process.env.HOST || '0.0.0.0',
  alchemy: {
    signingKey: process.env.ALCHEMY_SIGNING_KEY,
    authToken: process.env.ALCHEMY_AUTH_TOKEN,
    webhookId: process.env.ALCHEMY_WEBHOOK_ID,
    apiBaseUrl: 'https://dashboard.alchemy.com/api',
  },
  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/copy-trading',
  },
  redis: {
    uri: process.env.REDIS_URI || 'redis://localhost:6379',
  },
  swap: {
    apiBaseUrl: process.env.SWAP_API_BASE_URL,
  },
});
