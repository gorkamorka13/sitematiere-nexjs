import L from "leaflet";

/**
 * Recupere l'icone Leaflet correspondante au statut du projet
 * Centralise les visuels pour garantir la coherence entre toutes les cartes.
 */
export const getIcon = (status: string | null | undefined, customPinUrl?: string | null) => {
  let iconUrl = customPinUrl;
  const r2PublicUrl = process.env.NEXT_PUBLIC_R2_PUBLIC_URL || "https://pub-78c42489fd854dc3a6975810aa00edf2.r2.dev";

  if (!iconUrl) {
    // Utiliser les pins du système selon le statut
    iconUrl = "/pins/prospection.png";
    if (status === 'DONE') {
      iconUrl = "/pins/realise.png";
    } else if (status === 'CURRENT') {
      iconUrl = "/pins/en_cours.png";
    }
  }

  // Si c'est un chemin relatif commençant par /pins/, on préfixe avec R2
  if (iconUrl && iconUrl.startsWith('/pins/')) {
    iconUrl = `${r2PublicUrl}${iconUrl}`;
  } else if (iconUrl && !iconUrl.startsWith('/') && !iconUrl.startsWith('http')) {
    // Cas de secours pour les chemins relatifs sans slash
    iconUrl = `${r2PublicUrl}/pins/${iconUrl}`;
  }

  return L.icon({
    iconUrl: iconUrl,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });
};
