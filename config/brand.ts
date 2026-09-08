export const brand = {
  name: 'Povira', shortName: 'Povira', tagline: 'See how your business is seen.',
  description: 'Analyze how a business is seen across search, AI, content, brand, reputation and the web.',
  logo: '/logo.svg', favicon: '/favicon.ico', reportSignature: 'Audited with Povira',
  supportEmail: 'support@example.com', websiteUrl: process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
} as const;
