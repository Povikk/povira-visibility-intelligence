import { z } from 'zod';
import {
  analyzeBusiness,
  type AuditProgressUpdate,
  type AuditResult,
} from '@/lib/analyzer';
import { safeUrlSchema } from '@/lib/url-safety';
import { clearAuditData, getAuditHistory, saveAudit } from '@/db/audit-store';
import { integrationStatus, PageSpeedProvider } from '@/lib/providers';

const auditRequest = z.object({
  name: z.string().trim().min(1).max(120),
  url: safeUrlSchema,
  activity: z.string().trim().min(2).max(180),
  mode: z.enum(['quick', 'complete']).default('quick'),
});

export async function POST(request: Request) {
  const parsed = auditRequest.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return Response.json(
      {
        error: 'INVALID_AUDIT_REQUEST',
        message:
          'Vérifiez le nom, l’activité et utilisez une URL publique HTTP(S).',
        issues: z.treeifyError(parsed.error),
      },
      { status: 400 },
    );

  if (request.headers.get('accept')?.includes('application/x-ndjson')) {
    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        const send = (payload: unknown) =>
          controller.enqueue(encoder.encode(`${JSON.stringify(payload)}\n`));
        void runAudit(parsed.data, (update) =>
          send({ type: 'progress', ...update }),
        )
          .then((result) => send({ type: 'result', result }))
          .catch((error) =>
            send({
              type: 'error',
              message:
                error instanceof Error ? error.message : 'Audit impossible.',
            }),
          )
          .finally(() => controller.close());
      },
    });
    return new Response(stream, {
      headers: {
        'Content-Type': 'application/x-ndjson; charset=utf-8',
        'Cache-Control': 'no-store',
      },
    });
  }

  try {
    const result = await runAudit(parsed.data);
    return Response.json(result, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return Response.json(
      {
        error: 'AUDIT_FAILED',
        message: error instanceof Error ? error.message : 'Audit impossible.',
      },
      { status: 422 },
    );
  }
}

async function runAudit(
  data: z.infer<typeof auditRequest>,
  report?: (update: AuditProgressUpdate) => void,
): Promise<AuditResult> {
  const result = await analyzeBusiness(data, report);
  report?.({
    progress: 76,
    stage: 'Mesure PageSpeed mobile',
    detail: 'Performance, accessibilité, bonnes pratiques et SEO Google.',
  });
  const pageSpeed = await new PageSpeedProvider().analyze(result.business.url);
  if (pageSpeed.status === 'available' && pageSpeed.data) {
    result.performance = pageSpeed.data;
    result.providers.performance = 'available';
    result.sources.push({
      label: 'Google PageSpeed Insights',
      url: 'https://pagespeed.web.dev/',
      collectedAt: pageSpeed.data.analyzedAt,
      evidenceType: 'MEASURED',
    });
  }
  report?.({
    progress: 88,
    stage: 'Préparation des résultats',
    detail: 'Consolidation des preuves et préparation des captures.',
  });
  if (integrationStatus().screenshots.status === 'connected') {
    result.providers.screenshots = 'available';
    result.screenshots = {
      desktop: `/api/screenshots?url=${encodeURIComponent(result.business.url)}&viewport=desktop`,
      mobile: `/api/screenshots?url=${encodeURIComponent(result.business.url)}&viewport=mobile`,
    };
  }
  report?.({
    progress: 94,
    stage: 'Génération du rapport',
    detail: 'Sauvegarde de l’audit, des constats et des recommandations.',
  });
  try {
    await saveAudit(result);
    result.persistence = 'saved';
  } catch (error) {
    console.error(
      JSON.stringify({
        module: 'persistence',
        success: false,
        error: error instanceof Error ? error.message : 'unknown',
      }),
    );
  }
  report?.({
    progress: 100,
    stage: 'Audit terminé',
    detail: `${result.pages.length} page(s) et ${result.findings.length} constat(s) consolidés.`,
  });
  return result;
}

export async function GET() {
  try {
    return Response.json(
      { audits: await getAuditHistory() },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch {
    return Response.json({ audits: [], warning: 'Historique indisponible.' });
  }
}

export async function DELETE() {
  try {
    await clearAuditData();
    return Response.json(
      { cleared: true },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch {
    return Response.json({ error: 'DATABASE_UNAVAILABLE' }, { status: 503 });
  }
}
