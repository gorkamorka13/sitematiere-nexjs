# Plan d'améliorations — Site Matière

Audit complet du code source. Propositions classées par catégorie.

---

## 🔴 Sécurité

### 1. `checkPermission` ne passe pas le `projectOwnerId`
`lib/permissions.ts` — `checkPermission()` appelle `getProjectAccess` avec `''` comme `projectOwnerId`, court-circuitant la vérification du propriétaire.
**Fix :** Récupérer le projet en base avant d'appeler `getProjectAccess`.

### 2. Duplication de la logique de permission
`app/actions/project-actions.ts` — `checkProjectWritePermission` / `checkProjectDeletePermission` recréent la logique déjà centralisée dans `lib/permissions.ts`.
**Fix :** Remplacer par des appels à `getProjectAccess()`.

### 3. Pas de rate-limiting sur les Server Actions sensibles
Aucun mécanisme de rate-limiting sur `createProject`, `deleteProject`, `updateProject`.
**Fix :** Implémenter via Cloudflare Rate Limiting ou `@upstash/ratelimit`.

### 4. Messages d'erreur trop verbeux
Certains `throw new Error(...)` renvoient des détails métier au client.
**Fix :** Logger côté serveur, retourner un message générique au client.

### 5. `getSyntheseStats()` sans vérification d'authentification
`app/actions/synthese-actions.ts` — la server action ne vérifie pas la session.
**Fix :** Ajouter `const session = await auth(); if (!session) throw new Error("Non autorisé");`.

---

## 🟠 Performance

### 6. `getSyntheseStats` charge tout en mémoire
Agrégations faites en JS au lieu de requêtes SQL (`COUNT`, `AVG`, `GROUP BY`).
**Fix :** Utiliser des requêtes agrégées Drizzle.

### 7. Pas de cache côté client pour les médias
`fetchMedia` est appelé à chaque changement de projet sélectionné, sans cache.
**Fix :** Mémoriser les résultats dans un `Map<projectId, media>` via `useRef`.

### 8. Deux `useMemo` quasi-identiques (`mapProjects` / `filteredProjects`)
**Fix :** Calculer `mapProjects` comme dérivé de `filteredProjects` (sans le filtre `searchQuery`).

### 9. Images non optimisées
Photos de projets servies depuis R2 sans conversion WebP ni redimensionnement.
**Fix :** Utiliser `<Image>` Next.js avec `remotePatterns` configurés.

---

## 🟡 Refactorisation

### 10. `dashboard-client.tsx` trop volumineux (550+ lignes)
**Fix :** Extraire :
- `useDashboardFilters` → hook custom
- `useDashboardMedia` → hook custom
- `<DashboardTabBar>` → composant onglets
- `<DashboardDialogs>` → tous les dialogs regroupés

### 11. Logique de pin par statut dupliquée
Le switch `status → pinUrl` apparaît deux fois dans `project-actions.ts`.
**Fix :** Extraire `getDefaultPinUrl(status: string): string`.

### 12. Types `ProjectWithOwner` / `ProjectWithRelations` dans un fichier client
**Fix :** Déplacer dans `lib/types.ts`.

### 13. Enums dupliqués
`lib/enums.ts` et `lib/db/schema/enums.ts` — deux sources de vérité.
**Fix :** Unifier dans un seul fichier.

---

## 🔵 UI/UX

### 14. Popup projet : pas de titre
La popup Leaflet affiche la description sans en-tête.
**Fix :** Ajouter le nom du projet en bold en haut du popup.

### 15. Carte globale : pas de mise en évidence du projet sélectionné
**Fix :** Utiliser un `DivIcon` custom (pin plus grand ou avec anneau coloré) pour le projet sélectionné.

### 16. Tableau de projets : pas de tri par colonne
**Fix :** Ajouter un tri côté client avec icônes `ChevronUp/Down` sur chaque en-tête.

### 17. Synthèse : légende manquante pour les couleurs de progression
**Fix :** Ajouter une légende compacte (vert ≥75%, jaune ≥50%, orange ≥25%, rouge <25%).

### 18. Pas de page 404 personnalisée
**Fix :** Créer `app/not-found.tsx` avec un design cohérent.

---

## 🟢 Nouvelles fonctionnalités

### 19. Audit Log
Table `project_history` — qui a modifié quoi et quand. Affichable dans le dialog de modification.

### 20. Notifications in-app
Alerter les utilisateurs quand un projet assigné change de statut ou de phase.

### 21. Export Excel / CSV
Exporter le tableau filtré en `.xlsx` (via `exceljs`).

### 22. Mode comparaison de projets
Sélectionner 2–3 projets et comparer côte-à-côte (phases, statut, localisation).

### 23. Clustering sur la carte globale
Regrouper les pins proches via `react-leaflet-cluster`.

### 24. Palette de commandes (`Ctrl+K`)
Recherche rapide projets + navigation + actions admin via _cmdk_.

### 25. Onglet Timeline / Gantt simplifié
Visualiser les projets sur une timeline selon leurs phases actives.

---

## Priorisation suggérée

| Priorité | Items |
|----------|-------|
| 🔴 Critique (sécurité) | #1, #2, #5 |
| 🟠 Important (perf) | #6, #7, #8 |
| 🟡 Moyen terme (refacto) | #10, #11, #12 |
| 🔵 UX rapide | #14, #15, #16, #17 |
| 🟢 Roadmap | #19, #21, #23, #24 |
