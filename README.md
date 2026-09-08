# Povira

Povira est une plateforme d’analyse de visibilité numérique. La V1 combine une interface d’audit, un scoring reproductible, des recommandations sourcées et un rapport commercial imprimable. Les données fictives sont toujours signalées par **DEMO DATA — POVIRA**.

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
- `lib/url-safety.ts` : validation des URLs et première barrière SSRF.
- `lib/providers.ts` : contrats isolés pour Search, IA, performance et screenshots, plus provider mock.

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

Les services externes sont derrière des interfaces. Un fournisseur doit implémenter `isConfigured()` et sa méthode métier, retourner `unavailable` lorsque sa clé manque et ne jamais créer une valeur de remplacement. Ajouter les variables dans `.env.example`, sans jamais journaliser leur contenu.

Les providers de recherche, réputation, IA, performance et capture sont futurs. Le mode mock est réservé à la démo et marque toutes ses sorties `demo: true`.

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

## Limites actuelles

- Le tableau de bord principal est une démo interactive clairement identifiée.
- L’API crée une enveloppe de job validée mais le worker de crawl distribué et la persistance des mutations restent à brancher.
- Le PDF repose sur l’impression navigateur ; un renderer serveur et le stockage R2 restent à intégrer.
- Screenshots, PageSpeed, recherche, avis, réseaux et moteurs IA nécessitent des providers autorisés.
- Authentification, white-label complet, propositions et monitoring automatique sont préparés au niveau du modèle mais pas encore exposés dans l’interface.
