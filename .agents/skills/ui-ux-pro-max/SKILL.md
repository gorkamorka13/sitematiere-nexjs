---
name: ui-ux-pro-max
description: Intelligence de conception pour créer des UI/UX professionnelles. Inclut un moteur de raisonnement pour générer des systèmes de design complets.
---

# UI UX Pro Max 🎨

Cette compétence apporte une intelligence de conception avancée pour construire des interfaces utilisateur (UI) et des expériences utilisateur (UX) professionnelles sur n'importe quel framework (React, Next.js, Vue, etc.).

## 🚀 Fonctionnalités Clés

- **Générateur de Système de Design** : Analyse vos besoins pour recommander des palettes, typographies et composants cohérents.
- **67 Styles UI** : Glassmorphism, Minimalisme, Bento Grid, Neumorphisme, etc.
- **96 Palettes de Couleurs** : Adaptées par secteur (SaaS, Fintech, Santé, Luxe).
- **100 Règles de Raisonnement** : Directives spécifiques par industrie pour éviter les anti-patterns.

## 🛠️ Utilisation des Outils Locaux

Pour obtenir des recommandations précises, utilisez les scripts Python fournis dans le dossier `scripts/`.

### Générer un Système de Design (Exemple)
```bash
python .agents/skills/ui-ux-pro-max/scripts/search.py "application de santé premium" --design-system -p "MaSanteApp"
```

### Rechercher par Style ou Typographie
```bash
python .agents/skills/ui-ux-pro-max/scripts/search.py "glassmorphism" --domain style
python .agents/skills/ui-ux-pro-max/scripts/search.py "serif élégant" --domain typography
```

## 📋 Directives de Conception (UX)

- **Priorité à l'Accessibilité** : Respectez les standards WCAG AA minimum.
- **Animations Subtiles** : Utilisez des transitions fluides (150-300ms). Évitez les animations agressives.
- **Cohérence Visuelle** : Utilisez les variables du système de design généré pour toutes les couleurs et espacements.
- **Anti-patterns à éviter** :
    - Ne pas utiliser d'emojis comme icônes (privilégiez Lucide ou Heroicons).
    - Éviter les dégradés "AI" (violet/rose) pour les secteurs sérieux comme la finance.

## 🇫🇷 Règle d'Or (Antigravity)

Toute interaction liée à cette compétence et toute documentation générée pour l'utilisateur doivent être en **français**, tout en conservant la précision technique des outils sous-jacents.

---
*Compétence locale installée et optimisée pour ce projet.*
