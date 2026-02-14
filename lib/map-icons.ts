import L from "leaflet";

/**
 * Recupere l'icone Leaflet correspondante au statut du projet
 * Centralise les visuels pour garantir la coherence entre toutes les cartes.
 */
export const getIcon = (status: string | null | undefined, customPinUrl?: string) => {
  let iconUrl = customPinUrl;

  if (!iconUrl) {
    // Utiliser les pins du système selon le statut
    iconUrl = "/pins/realise.png";
    if (status === 'CURRENT') {
      iconUrl = "/pins/en_cours.png";
    } else if (status === 'PROSPECT') {
      iconUrl = "/pins/prospection.png";
    }
  }

  // Ensure absolute path logic if needed
  if (iconUrl && !iconUrl.startsWith('/') && !iconUrl.startsWith('http')) {
    iconUrl = `/${iconUrl}`;
  }

  return L.icon({
    iconUrl: iconUrl,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });
};
