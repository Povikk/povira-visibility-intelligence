# Povira — Visibility Intelligence

Povira est un tableau de bord d’audit de visibilité numérique conçu pour transformer les signaux techniques, éditoriaux et commerciaux d’un site en constats compréhensibles et en priorités d’action.

**Démo en ligne :** [povira-visibility-intelligence.povik.chatgpt.site](https://povira-visibility-intelligence.povik.chatgpt.site/)

## Ce que le projet démontre

- Exploration réelle d’un site public, jusqu’à 15 pages pour un audit complet.
- Analyse SEO technique, contenu, marque et conversion à partir de preuves mesurées.
- Score Povira déterministe, pondéré, versionné et testé.
- Progression d’audit diffusée en temps réel dans l’interface.
- Historique des entreprises, audits, constats et recommandations dans Cloudflare D1.
- Rapport complet et rapport Prospect volontairement synthétique pour l’avant-vente.
- Mesures PageSpeed via le quota public gratuit.
- Captures ordinateur et mobile via Cloudflare Browser Run.
- Transfert manuel vers ChatGPT, sans dépendance à l’API OpenAI.
- Validation des URL et protections SSRF de première ligne.

## Stack

- React 19, TypeScript et Vinext
- Tailwind CSS et composants shadcn/Base UI
- Cloudflare Workers, D1 et Browser Run
- Drizzle ORM
- Vitest, TypeScript, Oxlint et Oxfmt

## Architecture

```text
app/              Interface, rapports et routes API
components/       Composants UI réutilisables
config/           Identité et configuration de marque
db/               Schéma D1, migrations et persistance
lib/analyzer.ts   Crawler, mesures HTML et constats
lib/scoring.ts    Moteur de score déterministe
lib/providers.ts  PageSpeed et état des intégrations
lib/url-safety.ts Validation des URL et protection SSRF
```

Le pipeline suit les étapes `DISCOVERY → CRAWLING → SEO → BRAND → SEARCH → AI → ANALYSIS → SCORING → REPORT`. Une indisponibilité externe est signalée comme telle : Povira n’invente pas de donnée pour remplir un tableau de bord.

## Lancer le projet

Prérequis : Node.js 22.13+ et pnpm.

```bash
pnpm install
pnpm dev
```

Puis ouvrir `http://localhost:3000`.

Les captures sont optionnelles. Pour les activer, configurer côté serveur :

```text
CLOUDFLARE_ACCOUNT_ID
CLOUDFLARE_BROWSER_RUN_TOKEN
```

Ces valeurs ne doivent jamais être placées dans le dépôt. La page `/settings` affiche uniquement l’état des connexions.

## Qualité

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Le calcul du score est centralisé et versionné. Les dimensions non applicables sont exclues puis les poids restants sont renormalisés à 100 %, afin de ne pas pénaliser artificiellement une entreprise.

## Limites actuelles

- L’analyse s’exécute encore dans une requête courte ; une file distribuée serait préférable pour les très grands sites.
- Le PDF repose sur l’impression navigateur.
- Recherche, avis et réseaux sociaux restent hors du périmètre gratuit actuel.
- Les protections réseau devront inclure une résolution DNS contrôlée à chaque redirection avant une utilisation multi-tenant à grande échelle.

## Contexte

Povira est un projet portfolio full-stack en évolution. Il met l’accent sur la traçabilité des données, l’expérience d’audit et une architecture compatible avec des services gratuits ou à faible coût.
