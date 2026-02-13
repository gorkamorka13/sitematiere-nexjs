# Toast Notifications - Guide d'utilisation

## Vue d'ensemble

Le système de notifications toast a été ajouté au gestionnaire de diaporama pour fournir un retour visuel élégant lors de la publication des slideshows.

## Fonctionnalités

### Types de notifications

1. **Success (Vert)** ✅
   - Fond vert semi-transparent avec effet glassmorphism
   - Icône de coche (CheckCircle2)
   - Bordure verte
   - Message: "Slideshow publié avec succès !"

2. **Error (Rouge)** ❌
   - Fond rouge semi-transparent avec effet glassmorphism
   - Icône de croix (XCircle)
   - Bordure rouge
   - Message personnalisé selon l'erreur

### Caractéristiques visuelles

- **Position**: Coin supérieur droit de l'écran
- **Animation**: Slide-in depuis le haut avec effet de fondu
- **Auto-dismiss**: Disparaît automatiquement après 5 secondes
- **Progress bar**: Barre de progression en bas du toast montrant le temps restant
- **Bouton de fermeture**: Permet de fermer manuellement la notification
- **Responsive**: S'adapte aux thèmes clair et sombre

## Utilisation

### Dans SlideshowManager

Le toast est automatiquement affiché lors de la publication d'un slideshow:

```typescript
// Succès
setToast({ message: 'Slideshow publié avec succès !', type: 'success' });

// Erreur
setToast({ message: 'Erreur lors de la publication', type: 'error' });
```

### Composant Toast

Le composant `Toast` accepte les props suivantes:

```typescript
interface ToastProps {
  message: string;        // Message à afficher
  type: ToastType;        // 'success' | 'error'
  onClose: () => void;    // Fonction appelée à la fermeture
  duration?: number;      // Durée en ms (défaut: 5000)
}
```

## Intégration future

Pour utiliser le toast dans d'autres composants:

1. Importer le composant:
```typescript
import { Toast, ToastType } from '@/components/ui/toast';
```

2. Ajouter l'état:
```typescript
const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
```

3. Afficher le toast:
```typescript
{toast && (
  <Toast
    message={toast.message}
    type={toast.type}
    onClose={() => setToast(null)}
  />
)}
```

## Améliorations possibles

- [ ] Support pour plusieurs toasts simultanés (queue)
- [ ] Types supplémentaires (warning, info)
- [ ] Positions personnalisables
- [ ] Sons de notification
- [ ] Actions personnalisées (boutons d'action)
