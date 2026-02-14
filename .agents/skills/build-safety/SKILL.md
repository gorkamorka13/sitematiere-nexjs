# Build Safety & Type Integrity Skill

## Objectif
Prévenir les échecs de build sur Vercel/Cloudflare en imposant une rigueur stricte sur le typage et le nettoyage du code.

## Règles d'Or
1. **Zéro usage de `any`** : Ne jamais utiliser `any`. Définir systématiquement des interfaces ou utiliser `unknown` avec des gardes de type.
2. **Zéro code mort** : Supprimer systématiquement les variables, imports et paramètres inutilisés. Si un paramètre est obligatoire mais inutilisé, le préfixer par un underscore (ex: `_index`).
3. **Synchronisation des Interfaces** : Si tu modifies les props d'un composant, tu DOIS vérifier et mettre à jour tous ses appels dans le projet.
4. **Vérification du Type** : Avant de valider une tâche, utilise les outils de recherche pour vérifier que les types correspondent dans tout le flux de données.

## API Robustness
1. **Try/Catch Systématique** : Toutes les routes API et les appels côté client doivent être enveloppés dans des blocs `try/catch`.
2. **Réponses Structurées** : Toujours retourner un objet JSON avec une clé `error` ou `message` en cas d'échec, et des codes HTTP appropriés (400, 401, 403, 404, 500).
3. **Validation Zod** : Utiliser `zod` pour valider les données entrantes (`req.json()`) afin de garantir l'intégrité avant d'interagir avec la base de données.

## Excellence UI & CSS
1. **Design System & Tokens** : Utiliser les classes d'utilité (Tailwind) ou des variables CSS. Éviter les valeurs "magiques" (ex: `px-17`) non alignées sur la grille de design.
2. **Accessibilité** : Garantir que tous les éléments interactifs ont des IDs uniques et des labels appropriés pour les lecteurs d'écran.
3. **Responsivité Mobile First** : Toujours vérifier le comportement sur mobile (petits écrans) avant de valider un composant. Les tableaux doivent être défilables ou adaptés.
4. **Micro-interactions** : Favoriser les transitions fluides (`transition-all`, `duration-300`) pour les états de survol (hover) et de chargement.

## Compatibilité Cloudflare (Edge Runtime)
1. **Runtime Edge Obligatoire** : Pour tout déploiement sur Cloudflare Pages, toutes les routes API et pages dynamiques (utilisant `headers()`, `cookies()`, etc.) DOIVENT exporter explicitement `export const runtime = 'edge';`.
2. **Script de Bascule** : Toujours vérifier que les nouvelles routes sont ajoutées au script `scripts/toggle-runtime.js` pour gérer automatiquement la bascule entre le développement local (Node.js) et la production (Edge).
