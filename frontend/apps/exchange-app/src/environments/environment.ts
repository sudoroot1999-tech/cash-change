export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000/api/v1',
  wsUrl: 'ws://localhost:3005/ws',

  // Feature flags
  features: {
    darkMode: true,
    advancedTrading: true,
    marginTrading: false,
    futures: false,
  },
};
