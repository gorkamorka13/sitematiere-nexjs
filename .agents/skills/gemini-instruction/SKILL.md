---
name: gemini-instruction
description: Gemini 2.5 flash model directives for payslip analyzer project with Windows-specific protocols
license: MIT
compatibility: opencode
metadata:
  audience: developers
  workflow: payslip-analyzer
  environment: windows
---

# Bridge Management System AI - Directives Modèle (gemini-instruction)

Ce document établit les règles critiques et les protocoles de sécurité pour l'interaction entre l'utilisateur et l'assistant IA au sein de l'environnement Bridge Management System.

## 🤖 Contraintes du Modèle IA

> [!IMPORTANT]
> **Le modèle Gemini 2.0+ (Flash/Pro) est le standard opérationnel pour ce projet.**
> - Les versions plus anciennes doivent être évitées pour les tâches complexes.
> - Toute extraction de données ou logique de traitement doit être optimisée pour les modèles multimodaux.

## 💻 Environnement et Commandes Windows

Le système d'exploitation hôte est **Windows**. Par conséquent, les protocoles de ligne de commande doivent s'adapter aux limitations du shell (PowerShell/CMD) :

- **Éviter les opérateurs d'enchaînement** : N'utilisez jamais d'opérateurs tels que `&&` ou `||` pour chaîner des commandes.
- **Commandes Atomiques** : Exécutez chaque commande de manière isolée pour garantir la compatibilité et la capture correcte des retours.

## 🛡️ Sécurité et Confidentialité

La protection des informations sensibles est une priorité absolue.

- **Fichiers `.env`** : Ne jamais afficher, journaliser ou transmettre le contenu intégral des fichiers d'environnement.
- **Clés API et Secrets** : Toute manipulation de clés API (Gemini, Vercel, Cloudflare) ou de secrets d'authentification (`AUTH_SECRET`) doit être traitée avec une discrétion maximale.
- **Données Sensibles dans le Code** : Ne jamais coder en dur des identifiants ou des informations personnelles. Utilisez systématiquement les variables d'environnement.

## 🎨 Design & Expérience Utilisateur (UX)

- **Esthétique "Premium"** : Toute nouvelle interface doit respecter les principes de design moderne : glassmorphisme, ombres subtiles, et micro-animations (transitions de 200-300ms).
- **Feedback Visuel** : Utiliser exclusivement `lucide-react`. Chaque action critique doit être accompagnée d'un feedback visuel (Toast/Sonner) ou d'une micro-animation.

## 🏗️ Standards de Développement

- **Validation Zod** : Aucune donnée provenant de l'utilisateur ou de l'IA ne doit être traitée sans validation par les schémas Zod.
- **Mutations** : Utiliser exclusivement les *Server Actions* pour les mutations de données (organisées dans `app/actions/`).
- **Typage** : Bannir l'utilisation de `any`. Privilégier des interfaces strictes et l'inférence via Drizzle.
- **URLs Relatives** : Interdiction formelle de stocker des domaines absolus en base de données. Utiliser des chemins relatifs.

## 🌍 Langue et Cohérence

- **Interface & Erreurs** : L'UI et les messages d'erreurs destinés à l'utilisateur doivent être en **Français**.
- **Code & Logic** : Les noms de variables, fonctions, commentaires techniques et prompts IA internes doivent être en **Anglais**.

## 🧪 Qualité et Audit

- **Base de Données** : Utiliser `npm run db:push` pour les changements rapides en développement.
- **Build Safety** : Toujours vérifier que le code compile localement avant de proposer un déploiement Cloudflare.

---
*Dernière mise à jour : 2026-02-19*
