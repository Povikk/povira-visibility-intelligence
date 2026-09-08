'use client';

import { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Download,
  Eye,
  Loader2,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { brand } from '@/config/brand';

type DiscoveryReportData = {
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
  pages: Array<{ url: string }>;
  findings: Array<{
    category: string;
    severity: string;
    evidenceType: string;
    title: string;
    observation: string;
    whyItMatters: string;
  }>;
};

export default function DiscoveryReport({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [data, setData] = useState<DiscoveryReportData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void params.then(({ id }) =>
      fetch(`/api/audits/${id}`)
        .then(async (response) => {
          if (!response.ok) throw new Error('Rapport introuvable.');
          return response.json() as Promise<DiscoveryReportData>;
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
  if (!data) return <ReportState message="Préparation de l’aperçu…" loading />;

  const signals = data.findings.slice(0, 2);

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
              Povira Reports · Lecture synthétique
            </p>
            <h1>
              RAPPORT
              <br />
              DÉCOUVERTE
            </h1>
            <p>
              {data.audit.name} · {data.audit.activity}
            </p>
          </div>
          <div className="report-score">
            <span>{Math.round(data.audit.poviraScore)}</span>
            <small>INDICE DE VISIBILITÉ / 100</small>
          </div>
          <footer>
            <strong>{brand.name}</strong>
            <span>
              {new Date(data.audit.collectedAt).toLocaleDateString('fr-FR')}
            </span>
          </footer>
        </section>

        <section className="report-page">
          <p className="eyebrow">Premier regard</p>
          <h2>{summary(data.audit.poviraScore)}</h2>
          <p className="lead">
            Cette lecture repose sur {data.pages.length} page(s) publique(s) de{' '}
            {data.audit.url}. Elle met en lumière les premiers signaux utiles,
            sans prétendre couvrir l’ensemble du parcours numérique.
          </p>

          <div className="report-grid">
            {data.scores.slice(0, 3).map((score) => (
              <div key={score.key}>
                <strong>{Math.round(score.value)}</strong>
                <span>{labels[score.key] ?? score.key}</span>
              </div>
            ))}
          </div>

          <div className="mt-12">
            <p className="eyebrow">Signaux à regarder</p>
            <div className="report-list mt-4">
              {signals.map((item, index) => (
                <div key={`${item.title}-${index}`}>
                  <span>0{index + 1}</span>
                  <div>
                    <h3>{item.title}</h3>
                    <p>{item.observation}</p>
                    <p>
                      <b>Enjeu.</b> {item.whyItMatters}
                    </p>
                    <small>
                      <Eye /> Signal {item.evidenceType.toLowerCase()} ·{' '}
                      {item.category}
                    </small>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="notice">
            <ShieldCheck />
            Cet aperçu présente volontairement une sélection de constats. Une
            analyse approfondie permettrait de confirmer leur portée, de les
            comparer aux concurrents et de les transformer en plan d’action
            priorisé.
          </div>

          <div className="mt-8 rounded-2xl bg-slate-950 p-7 text-white">
            <p className="flex items-center gap-2 text-sm font-medium text-violet-300">
              <Sparkles className="size-4" /> Pour aller plus loin
            </p>
            <p className="mt-3 text-lg leading-8 text-slate-200">
              Le prochain niveau de lecture consiste à relier ces signaux aux
              objectifs de l’activité, puis à identifier les actions qui auront
              le plus d’impact avec un effort maîtrisé.
            </p>
          </div>

          <footer className="signature">
            {brand.reportSignature} · Aperçu découverte · Méthode{' '}
            {data.audit.scoreVersion}
          </footer>
        </section>
      </article>
    </main>
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
    ? 'Une présence solide, avec encore quelques leviers à révéler.'
    : score >= 65
      ? 'Une base crédible qui peut gagner en impact.'
      : score >= 45
        ? 'Une visibilité existante, mais encore irrégulière.'
        : 'Un potentiel numérique encore peu exploité.';
}
