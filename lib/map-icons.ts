import L from "leaflet";

/**
 * Recupere l'icone Leaflet correspondante au statut du projet
 * Centralise les visuels pour garantir la coherence entre toutes les cartes.
 */
export const getIcon = (status: string | null | undefined) => {
  let iconUrl = "/images/pin/pin_done.png";

  if (status === 'CURRENT') {
    iconUrl = "/images/pin/pin_underconstruction.png";
  } else if (status === 'PROSPECT') {
    iconUrl = "/images/pin/pin_prospection.png";
  }

  return L.icon({
    iconUrl: iconUrl,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });
};
