import { env } from 'cloudflare:workers';

export type ProviderResult<T> = {
  status: 'available' | 'unavailable';
  provider: string;
  data?: T;
  reason?: string;
};
export type PageSpeedData = {
  performance: number | null;
  accessibility: number | null;
  bestPractices: number | null;
  seo: number | null;
  metrics: {
    fcp: string | null;
    lcp: string | null;
    tbt: string | null;
    cls: string | null;
    speedIndex: string | null;
  };
  analyzedAt: string;
};
const score = (value: unknown) =>
  typeof value === 'number' ? Math.round(value * 100) : null;
const display = (audit: unknown) =>
  typeof audit === 'object' &&
  audit !== null &&
  'displayValue' in audit &&
  typeof audit.displayValue === 'string'
    ? audit.displayValue
    : null;

export function parsePageSpeed(payload: unknown): PageSpeedData {
  const root = payload as {
    lighthouseResult?: {
      categories?: Record<string, { score?: number }>;
      audits?: Record<string, unknown>;
      fetchTime?: string;
    };
  };
  const categories = root.lighthouseResult?.categories ?? {};
  const audits = root.lighthouseResult?.audits ?? {};
  return {
    performance: score(categories.performance?.score),
    accessibility: score(categories.accessibility?.score),
    bestPractices: score(categories['best-practices']?.score),
    seo: score(categories.seo?.score),
    metrics: {
      fcp: display(audits['first-contentful-paint']),
      lcp: display(audits['largest-contentful-paint']),
      tbt: display(audits['total-blocking-time']),
      cls: display(audits['cumulative-layout-shift']),
      speedIndex: display(audits['speed-index']),
    },
    analyzedAt: root.lighthouseResult?.fetchTime ?? new Date().toISOString(),
  };
}

export class PageSpeedProvider {
  isConfigured() {
    return true;
  }
  async analyze(url: string): Promise<ProviderResult<PageSpeedData>> {
    try {
      const endpoint = new URL(
        'https://pagespeedonline.googleapis.com/pagespeedonline/v5/runPagespeed',
      );
      endpoint.searchParams.set('url', url);
      endpoint.searchParams.set('strategy', 'mobile');
      for (const category of [
        'PERFORMANCE',
        'ACCESSIBILITY',
        'BEST_PRACTICES',
        'SEO',
      ])
        endpoint.searchParams.append('category', category);
      if (env.PAGESPEED_API_KEY)
        endpoint.searchParams.set('key', env.PAGESPEED_API_KEY);
      const response = await fetch(endpoint, {
        signal: AbortSignal.timeout(30_000),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return {
        status: 'available',
        provider: 'google-pagespeed',
        data: parsePageSpeed(await response.json()),
      };
    } catch (error) {
      return {
        status: 'unavailable',
        provider: 'google-pagespeed',
        reason: error instanceof Error ? error.message : 'Service indisponible',
      };
    }
  }
}

export function integrationStatus() {
  return {
    pagespeed: {
      status: env.PAGESPEED_API_KEY ? 'connected' : 'ready',
      label: env.PAGESPEED_API_KEY
        ? 'Clé configurée'
        : 'Actif sans clé (quota public)',
      missing: [],
    },
    screenshots: {
      status:
        env.CLOUDFLARE_ACCOUNT_ID && env.CLOUDFLARE_BROWSER_RUN_TOKEN
          ? 'connected'
          : 'missing',
      label:
        env.CLOUDFLARE_ACCOUNT_ID && env.CLOUDFLARE_BROWSER_RUN_TOKEN
          ? 'Browser Run connecté'
          : 'Compte gratuit à connecter',
      missing: [
        !env.CLOUDFLARE_ACCOUNT_ID ? 'CLOUDFLARE_ACCOUNT_ID' : null,
        !env.CLOUDFLARE_BROWSER_RUN_TOKEN
          ? 'CLOUDFLARE_BROWSER_RUN_TOKEN'
          : null,
      ].filter(Boolean),
    },
  };
}
