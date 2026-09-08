'use client';

import { useEffect, useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  Gauge,
  Image,
  Leaf,
  MessageCircle,
  XCircle,
} from 'lucide-react';

type Item = { status: string; label: string; missing: string[] };
type Status = { pagespeed: Item; screenshots: Item };

export default function SettingsPage() {
  const [data, setData] = useState<Status | null>(null);
  useEffect(() => {
    fetch('/api/integrations')
      .then((response) => response.json() as Promise<Status>)
      .then(setData)
      .catch(() => undefined);
  }, []);
  return (
    <main className="min-h-screen bg-background p-5 text-foreground md:p-10">
      <div className="mx-auto max-w-4xl">
        <a
          href="/"
          className="inline-flex items-center gap-2 text-sm text-violet-400"
        >
          <ArrowLeft className="size-4" />
          Retour au tableau de bord
        </a>
        <div className="mt-8">
          <p className="eyebrow">
            <Leaf className="size-4" /> MODE SANS API PAYANTE
          </p>
          <h1 className="mt-3 text-3xl font-semibold">
            Outils gratuits et inclus
          </h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Povira utilise son analyse interne, PageSpeed sans clé et votre
            accès ChatGPT manuel. Seules les captures Cloudflare demandent un
            compte et un jeton, compatibles avec l’offre gratuite.
          </p>
        </div>
        <div className="mt-8 grid gap-4">
          {data ? (
            <>
              <ProviderCard
                icon={Gauge}
                name="Google PageSpeed Insights"
                item={data.pagespeed}
                description="Mesure mobile réelle : performance, accessibilité, bonnes pratiques, SEO et Core Web Vitals."
              />
              <ProviderCard
                icon={MessageCircle}
                name="ChatGPT manuel"
                item={{
                  status: 'ready',
                  label: 'Sans clé API ni coût API',
                  missing: [],
                }}
                description="Le bouton Analyser avec ChatGPT copie l’audit et ouvre votre compte ChatGPT actuel."
              />
              <ProviderCard
                icon={Image}
                name="Cloudflare Browser Run — gratuit"
                item={data.screenshots}
                description="Génère les aperçus ordinateur et mobile dans la limite du quota gratuit Cloudflare."
              />
            </>
          ) : (
            <div className="panel">Chargement des connexions…</div>
          )}
        </div>
        <div className="panel mt-6">
          <h2 className="panel-title">Captures Cloudflare gratuites</h2>
          <div className="mt-4 grid gap-2 font-mono text-sm text-muted-foreground">
            <code>CLOUDFLARE_ACCOUNT_ID</code>
            <code>CLOUDFLARE_BROWSER_RUN_TOKEN</code>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            Aucun moyen de paiement OpenAI n’est nécessaire. Une fois les deux
            identifiants Cloudflare enregistrés, les captures ordinateur et
            mobile s’activeront automatiquement.
          </p>
        </div>
        <div className="mt-4 rounded-xl border border-emerald-500/25 bg-emerald-500/[.06] p-4 text-sm leading-6 text-muted-foreground">
          Lancez un audit puis utilisez « Analyser avec ChatGPT » : Povira copie
          les mesures et ouvre ChatGPT afin d’utiliser votre abonnement actuel,
          sans appel à l’API OpenAI.
        </div>
      </div>
    </main>
  );
}

function ProviderCard({
  icon: Icon,
  name,
  item,
  description,
}: {
  icon: typeof Gauge;
  name: string;
  item: Item;
  description: string;
}) {
  const ready = item.status !== 'missing';
  return (
    <article className="panel flex flex-col gap-4 sm:flex-row sm:items-center">
      <span className="metric-icon bg-violet-500/10 text-violet-400">
        <Icon />
      </span>
      <div className="flex-1">
        <h2 className="font-semibold">{name}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        <p className="mt-2 text-sm">{item.label}</p>
        {item.missing.length > 0 && (
          <p className="mt-2 font-mono text-xs text-amber-400">
            Manquant : {item.missing.join(', ')}
          </p>
        )}
      </div>
      <span className={`result-badge ${ready ? 'good' : ''}`}>
        {ready ? <CheckCircle2 /> : <XCircle />}
        {ready ? 'Prêt' : 'À configurer'}
      </span>
    </article>
  );
}
