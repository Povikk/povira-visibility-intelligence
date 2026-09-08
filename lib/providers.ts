import { env } from 'cloudflare:workers';
import { z } from 'zod';

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
export type AIInsights = {
  summary: string;
  strengths: string[];
  priorities: string[];
  confidence: 'high' | 'medium' | 'low';
};

const aiInsightsSchema = z.object({
  summary: z.string(),
  strengths: z.array(z.string()).max(5),
  priorities: z.array(z.string()).max(5),
  confidence: z.enum(['high', 'medium', 'low']),
});
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

export class OpenAIInsightsProvider {
  isConfigured() {
    return Boolean(env.OPENAI_API_KEY);
  }
  async analyze(input: unknown): Promise<ProviderResult<AIInsights>> {
    if (!this.isConfigured())
      return {
        status: 'unavailable',
        provider: 'openai',
        reason: 'OPENAI_API_KEY manquante',
      };
    try {
      const response = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: env.OPENAI_MODEL || 'gpt-5.4-mini',
          store: false,
          instructions:
            'Tu analyses uniquement les faits fournis. Réponds en français. N’invente aucune mesure. Sois bref, concret et orienté action.',
          input: JSON.stringify(input),
          text: {
            format: {
              type: 'json_schema',
              name: 'audit_insights',
              strict: true,
              schema: {
                type: 'object',
                additionalProperties: false,
                properties: {
                  summary: { type: 'string' },
                  strengths: {
                    type: 'array',
                    items: { type: 'string' },
                    maxItems: 5,
                  },
                  priorities: {
                    type: 'array',
                    items: { type: 'string' },
                    maxItems: 5,
                  },
                  confidence: {
                    type: 'string',
                    enum: ['high', 'medium', 'low'],
                  },
                },
                required: ['summary', 'strengths', 'priorities', 'confidence'],
              },
            },
          },
        }),
        signal: AbortSignal.timeout(30_000),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const payload = (await response.json()) as {
        output_text?: string;
        output?: Array<{ content?: Array<{ text?: string }> }>;
      };
      const outputText =
        payload.output_text ??
        payload.output
          ?.flatMap((item) => item.content ?? [])
          .find((item) => item.text)?.text ??
        '';
      return {
        status: 'available',
        provider: 'openai',
        data: aiInsightsSchema.parse(JSON.parse(outputText)),
      };
    } catch (error) {
      return {
        status: 'unavailable',
        provider: 'openai',
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
    openai: {
      status: env.OPENAI_API_KEY ? 'connected' : 'missing',
      label: env.OPENAI_API_KEY
        ? `Modèle ${env.OPENAI_MODEL || 'gpt-5.4-mini'}`
        : 'Clé API requise',
      missing: env.OPENAI_API_KEY ? [] : ['OPENAI_API_KEY'],
    },
    screenshots: {
      status:
        env.CLOUDFLARE_ACCOUNT_ID && env.CLOUDFLARE_BROWSER_RENDERING_TOKEN
          ? 'connected'
          : 'missing',
      label:
        env.CLOUDFLARE_ACCOUNT_ID && env.CLOUDFLARE_BROWSER_RENDERING_TOKEN
          ? 'Browser Rendering connecté'
          : 'Identifiants Cloudflare requis',
      missing: [
        !env.CLOUDFLARE_ACCOUNT_ID ? 'CLOUDFLARE_ACCOUNT_ID' : null,
        !env.CLOUDFLARE_BROWSER_RENDERING_TOKEN
          ? 'CLOUDFLARE_BROWSER_RENDERING_TOKEN'
          : null,
      ].filter(Boolean),
    },
  };
}
