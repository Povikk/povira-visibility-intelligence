'use client';
import { useEffect, useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  Download,
  Loader2,
  ShieldCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { brand } from '@/config/brand';

type ReportData = {
  audit: {
    id: string;
    collectedAt: number;
    name: string;
    activity: string;
    url: string;
    poviraScore: number;
    scoreVersion: string;
  };
  scores: Array<{ key: string; value: number; confidence: string }>;
  pages: Array<{
    url: string;
    statusCode: number;
    title: string | null;
    description: string | null;
    h1Count: number;
    wordCount: number;
    raw: Record<string, unknown>;
  }>;
  findings: Array<{
    category: string;
    severity: string;
    evidenceType: string;
    confidence: string;
    title: string;
    observation: string;
    whyItMatters: string;
    fix: string;
    impact: string;
    effort: string;
  }>;
};
export default function AuditReport({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [data, setData] = useState<ReportData | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    void params.then(({ id }) =>
      fetch(`/api/audits/${id}`)
        .then(async (response) => {
          if (!response.ok) throw new Error('Rapport introuvable.');
          return response.json() as Promise<ReportData>;
        })
        .then(setData)
        .catch((cause) =>
          setError(
            cause instanceof Error ? cause.message : 'Rapport indisponible.',
          ),
        ),
    );
  }, [params]);
  if (error) return <ReportState message={error} />;
  if (!data) return <ReportState message="Préparation du rapport…" loading />;
  const performance = readPerformance(data.pages[0]?.raw.performance);
  const pagesWithDescription = data.pages.filter(
    (page) => page.description,
  ).length;
  const totalWords = data.pages.reduce(
    (sum, page) => sum + (page.wordCount ?? 0),
    0,
  );
  return (
    <main className="report-shell">
      <div className="report-actions print:hidden">
        <a
          href="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground"
        >
          <ArrowLeft className="size-4" />
          Retour au tableau de bord
        </a>
        <Button onClick={() => window.print()}>
          <Download />
          Télécharger en PDF
        </Button>
      </div>
      <article className="report-paper">
        <section className="report-cover">
          <div>
            <p className="eyebrow text-violet-300">
              Povira Reports · Audit mesuré
            </p>
            <h1>
              AUDIT DE
              <br />
              VISIBILITÉ NUMÉRIQUE
            </h1>
            <p>
              {data.audit.name} · {data.audit.activity}
            </p>
          </div>
          <div className="report-score">
            <span>{data.audit.poviraScore}</span>
            <small>POVIRA SCORE / 100</small>
          </div>
          <footer>
            <strong>{brand.name}</strong>
            <span>
              {new Date(data.audit.collectedAt).toLocaleDateString('fr-FR')}
            </span>
          </footer>
        </section>
        <section className="report-page">
          <p className="eyebrow">Synthèse exécutive</p>
          <h2>{summary(data.audit.poviraScore)}</h2>
          <p className="lead">
            Povira a exploré {data.pages.length} page(s) publique(s) de{' '}
            {data.audit.url}. Le score repose uniquement sur les dimensions
            effectivement mesurables dans le HTML collecté.
          </p>
          <div className="report-grid">
            {data.scores.slice(0, 4).map((score) => (
              <div key={score.key}>
                <strong>{Math.round(score.value)}</strong>
                <span>{labels[score.key] ?? score.key}</span>
              </div>
            ))}
          </div>
          <div className="notice">
            <ShieldCheck />
            L’audit utilise les mesures internes et PageSpeed gratuit. Les
            services non configurés sont exclus au lieu d’être remplacés par des
            estimations.
          </div>
        </section>
        <section className="report-page">
          <p className="eyebrow">Performance et couverture</p>
          <h2>Ce que les mesures racontent</h2>
          {performance ? (
            <>
              <div className="report-grid">
                <div>
                  <strong>{performance.performance ?? '—'}</strong>
                  <span>Performance mobile</span>
                </div>
                <div>
                  <strong>{performance.accessibility ?? '—'}</strong>
                  <span>Accessibilité</span>
                </div>
                <div>
                  <strong>{performance.bestPractices ?? '—'}</strong>
                  <span>Bonnes pratiques</span>
                </div>
                <div>
                  <strong>{performance.seo ?? '—'}</strong>
                  <span>SEO Google</span>
                </div>
              </div>
              <div className="mt-8 grid gap-4 sm:grid-cols-2">
                <ReportMetric label="LCP" value={performance.metrics.lcp} />
                <ReportMetric label="FCP" value={performance.metrics.fcp} />
                <ReportMetric label="TBT" value={performance.metrics.tbt} />
                <ReportMetric label="CLS" value={performance.metrics.cls} />
              </div>
            </>
          ) : (
            <div className="notice">
              <ShieldCheck /> La mesure PageSpeed n’était pas disponible lors de
              cet audit ; elle n’a pas été estimée artificiellement.
            </div>
          )}
          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            <ReportMetric
              label="Pages explorées"
              value={String(data.pages.length)}
            />
            <ReportMetric
              label="Volume observé"
              value={`${totalWords.toLocaleString('fr-FR')} mots`}
            />
            <ReportMetric
              label="Descriptions présentes"
              value={`${pagesWithDescription}/${data.pages.length}`}
            />
          </div>
        </section>
        <section className="report-page">
          <p className="eyebrow">Plan d’action</p>
          <h2>{data.findings.length} opportunité(s) observée(s)</h2>
          <div className="report-list">
            {data.findings.slice(0, 10).map((item, index) => (
              <div key={`${item.title}-${index}`}>
                <span>0{index + 1}</span>
                <div>
                  <h3>{item.title}</h3>
                  <p>
                    <b>Ce que nous avons observé.</b> {item.observation}
                  </p>
                  <p>
                    <b>Pourquoi c’est important.</b> {item.whyItMatters}
                  </p>
                  <p>
                    <b>Comment le corriger.</b> {item.fix}
                  </p>
                  <small>
                    <CheckCircle2 /> Impact {translate(item.impact)} · effort{' '}
                    {translate(item.effort)} · {item.evidenceType} · confiance{' '}
                    {translate(item.confidence)}
                  </small>
                </div>
              </div>
            ))}
          </div>
          <footer className="signature">
            {brand.reportSignature} · Méthode {data.audit.scoreVersion}
          </footer>
        </section>
        <section className="report-page">
          <p className="eyebrow">Pages analysées</p>
          <h2>Sources de l’audit</h2>
          <div className="mt-10 divide-y divide-slate-200">
            {data.pages.map((page) => (
              <div className="py-6" key={page.url}>
                <p className="font-semibold">{page.title || 'Sans titre'}</p>
                <p className="mt-1 break-all text-sm text-violet-700">
                  {page.url}
                </p>
                <p className="mt-2 text-sm text-slate-500">
                  HTTP {page.statusCode} · {page.wordCount} mots ·{' '}
                  {page.h1Count} H1
                </p>
              </div>
            ))}
          </div>
          <div className="mt-12 rounded-2xl bg-slate-100 p-7">
            <h3 className="text-xl font-semibold">Périmètre et méthode</h3>
            <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-6 text-slate-600">
              <li>
                Exploration des pages publiques accessibles et autorisées.
              </li>
              <li>
                Lecture des balises SEO, contenus, images, données structurées
                et signaux de conversion.
              </li>
              <li>
                Mesure PageSpeed mobile lorsqu’elle est disponible, sans valeur
                inventée en cas d’échec.
              </li>
              <li>
                Les données privées, avis externes et moteurs IA ne sont pas
                inclus sans fournisseur dédié.
              </li>
            </ul>
          </div>
        </section>
      </article>
    </main>
  );
}

type PerformanceSnapshot = {
  performance: number | null;
  accessibility: number | null;
  bestPractices: number | null;
  seo: number | null;
  metrics: {
    fcp: string | null;
    lcp: string | null;
    tbt: string | null;
    cls: string | null;
  };
};

function readPerformance(value: unknown): PerformanceSnapshot | null {
  if (!value || typeof value !== 'object' || !('metrics' in value)) return null;
  return value as PerformanceSnapshot;
}

function ReportMetric({
  label,
  value,
}: {
  label: string;
  value: string | number | null;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value ?? '—'}</p>
    </div>
  );
}
const labels: Record<string, string> = {
  technicalSeo: 'SEO technique',
  content: 'Qualité du contenu',
  brand: 'Cohérence de marque',
  conversion: 'Préparation conversion',
};
function ReportState({
  message,
  loading = false,
}: {
  message: string;
  loading?: boolean;
}) {
  return (
    <main className="grid min-h-screen place-items-center bg-[#090a10] text-white">
      <div className="text-center">
        {loading && <Loader2 className="mx-auto mb-4 animate-spin" />}
        <p>{message}</p>
        <a href="/" className="mt-4 inline-block text-violet-400">
          Retour au tableau de bord
        </a>
      </div>
    </main>
  );
}
function summary(score: number) {
  return score >= 80
    ? 'Une présence numérique très solide.'
    : score >= 65
      ? 'Une base solide et des leviers clairement identifiés.'
      : score >= 45
        ? 'Une visibilité présente, mais encore irrégulière.'
        : 'Des fondamentaux importants restent à construire.';
}
function translate(value: string) {
  return value === 'high'
    ? 'élevé'
    : value === 'medium'
      ? 'moyen'
      : value === 'low'
        ? 'faible'
        : value;
}
