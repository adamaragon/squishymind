export const sentryOptions = {
  dsn: 'https://9420b0edb357d4598e923c8e6bb28798@o4511498051715072.ingest.us.sentry.io/4511840204423168',
  enabled: process.env.NODE_ENV === 'production',
  environment: process.env.NODE_ENV === 'production' ? 'production' : 'development',
  sendDefaultPii: false,
  dataCollection: { userInfo: false, httpBodies: [] },
  tracesSampleRate: 0,
};
