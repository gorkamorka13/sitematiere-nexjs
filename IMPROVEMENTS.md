# Plan d'améliorations (Mis à jour) — Site Matière

Après un audit de l'avancement, j'ai constaté que de nombreuses améliorations de sécurité (#1-#5) et d'interface utilisateur (#14-#18) ont **déjà été implémentées** avec succès ! 🎉

Voici la liste actualisée des améliorations techniques et fonctionnalités restantes, classées par ordre de priorité pour la suite du développement.

---

## 🟠 Performance & Optimisation

### 1. `getSyntheseStats` charge tout en mémoire
Dans `app/actions/synthese-actions.ts`, les agrégations sont faites en Javascript après avoir récupéré toutes les lignes de la table `projects`.
**Fix :** Utiliser des requêtes agrégées Drizzle SQL (`COUNT`, `AVG`, `GROUP BY`) pour améliorer la performance sur de gros volumes de données.

### 2. Pas de cache côté client pour les médias
`fetchMedia` est appelé à chaque changement de projet sélectionné dans le Dashboard, et ce sans cache.
**Fix :** Mémoriser les résultats dans une `Map<projectId, media>` (ex: via un store Zustand ou un objet `useRef`) afin d'éviter les appels réseau multiples au même bucket.

### 3. Deux `useMemo` pour le filtrage
`dashboard-client.tsx` utilise deux `useMemo` quasi identiques pour `mapProjects` et `filteredProjects`.
**Fix :** Calculer `mapProjects` comme dérivé temporel ou combiner la logique.

### 4. [NEW] Loading States & Suspense
Actuellement la requête dans `page.tsx` bloque le rendu initial jusqu'à ce que tous les projets et statuts soient parsés.
**Fix :** Wrap the dashboard client behind a Next.js `<Suspense fallback={<DashboardSkeleton />}>` border to show the UI immediately.

---

## 🟡 Refactorisation & Code Quality

### 5. `dashboard-client.tsx` trop volumineux (~600 lignes)
Le composant a été un peu factorisé (ex: `DashboardFilters`) mais toute la logique d'état (filtres, debounce, maps, selection) est toujours définie nativement dans le composant principal.
**Fix :** Extraire la logique d'état dans des hooks customs tels que `useMapState` et `useDashboardState`.

### 6. Types métiers dans les composants UI
Les types comme `ProjectWithRelations` et `ProjectWithOwner` sont définis en haut de `dashboard-client.tsx`.
**Fix :** Déplacer ces définitions dans `lib/types.ts` pour qu'elles soient réutilisables n'importe où.

### 7. Duplication de la définition des statuts/pins
La logique d'affectation automatique de l'url du pin (`/pins/en_cours.png`, `/pins/realise.png`) est dupliquée manuellement entre `createProject` et `updateProject` dans `project-actions.ts`.
**Fix :** Extraire une fonction utilitaire métier `getDefaultPinUrl(status: ProjectStatus)`.

### 8. [NEW] State Management URL
Actuellement, les filtres du Dashboard empêchent le partage via un lien (par exemple pour partager la vue de tous les projets "PEB" en "Serra-Léone").
**Fix :** Migrer les états de filtres (`useState`) vers des Search Parameters d'URL (`nuqs` ou composant interne Next.js).

---

## 🟢 Nouvelles Fonctionnalités (Roadmap)

### 9. Audit Log
Table `project_history` — enregistrer qui a modifié quoi et quand. Affichable sous la vue projet ou en tooltip.

### 10. Notifications in-app
Informer les utilisateurs lorsqu'un projet qui leur est assigné change de statut ou de phase.

### 11. Export Global vers Excel / CSV
Exporter tout le tableau filtré directement en format tableur (`.xlsx`).

### 12. Clustering sur la carte globale
Sur de faibles niveaux de zoom (vue monde complète), les pins de projet surchargent la carte.
**Fix :** Implémenter le regroupement de clusters Leaflet via `react-leaflet-cluster`.

### 13. Onglet Timeline / Gantt simplifié
Pour la gestion macro, créer un "Vue Calendrier" pour tous les projets selon leurs phases temporelles.

---

## Priorisation suggérée pour la session de travail :

| Priorité | Actions |
|----------|---------|
| ⭐ Recommandé | Extraire les _Hooks_ et types de `dashboard-client.tsx` pour cleaner la base (#5, #6). |
| 🚀 UX Avancée | Implémenter le partage d'URL de filtre au lieu de simple _states_ React (#8). |
| ⚡ Performance | Optimiser l'agrégation de `getSyntheseStats` côté BD pour être paré pour la prod (#1). |
| 🗺️ Nouvelle Feature | Ajouter le Clustering visuel sur la carte monde côté Client (#12). |
