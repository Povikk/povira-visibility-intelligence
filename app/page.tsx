'use client';

import { useEffect, useMemo, useState } from 'react';
import NextImage from 'next/image';
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Building2,
  Check,
  ChevronRight,
  CircleDot,
  FileText,
  Gauge,
  Globe2,
  LayoutDashboard,
  Menu,
  MessageCircle,
  Moon,
  Plus,
  Radar,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Sun,
  Target,
  X,
} from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { brand } from '@/config/brand';
import type { AuditResult } from '@/lib/analyzer';

const nav = [
  { label: 'Vue d’ensemble', icon: LayoutDashboard },
  { label: 'Entreprises', icon: Building2 },
  { label: 'Audits', icon: Radar },
  { label: 'Rapports', icon: FileText },
  { label: 'Prospects', icon: Target },
];
const demoScores = [
  {
    key: 'ai',
    label: 'Visibilité IA',
    value: 54,
    icon: Sparkles,
    color: '#a78bfa',
  },
  {
    key: 'search',
    label: 'Recherche',
    value: 68,
    icon: Search,
    color: '#60a5fa',
  },
  {
    key: 'technicalSeo',
    label: 'SEO technique',
    value: 81,
    icon: Gauge,
    color: '#2dd4bf',
  },
  {
    key: 'brand',
    label: 'Cohérence de marque',
    value: 72,
    icon: CircleDot,
    color: '#fbbf24',
  },
];
const demoPriorities = [
  {
    title: 'Clarifier la proposition de valeur',
    category: 'Conversion',
    impact: 'high',
    effort: 'medium',
    evidenceType: 'OBSERVED',
  },
  {
    title: 'Ajouter les données structurées Service',
    category: 'SEO technique',
    impact: 'high',
    effort: 'low',
    evidenceType: 'MEASURED',
  },
  {
    title: 'Créer trois pages dédiées aux offres',
    category: 'Contenu',
    impact: 'high',
    effort: 'medium',
    evidenceType: 'OBSERVED',
  },
];
const scoreIcons = {
  technicalSeo: Gauge,
  content: FileText,
  brand: CircleDot,
  conversion: Target,
  search: Search,
  ai: Sparkles,
  authority: Globe2,
  reputation: ShieldCheck,
  entity: CircleDot,
  social: Globe2,
  local: Target,
};
const scoreColors = ['#2dd4bf', '#60a5fa', '#fbbf24', '#a78bfa'];

export default function Home() {
  const [dark, setDark] = useState(true);
  const [mobile, setMobile] = useState(false);
  const [active, setActive] = useState('Vue d’ensemble');
  const [business, setBusiness] = useState('Nova Mapping');
  const [url, setUrl] = useState('https://example.com');
  const [activity, setActivity] = useState('Créateur de mappings FiveM');
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AuditResult | null>(null);
  const [chatGptCopied, setChatGptCopied] = useState(false);

  async function analyzeWithChatGPT() {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(buildChatGptPrompt(result));
      window.open('https://chatgpt.com/', '_blank', 'noopener,noreferrer');
      setChatGptCopied(true);
      window.setTimeout(() => setChatGptCopied(false), 8_000);
    } catch {
      setError(
        "Le navigateur n’a pas autorisé la copie. Réessayez depuis une fenêtre sécurisée.",
      );
    }
  }

  async function audit(payload = { name: business, url, activity }) {
    setRunning(true);
    setError(null);
    setProgress(8);
    const timer = window.setInterval(
      () =>
        setProgress((value) =>
          Math.min(value + Math.ceil(Math.random() * 7), 88),
        ),
      650,
    );
    try {
      const response = await fetch('/api/audits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, mode: 'quick' }),
      });
      const data = (await response.json()) as
        | AuditResult
        | { message?: string };
      if (!response.ok)
        throw new Error(
          'message' in data && data.message
            ? data.message
            : 'Audit impossible.',
        );
      setResult(data as AuditResult);
      setBusiness(payload.name);
      setUrl(payload.url);
      setActivity(payload.activity);
      setProgress(100);
      return data as AuditResult;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Audit impossible.');
      throw cause;
    } finally {
      window.clearInterval(timer);
      window.setTimeout(() => setRunning(false), 500);
    }
  }

  useEffect(() => {
    const context = document.modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    Promise.resolve(
      context.registerTool(
        {
          name: 'run_visibility_audit',
          title: 'Exécuter un audit Povira',
          description:
            'Analyse réellement un site public, met à jour le tableau de bord et renvoie son score mesuré.',
          inputSchema: {
            type: 'object',
            properties: {
              business: { type: 'string', minLength: 1 },
              url: { type: 'string', format: 'uri' },
              activity: { type: 'string', minLength: 2 },
            },
            required: ['business', 'url', 'activity'],
            additionalProperties: false,
          },
          annotations: { readOnlyHint: false, untrustedContentHint: true },
          async execute(input: unknown) {
            const data = input as {
              business: string;
              url: string;
              activity: string;
            };
            const completed = await audit({
              name: data.business,
              url: data.url,
              activity: data.activity,
            });
            return {
              status: 'completed',
              auditId: completed.id,
              poviraScore: completed.poviraScore,
              pages: completed.pages.length,
              findings: completed.findings.length,
            };
          },
        },
        { signal: lifecycle.signal },
      ),
    ).catch(() => undefined);
    return () => lifecycle.abort();
  }, []);

  const displayScores = useMemo(
    () =>
      result
        ? result.scores
            .slice(0, 4)
            .map((item, index) => ({
              ...item,
              score: item.value,
              icon: scoreIcons[item.key],
              color: scoreColors[index],
            }))
        : demoScores.map((item) => ({ ...item, score: item.value })),
    [result],
  );
  const displayPriorities = useMemo(
    () =>
      result
        ? result.findings
            .sort((a, b) => severityRank(b.severity) - severityRank(a.severity))
            .slice(0, 5)
        : demoPriorities,
    [result],
  );
  const mainScore = result?.poviraScore ?? 72;
  const pages = result?.pages.length ?? 18;

  return (
    <div className={dark ? 'dark' : ''}>
      <div className="min-h-screen bg-background text-foreground">
        <aside
          className={`fixed inset-y-0 left-0 z-40 w-[248px] border-r border-border bg-sidebar transition-transform lg:translate-x-0 ${mobile ? 'translate-x-0' : '-translate-x-full'}`}
        >
          <div className="flex h-20 items-center justify-between px-6">
            <Logo />
            <button
              className="lg:hidden"
              onClick={() => setMobile(false)}
              aria-label="Fermer le menu"
            >
              <X />
            </button>
          </div>
          <nav className="space-y-1 px-3" aria-label="Navigation principale">
            {nav.map(({ label, icon: Icon }) => (
              <button
                key={label}
                onClick={() => {
                  setActive(label);
                  setMobile(false);
                }}
                className={`nav-item ${active === label ? 'nav-active' : ''}`}
              >
                <Icon className="size-[18px]" />
                <span>{label}</span>
              </button>
            ))}
          </nav>
          <div className="absolute bottom-0 w-full p-3">
            <a href="/settings" className="nav-item">
              <Settings className="size-[18px]" />
              Paramètres
            </a>
            <div className="mt-3 flex items-center gap-3 rounded-xl border border-border bg-card p-3">
              <div className="grid size-9 place-items-center rounded-lg bg-violet-500/15 text-sm font-bold text-violet-400">
                PS
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">Povik Studio</p>
                <p className="text-xs text-muted-foreground">Workspace privé</p>
              </div>
            </div>
          </div>
        </aside>
        <main className="lg:pl-[248px]">
          <header className="sticky top-0 z-30 flex h-20 items-center justify-between border-b border-border bg-background/80 px-5 backdrop-blur-xl md:px-8">
            <div className="flex items-center gap-3">
              <button
                className="lg:hidden"
                onClick={() => setMobile(true)}
                aria-label="Ouvrir le menu"
              >
                <Menu />
              </button>
              <div>
                <p className="text-sm text-muted-foreground">
                  Intelligence de présence numérique
                </p>
                <h1 className="text-lg font-semibold">{brand.name}</h1>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setDark(!dark)}
                className="icon-button"
                aria-label="Changer de thème"
              >
                {dark ? <Sun /> : <Moon />}
              </button>
              <NewAuditDialog
                business={business}
                setBusiness={setBusiness}
                url={url}
                setUrl={setUrl}
                activity={activity}
                setActivity={setActivity}
                runAudit={audit}
              />
            </div>
          </header>
          <div className="mx-auto max-w-[1500px] p-5 md:p-8">
            <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
              <div>
                <div className="eyebrow">
                  <span
                    className={`pulse-dot ${result ? '!bg-emerald-400' : ''}`}
                  />{' '}
                  {result
                    ? 'Audit réel mesuré'
                    : 'Données de démonstration — Povira'}
                </div>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight md:text-3xl">
                  La visibilité de {business}, en un coup d’œil.
                </h2>
                <p className="mt-1 text-muted-foreground">
                  {result
                    ? `Collecté ${new Date(result.collectedAt).toLocaleString('fr-FR')} · ${pages} pages analysées · ${(result.durationMs / 1000).toFixed(1)} s`
                    : `Exemple interactif · ${pages} pages simulées`}
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-end gap-2">
                {result && (
                  <Button size="lg" onClick={analyzeWithChatGPT}>
                    {chatGptCopied ? <Check /> : <MessageCircle />}
                    {chatGptCopied
                      ? 'Copié — collez dans ChatGPT'
                      : 'Analyser avec ChatGPT'}
                  </Button>
                )}
                <a
                  href={result ? `/report/${result.id}` : '/report/demo'}
                  className={buttonVariants({ variant: 'outline', size: 'lg' })}
                >
                  <FileText /> Générer le rapport
                </a>
              </div>
            </div>
            {running && (
              <section
                className="mb-6 rounded-2xl border border-violet-500/30 bg-violet-500/[.07] p-5"
                aria-live="polite"
              >
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <p className="font-medium">
                      Audit réel de {business} en cours
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Lecture du robots.txt, exploration interne, mesures et
                      sauvegarde
                    </p>
                  </div>
                  <span className="font-mono text-sm text-violet-400">
                    {progress}%
                  </span>
                </div>
                <Progress value={progress} />
              </section>
            )}
            {error && (
              <div className="mb-6 flex items-start gap-3 rounded-xl border border-red-500/25 bg-red-500/10 p-4 text-sm text-red-400">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                <div>
                  <strong>Audit interrompu.</strong>
                  <p className="mt-1 text-red-300/80">{error}</p>
                </div>
              </div>
            )}
            <section className="grid gap-4 xl:grid-cols-[1.7fr_1fr]">
              <div className="score-hero">
                <div className="score-orbit">
                  <span>{mainScore}</span>
                  <small>/ 100</small>
                </div>
                <div className="relative z-10 flex min-w-0 flex-1 flex-col justify-center">
                  <div className="eyebrow text-violet-300">
                    Povira Score · méthode {result?.scoreVersion ?? 'démo'}
                  </div>
                  <h3 className="mt-2 text-2xl font-semibold">
                    {scoreSummary(mainScore)}
                  </h3>
                  <p className="mt-2 max-w-xl text-sm leading-6 text-slate-300">
                    {result
                      ? 'Score calculé uniquement à partir du HTML réellement collecté. Les dimensions sans fournisseur configuré sont exclues.'
                      : 'Lancez un audit pour remplacer toutes les données simulées par les mesures du site saisi.'}
                  </p>
                  <div className="mt-5 flex flex-wrap gap-3">
                    <span className="result-badge good">
                      <ShieldCheck />{' '}
                      {result ? 'Mesures sauvegardées' : 'Mode démonstration'}
                    </span>
                    <span className="result-badge">
                      <Globe2 /> {result ? result.business.url : 'example.com'}
                    </span>
                  </div>
                </div>
              </div>
              <div className="panel">
                <div className="panel-heading">
                  <div>
                    <p className="panel-title">Éléments découverts</p>
                    <p className="panel-subtitle">Page principale</p>
                  </div>
                  <span className="trend">{result ? 'LIVE' : 'DEMO'}</span>
                </div>
                <div className="mt-6 space-y-4 text-sm">
                  <Fact
                    label="Titre"
                    value={
                      result?.pages[0]?.title ??
                      'Nova Mapping — Univers FiveM sur mesure'
                    }
                  />
                  <Fact
                    label="H1"
                    value={
                      result
                        ? `${result.pages[0].h1Count} détecté(s)`
                        : '1 détecté'
                    }
                  />
                  <Fact
                    label="Schema.org"
                    value={
                      result
                        ? `${result.pages[0].schemaCount} bloc(s)`
                        : '1 bloc'
                    }
                  />
                  <Fact
                    label="Images sans alt"
                    value={
                      result
                        ? `${result.pages[0].imagesWithoutAlt} / ${result.pages[0].imageCount}`
                        : '2 / 14'
                    }
                  />
                  <Fact
                    label="Sitemap"
                    value={
                      result
                        ? result.sitemap.available
                          ? 'Détecté'
                          : 'Non trouvé'
                        : 'Détecté'
                    }
                  />
                </div>
              </div>
            </section>
            <section className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {displayScores.map(({ label, score, icon: Icon, color, key }) => (
                <article className="metric-card" key={key}>
                  <span
                    className="metric-icon"
                    style={{ color, background: `${color}18` }}
                  >
                    <Icon />
                  </span>
                  <div className="mt-5 flex items-end justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">{label}</p>
                      <p className="mt-1 text-3xl font-semibold">
                        {score}
                        <span className="text-base text-muted-foreground">
                          /100
                        </span>
                      </p>
                    </div>
                    <div className="mini-bar">
                      <span
                        style={{ height: `${score}%`, background: color }}
                      />
                    </div>
                  </div>
                </article>
              ))}
            </section>
            <section className="mt-4 grid gap-4 xl:grid-cols-[1.5fr_1fr]">
              <div className="panel">
                <div className="panel-heading">
                  <div>
                    <p className="panel-title">Priorités issues de l’audit</p>
                    <p className="panel-subtitle">
                      Constat, impact et correction
                    </p>
                  </div>
                  <span className="text-sm text-violet-400">
                    {result?.findings.length ?? 17} opportunités
                  </span>
                </div>
                <div className="mt-2 divide-y divide-border">
                  {displayPriorities.map((item, index) => (
                    <div className="priority-row" key={item.title}>
                      <span className="priority-number">0{index + 1}</span>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium">{item.title}</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {item.category}
                          {'observation' in item
                            ? ` · ${String(item.observation)}`
                            : ''}
                        </p>
                      </div>
                      <span
                        className={`data-badge ${item.evidenceType.toLowerCase()}`}
                      >
                        {item.evidenceType}
                      </span>
                      <div className="hidden w-32 sm:block">
                        <p className="text-xs text-muted-foreground">
                          Impact / effort
                        </p>
                        <p className="mt-1 text-sm">
                          {translate(item.impact)} · {translate(item.effort)}
                        </p>
                      </div>
                      <ChevronRight className="size-4 text-muted-foreground" />
                    </div>
                  ))}
                </div>
              </div>
              <div className="panel">
                <div className="panel-heading">
                  <div>
                    <p className="panel-title">Sources et disponibilité</p>
                    <p className="panel-subtitle">Transparence des données</p>
                  </div>
                  <ShieldCheck className="size-5 text-emerald-400" />
                </div>
                <div className="mt-6 space-y-4">
                  <Coverage
                    label="Pages mesurées"
                    value={result ? 100 : 38}
                    color="#2dd4bf"
                  />
                  <Coverage
                    label="Données observées"
                    value={
                      result
                        ? Math.round(
                            (result.findings.filter(
                              (item) => item.evidenceType === 'OBSERVED',
                            ).length /
                              Math.max(1, result.findings.length)) *
                              100,
                          )
                        : 31
                    }
                    color="#60a5fa"
                  />
                </div>
                <div className="mt-7 rounded-xl border border-border bg-muted/30 p-4">
                  <p className="flex items-center gap-2 text-sm font-medium">
                    <Globe2 className="size-4 text-violet-400" /> Fournisseurs
                    externes
                  </p>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {result
                      ? `PageSpeed ${result.providers.performance === 'available' ? 'actif' : 'indisponible'} · IA ${result.providers.ai === 'available' ? 'active' : 'non configurée'} · captures ${result.providers.screenshots === 'available' ? 'actives' : 'non configurées'}`
                      : 'Les connexions sont contrôlables depuis Paramètres.'}
                  </p>
                </div>
                {result?.performance && (
                  <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                    <Fact
                      label="Performance"
                      value={`${result.performance.performance ?? '—'}/100`}
                    />
                    <Fact label="LCP" value={result.performance.metrics.lcp} />
                    <Fact
                      label="SEO Google"
                      value={`${result.performance.seo ?? '—'}/100`}
                    />
                    <Fact label="CLS" value={result.performance.metrics.cls} />
                  </div>
                )}
                {result?.aiInsights && (
                  <div className="mt-4 rounded-xl border border-violet-500/25 bg-violet-500/[.06] p-4">
                    <p className="text-sm font-medium text-violet-300">
                      Synthèse IA
                    </p>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      {result.aiInsights.summary}
                    </p>
                  </div>
                )}
                {result && (
                  <div className="mt-4 max-h-36 space-y-2 overflow-auto">
                    {result.sources.map((source) => (
                      <a
                        key={source.url}
                        href={source.url}
                        target="_blank"
                        rel="noreferrer"
                        className="block truncate text-xs text-violet-400"
                      >
                        {source.url}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            </section>
            {result?.screenshots && (
              <section className="mt-4 grid gap-4 xl:grid-cols-2">
                <div className="panel">
                  <p className="panel-title">Capture ordinateur</p>
              <NextImage
                src={result.screenshots.desktop}
                alt={`Capture ordinateur de ${result.business.name}`}
                width={1440}
                height={900}
                unoptimized
                className="mt-4 w-full rounded-xl border border-border"
              />
                </div>
                <div className="panel">
                  <p className="panel-title">Capture mobile</p>
              <NextImage
                src={result.screenshots.mobile}
                alt={`Capture mobile de ${result.business.name}`}
                width={390}
                height={844}
                unoptimized
                className="mx-auto mt-4 max-h-[520px] rounded-xl border border-border"
                  />
                </div>
              </section>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

function Logo() {
  return (
    <div className="flex items-center gap-2.5">
      <span className="logo-mark">
        <BarChart3 />
      </span>
      <span className="text-xl font-semibold tracking-tight">{brand.name}</span>
    </div>
  );
}
function Fact({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border pb-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="max-w-[65%] truncate text-right font-medium">
        {value || 'Non trouvé'}
      </span>
    </div>
  );
}
function Coverage({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div>
      <div className="mb-2 flex justify-between text-sm">
        <span>{label}</span>
        <span className="font-mono text-muted-foreground">{value}%</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full"
          style={{ width: `${value}%`, background: color }}
        />
      </div>
    </div>
  );
}
function NewAuditDialog({
  business,
  setBusiness,
  url,
  setUrl,
  activity,
  setActivity,
  runAudit,
}: {
  business: string;
  setBusiness: (v: string) => void;
  url: string;
  setUrl: (v: string) => void;
  activity: string;
  setActivity: (v: string) => void;
  runAudit: (payload: {
    name: string;
    url: string;
    activity: string;
  }) => Promise<AuditResult>;
}) {
  const [open, setOpen] = useState(false);
  const submit = async (event: React.SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    setOpen(false);
    try {
      await runAudit({ name: business, url, activity });
    } catch {
      /* displayed on dashboard */
    }
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="lg" />}>
        <Plus /> Nouvel audit
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Lancer un audit réel</DialogTitle>
          <DialogDescription>
            Povira explorera jusqu’à cinq pages publiques, respectera robots.txt
            et enregistrera les mesures.
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={submit}>
          <label htmlFor="business-name" className="grid gap-2 text-sm">
            Nom de l’activité
            <Input
              id="business-name"
              required
              value={business}
              onChange={(e) => setBusiness(e.target.value)}
            />
          </label>
          <label htmlFor="business-url" className="grid gap-2 text-sm">
            URL publique
            <Input
              id="business-url"
              required
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
          </label>
          <label htmlFor="business-activity" className="grid gap-2 text-sm">
            Activité
            <Input
              id="business-activity"
              required
              value={activity}
              onChange={(e) => setActivity(e.target.value)}
            />
          </label>
          <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 p-3 text-xs text-emerald-500">
            <Check className="size-4" /> Les adresses locales, privées et
            metadata cloud sont bloquées.
          </div>
          <Button className="w-full" size="lg" type="submit">
            Analyser maintenant <ArrowRight />
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
function severityRank(value: string) {
  return value === 'high'
    ? 3
    : value === 'medium'
      ? 2
      : value === 'low'
        ? 1
        : 0;
}
function translate(value: string) {
  return value === 'high' ? 'Élevé' : value === 'medium' ? 'Moyen' : 'Faible';
}
function scoreSummary(score: number) {
  return score >= 80
    ? 'Une présence numérique très solide.'
    : score >= 65
      ? 'Une base solide avec des leviers concrets.'
      : score >= 45
        ? 'Une visibilité encore irrégulière.'
        : 'Des fondamentaux importants restent à construire.';
}

function buildChatGptPrompt(result: AuditResult) {
  const performance = result.performance
    ? `PageSpeed mobile : performance ${result.performance.performance ?? 'indisponible'}/100, accessibilité ${result.performance.accessibility ?? 'indisponible'}/100, bonnes pratiques ${result.performance.bestPractices ?? 'indisponible'}/100, SEO ${result.performance.seo ?? 'indisponible'}/100, LCP ${result.performance.metrics.lcp ?? 'indisponible'}, CLS ${result.performance.metrics.cls ?? 'indisponible'}.`
    : 'PageSpeed : mesure indisponible.';
  const scores = result.scores
    .map((item) => `${item.label}: ${item.value}/100 (${item.confidence})`)
    .join('\n');
  const findings = result.findings
    .slice(0, 10)
    .map(
      (item, index) =>
        `${index + 1}. [${item.severity}] ${item.title}\nConstat : ${item.observation}\nCorrection : ${item.fix}`,
    )
    .join('\n\n');

  return `Tu es consultant senior en visibilité numérique, SEO et conversion. Analyse cet audit Povira sans inventer de données. Réponds en français avec : 1) une synthèse exécutive, 2) les trois forces, 3) les cinq priorités classées par impact/effort, 4) un plan d'action sur 30 jours, 5) les limites des données disponibles.

Entreprise : ${result.business.name}
Activité : ${result.business.activity}
Site : ${result.business.url}
Collecte : ${result.collectedAt}
Pages analysées : ${result.pages.length}
Povira Score : ${result.poviraScore}/100

Scores mesurés :
${scores}

${performance}

Constats prioritaires :
${findings}`;
}
