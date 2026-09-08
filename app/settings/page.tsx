'use client';

import { useEffect, useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  Gauge,
  Image,
  KeyRound,
  Sparkles,
  XCircle,
} from 'lucide-react';

type Item = { status: string; label: string; missing: string[] };
type Status = { pagespeed: Item; openai: Item; screenshots: Item };

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
            <KeyRound className="size-4" /> Connexions sécurisées
          </p>
          <h1 className="mt-3 text-3xl font-semibold">
            Paramètres des fournisseurs
          </h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Les secrets sont lus uniquement côté serveur. Cette page ne les
            affiche jamais et indique précisément ce qu’il reste à configurer.
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
                icon={Sparkles}
                name="OpenAI"
                item={data.openai}
                description="Produit une synthèse factuelle en français à partir des mesures collectées, sans inventer de score."
              />
              <ProviderCard
                icon={Image}
                name="Cloudflare Browser Rendering"
                item={data.screenshots}
                description="Génère à la demande les aperçus ordinateur et mobile du site audité."
              />
            </>
          ) : (
            <div className="panel">Chargement des connexions…</div>
          )}
        </div>
        <div className="panel mt-6">
          <h2 className="panel-title">
            Variables à configurer dans l’hébergement
          </h2>
          <div className="mt-4 grid gap-2 font-mono text-sm text-muted-foreground">
            <code>PAGESPEED_API_KEY (optionnelle)</code>
            <code>OPENAI_API_KEY</code>
            <code>OPENAI_MODEL (optionnelle, défaut : gpt-5.4-mini)</code>
            <code>CLOUDFLARE_ACCOUNT_ID</code>
            <code>CLOUDFLARE_BROWSER_RENDERING_TOKEN</code>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            Une fois les variables enregistrées et le site redéployé, rechargez
            cette page : l’état passera automatiquement à « Connecté ».
          </p>
        </div>
        <div className="mt-4 rounded-xl border border-emerald-500/25 bg-emerald-500/[.06] p-4 text-sm leading-6 text-muted-foreground">
          Sans clé API, lancez un audit puis utilisez « Analyser avec ChatGPT » :
          Povira copie les mesures et ouvre ChatGPT afin d’utiliser votre
          abonnement actuel.
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
