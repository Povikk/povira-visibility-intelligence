import { env } from 'cloudflare:workers';
import type { AuditResult } from '@/lib/analyzer';
import { weights } from '@/lib/scoring';

function stableId(prefix: string, value: string) {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `${prefix}_${(hash >>> 0).toString(36)}`;
}

export async function saveAudit(result: AuditResult) {
  const db = env.DB;
  if (!db) throw new Error('D1 indisponible');
  const now = Date.now();
  const workspaceId = 'workspace_default';
  const businessId = stableId('business', result.business.name.toLowerCase());
  const statements: D1PreparedStatement[] = [
    db
      .prepare(
        'INSERT INTO workspaces (id,name,created_at,updated_at) VALUES (?,?,?,?) ON CONFLICT(id) DO UPDATE SET updated_at=excluded.updated_at',
      )
      .bind(workspaceId, 'Povira Workspace', now, now),
    db
      .prepare(
        'INSERT INTO businesses (id,workspace_id,name,website_url,activity,business_model,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET website_url=excluded.website_url,activity=excluded.activity,updated_at=excluded.updated_at',
      )
      .bind(
        businessId,
        workspaceId,
        result.business.name,
        result.business.url,
        result.business.activity,
        'unknown',
        now,
        now,
      ),
    db
      .prepare(
        'INSERT INTO audits (id,business_id,mode,status,started_at,completed_at,demo,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?)',
      )
      .bind(
        result.id,
        businessId,
        'quick',
        'completed',
        now - result.durationMs,
        now,
        0,
        now,
        now,
      ),
  ];
  result.pages.forEach((page) =>
    statements.push(
      db
        .prepare(
          'INSERT INTO audit_pages (id,audit_id,url,status_code,title,description,h1_count,word_count,indexable,raw) VALUES (?,?,?,?,?,?,?,?,?,?)',
        )
        .bind(
          crypto.randomUUID(),
          result.id,
          page.url,
          page.statusCode,
          page.title,
          page.description,
          page.h1Count,
          page.wordCount,
          1,
          JSON.stringify({
            canonical: page.canonical,
            viewport: page.viewport,
            schemaCount: page.schemaCount,
            imageCount: page.imageCount,
            imagesWithoutAlt: page.imagesWithoutAlt,
            favicon: page.favicon,
            logo: page.logo,
            colors: page.colors,
            lang: page.lang,
          }),
        ),
    ),
  );
  result.sources.forEach((source) =>
    statements.push(
      db
        .prepare(
          'INSERT INTO sources (id,audit_id,label,url,collected_at,evidence_type,confidence) VALUES (?,?,?,?,?,?,?)',
        )
        .bind(
          crypto.randomUUID(),
          result.id,
          source.label,
          source.url,
          Date.parse(source.collectedAt),
          source.evidenceType,
          'high',
        ),
    ),
  );
  result.findings.forEach((item) => {
    const findingId = item.id;
    statements.push(
      db
        .prepare(
          'INSERT INTO findings (id,audit_id,category,severity,evidence_type,confidence,title,observation,why_it_matters,status) VALUES (?,?,?,?,?,?,?,?,?,?)',
        )
        .bind(
          findingId,
          result.id,
          item.category,
          item.severity,
          item.evidenceType,
          item.confidence,
          item.title,
          item.observation,
          item.whyItMatters,
          'open',
        ),
    );
    statements.push(
      db
        .prepare(
          'INSERT INTO recommendations (id,finding_id,title,fix,impact,effort,priority_group) VALUES (?,?,?,?,?,?,?)',
        )
        .bind(
          crypto.randomUUID(),
          findingId,
          item.title,
          item.fix,
          item.impact,
          item.effort,
          item.impact === 'high' && item.effort === 'low'
            ? 'quick_win'
            : item.impact === 'high'
              ? 'strategic'
              : 'nice_to_have',
        ),
    );
  });
  result.scores.forEach((score) =>
    statements.push(
      db
        .prepare(
          'INSERT INTO scores (id,audit_id,key,value,applicable,weight,method_version,confidence) VALUES (?,?,?,?,?,?,?,?)',
        )
        .bind(
          crypto.randomUUID(),
          result.id,
          score.key,
          score.value,
          score.applicable ? 1 : 0,
          weights[score.key],
          result.scoreVersion,
          score.confidence,
        ),
    ),
  );
  statements.push(
    db
      .prepare(
        'INSERT INTO scores (id,audit_id,key,value,applicable,weight,method_version,confidence) VALUES (?,?,?,?,?,?,?,?)',
      )
      .bind(
        crypto.randomUUID(),
        result.id,
        'povira',
        result.poviraScore,
        1,
        100,
        result.scoreVersion,
        'medium',
      ),
  );
  await db.batch(statements);
}

export async function getAuditHistory() {
  const db = env.DB;
  if (!db) return [];
  const result = await db
    .prepare(
      "SELECT a.id,a.completed_at AS completedAt,b.name,b.website_url AS websiteUrl,s.value AS score FROM audits a JOIN businesses b ON b.id=a.business_id LEFT JOIN scores s ON s.audit_id=a.id AND s.key='povira' WHERE a.status='completed' ORDER BY a.completed_at DESC LIMIT 12",
    )
    .all();
  return result.results;
}

export async function clearAuditData() {
  const db = env.DB;
  if (!db) throw new Error('D1 indisponible');
  await db.batch([
    db.prepare('DELETE FROM recommendations'),
    db.prepare('DELETE FROM reports'),
    db.prepare('DELETE FROM jobs'),
    db.prepare('DELETE FROM scores'),
    db.prepare('DELETE FROM usage_events'),
    db.prepare('DELETE FROM audit_pages'),
    db.prepare('DELETE FROM findings'),
    db.prepare('DELETE FROM sources'),
    db.prepare('DELETE FROM audits'),
    db.prepare('DELETE FROM competitors'),
    db.prepare('DELETE FROM businesses'),
    db.prepare('DELETE FROM workspaces'),
  ]);
}
