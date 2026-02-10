"use client";

import dynamic from "next/dynamic";

const EditableMap = dynamic(() => import("./editable-map"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-[300px] bg-gray-100 dark:bg-gray-900 rounded-lg">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500 mx-auto mb-2"></div>
        <p className="text-sm text-gray-500 dark:text-gray-400">Chargement de la carte...</p>
      </div>
    </div>
  ),
});

type Props = {
  latitude: number;
  longitude: number;
  onPositionChange: (lat: number, lng: number) => void;
};

export default function EditableMapWrapper({ latitude, longitude, onPositionChange }: Props) {
  // Ne pas utiliser de key basée sur les coordonnées pour éviter de recréer la carte
  // et ainsi préserver le niveau de zoom choisi par l'utilisateur
  return <EditableMap latitude={latitude} longitude={longitude} onPositionChange={onPositionChange} />;
}
