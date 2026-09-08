# Povira

Povira est une plateforme d’analyse de visibilité numérique. La V1 explore réellement un site public, mesure son HTML, calcule un score reproductible, sauvegarde l’audit dans D1 et génère un rapport commercial imprimable. Les données fictives sont toujours signalées par **DEMO DATA — POVIRA**.

## Démarrage

Prérequis : Node.js 22.13+ et pnpm.

```bash
cp .env.example .env.local
pnpm install
pnpm dev
```

Ouvrir `http://localhost:3000`. Le rapport démo est disponible sur `/report/demo` et son bouton Télécharger utilise la boîte d’impression du navigateur pour produire un PDF A4.

## Architecture

- `app/` : interface Vinext/React, route de rapport et API d’audit.
- `config/brand.ts` : identité centrale (nom, signature, support, URL).
- `db/schema.ts` : modèle D1/SQLite normalisé pour workspaces, entreprises, audits, pages, sources, findings, recommandations, scores, concurrents, rapports, jobs et coûts.
- `lib/scoring.ts` : moteur central de score, versionné et déterministe.
- `lib/analyzer.ts` : crawler respectueux limité, parsing HTML, mesures et constats.
- `lib/url-safety.ts` : validation des URLs et première barrière SSRF.
- `lib/providers.ts` : intégration Google PageSpeed sans clé et état des captures Cloudflare.

Le pipeline cible les étapes `DISCOVERY → CRAWLING → SEO → BRAND → SEARCH → AI → COMPETITORS → ANALYSIS → SCORING → REPORT`. Chaque étape est stockée comme un job indépendant afin qu’une erreur partielle n’annule pas tout l’audit.

## Base de données et migrations

Le schéma est défini avec Drizzle et déployé sur D1. Après modification :

```bash
pnpm db:generate
```

Inspecter le SQL généré avant publication. Les migrations appliquées sont immuables ; une évolution crée toujours une nouvelle migration.

## Povira Score

Toutes les dimensions sont sur 100. Les poids par défaut sont déclarés dans `lib/scoring.ts` : Search 14, AI 10, SEO technique 14, contenu 13, autorité 10, réputation 7, marque 8, entité 7, social 6, conversion 11 et local 10. Pour chaque audit, seules les dimensions applicables sont conservées et leurs poids sont renormalisés à 100 %. Une entreprise exclusivement en ligne n’est donc pas pénalisée par l’absence de visibilité locale. La méthode est versionnée (`1.0.0`) et testée.

Pour ajouter une métrique, ajouter sa mesure déterministe dans l’analyseur concerné, son origine et son niveau de confiance, puis l’agréger dans une dimension existante. Toute nouvelle dimension doit être ajoutée au type `Dimension`, à la table des poids et aux tests.

## Providers

Google PageSpeed Insights fonctionne sans clé avec le quota public. Les analyses approfondies sont transférées manuellement vers ChatGPT grâce au bouton dédié, sans appel à l’API OpenAI. Les captures ordinateur/mobile passent par Cloudflare Browser Run avec `CLOUDFLARE_ACCOUNT_ID` et `CLOUDFLARE_BROWSER_RUN_TOKEN`, compatibles avec son quota gratuit.

La page `/settings` affiche l’état de chaque connexion sans jamais révéler les secrets. Une intégration absente retourne `unavailable` et aucune valeur de remplacement n’est inventée.

## Rapports et Prospect

`/report/demo` présente le récit commercial, les scores applicables, les limites et le plan d’action. L’impression génère actuellement le PDF A4. Les futurs liens Prospect utiliseront `NEXT_PUBLIC_APP_URL`, une visibilité public/privé, une expiration, un mot de passe haché et un compteur de vues non invasif stockés dans `reports`.

## Qualité et sécurité

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

La validation Zod limite la taille des champs et bloque les protocoles non HTTP(S), identifiants dans l’URL, localhost, réseaux IPv4 privés, IPv6 locales et endpoints metadata connus. Avant un crawler de production, compléter cette barrière par une résolution DNS contrôlée à chaque redirection et une nouvelle vérification de toutes les IP résolues afin de résister au DNS rebinding.

## Fonctionnement actuel et limites

- Le tableau de bord démarre en démo, puis remplace toutes les valeurs par le résultat réel après un audit.
- L’audit rapide explore jusqu’à 5 pages (10 en mode complet côté API), respecte l’interdiction globale de robots.txt, limite les redirections, la taille des réponses et les URLs au même domaine.
- Les audits, pages, sources, findings, recommandations et scores sont persistés dans D1 ; un rapport dynamique est accessible par identifiant.
- L’analyse reste exécutée dans une requête courte. Une file de jobs distribuée avec reprise étape par étape reste la prochaine évolution pour les grands sites.
- Le PDF repose sur l’impression navigateur ; un renderer serveur et le stockage R2 restent à intégrer.
- PageSpeed est branché sans clé et ChatGPT fonctionne par transfert manuel. Les captures Cloudflare s’activent automatiquement dès que les deux identifiants serveur sont configurés. Recherche, avis et réseaux restent hors périmètre de cette version.
- Authentification, white-label complet, propositions et monitoring automatique sont préparés au niveau du modèle mais pas encore exposés dans l’interface.
