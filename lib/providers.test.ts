import { beforeAll, describe, expect, it, vi } from 'vitest';

vi.mock('cloudflare:workers', () => ({ env: {} }));

describe('PageSpeed provider', () => {
  let parsePageSpeed: typeof import('./providers').parsePageSpeed;

  beforeAll(async () => {
    ({ parsePageSpeed } = await import('./providers'));
  });

  it('normalizes Lighthouse scores and metrics', () => {
    const result = parsePageSpeed({
      lighthouseResult: {
        fetchTime: '2026-09-08T12:00:00.000Z',
        categories: {
          performance: { score: 0.82 },
          accessibility: { score: 0.91 },
          'best-practices': { score: 0.76 },
          seo: { score: 1 },
        },
        audits: {
          'largest-contentful-paint': { displayValue: '2.1 s' },
          'cumulative-layout-shift': { displayValue: '0.04' },
        },
      },
    });

    expect(result.performance).toBe(82);
    expect(result.accessibility).toBe(91);
    expect(result.bestPractices).toBe(76);
    expect(result.seo).toBe(100);
    expect(result.metrics.lcp).toBe('2.1 s');
    expect(result.metrics.cls).toBe('0.04');
  });
});
