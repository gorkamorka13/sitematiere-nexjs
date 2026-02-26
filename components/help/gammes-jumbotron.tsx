import React from 'react';
import NextImage from "next/image";
import { LayoutDashboard, Zap, Check, ImageIcon, Pencil, Loader2 } from "lucide-react";

interface ProjectRange {
  name: string;
  subtitle: string;
  usage: string;
  technique: string;
  advantages: string;
}

export const PROJECT_RANGES: Record<string, ProjectRange> = {
  PRS: {
    name: "PRS",
    subtitle: "Pont à Poutres Reconstituées Soudées",
    usage: "Ouvrages reliant deux points en zones rurales ou urbaines. Fréquent pour les ponts routiers, passerelles piétonnes ou ferroviaires.",
    technique: "Poutres reconstituées soudées rectilignes ou curvilignes. Hauteurs constantes ou variables, continues ou isostatiques.",
    advantages: "Réalisation des fondations simple, matériaux durables, entretien réduit. Propriétés isostatiques insensibles aux affaissements."
  },
  UNIBRIDGE: {
    name: "UNIBRIDGE®",
    subtitle: "Pont modulaire de référence",
    usage: "Seul pont modulaire mixte du marché. Utilisé comme pont provisoire ou définitif. Fourni avec tablier métallique ou coffrage béton.",
    technique: "Éléments caissons de 11.40m ou 6.10m. Assemblage par axes de connexion. Travées multiples jusqu'à 57m de portée.",
    advantages: "Installation ultra-rapide sans soudure ni boulonnage sur chantier. Transport optimisé par conteneur standard de 40 pieds."
  },
  MPB: {
    name: "MPB®",
    subtitle: "MATIERE Panel Bridge",
    usage: "Pont modulaire à panneaux treillis. Idéal pour des solutions provisoires ou définitives. Peut être équipé de trottoirs latéraux.",
    technique: "Composé de panneaux treillis assemblés par axes. Entretoises transversales. Longueurs de travées maximales de 58m.",
    advantages: "Montage rapide par grutage ou lançage. Ne nécessite que peu de main d'œuvre spécialisée sur le site de construction."
  },
  MXB: {
    name: "MXB®",
    subtitle: "MATIERE X-Bridge",
    usage: "Dernière innovation des ponts métalliques modulaires MATIERE, s'appuyant sur l'expertise des ponts à panneaux.",
    technique: "Conception optimisée permettant de réaliser des ouvrages à travées simples atteignant une longueur record de 91m.",
    advantages: "Transportable en conteneur 40'. Installation très rapide avec une mobilisation minimale d'engins de chantier."
  },
  MFB: {
    name: "MFB®",
    subtitle: "MATIERE Foot Bridge",
    usage: "Gamme de passerelles modulaires architecturales. Destinée principalement aux projets à l'échelle internationale.",
    technique: "Conçue pour franchir 30m à 50m. Entièrement modulaire, supportée par appuis métalliques avec accès escaliers ou rampes.",
    advantages: "Livraison rapide. Conception originale permettant un assemblage et une pose avec peu de moyens de manutention."
  }
};

interface GammesJumbotronProps {
  rangeImages: Record<string, string>;
  loadingSettings: boolean;
  userRole?: string;
  onImagePickerOpen: (rangeKey: string) => void;
}

export function GammesJumbotron({ rangeImages, loadingSettings, userRole, onImagePickerOpen }: GammesJumbotronProps) {
  return (
    <div className="flex flex-col gap-12 sm:gap-16 pb-12 animate-in fade-in duration-500">
      <div className="text-center max-w-3xl mx-auto space-y-4 mb-4">
          <h2 className="text-2xl md:text-4xl font-black text-gray-900 dark:text-white uppercase tracking-tight">
            Nos Gammes de Produits
          </h2>
          <div className="h-1 w-16 bg-indigo-600 mx-auto rounded-full"></div>
          <p className="text-gray-500 dark:text-gray-400 leading-relaxed font-medium">
            Découvrez nos solutions de franchissements modulaires et durables adaptées à toutes les topologies de terrains.
          </p>
      </div>

      {Object.entries(PROJECT_RANGES).map(([rangeKey, rangeData], index) => {
        // Alternating layout: even indexes have text on left, odd have text on right
        const isReversed = index % 2 !== 0;

        return (
          <div 
            key={rangeKey} 
            className={`flex flex-col-reverse lg:flex-row gap-8 lg:gap-12 items-center ${isReversed ? 'lg:flex-row-reverse' : ''}`}
          >
            {/* Text Content */}
            <div className="flex-1 space-y-6 md:space-y-8 w-full">
              <div className="text-center lg:text-left">
                <h3 className="text-3xl md:text-4xl font-black text-gray-900 dark:text-white uppercase tracking-tight mb-2">
                  {rangeData.name}
                </h3>
                <p className="text-sm md:text-base font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">
                  {rangeData.subtitle}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-4">
                <FeatureBlock 
                  icon={<LayoutDashboard className="w-5 h-5 text-indigo-500" />} 
                  title="Utilisation" 
                  description={rangeData.usage} 
                />
                <FeatureBlock 
                  icon={<Zap className="w-5 h-5 text-indigo-500" />} 
                  title="Technique" 
                  description={rangeData.technique} 
                />
                <FeatureBlock 
                  icon={<Check className="w-5 h-5 text-indigo-500" />} 
                  title="Avantages" 
                  description={rangeData.advantages} 
                  className="sm:col-span-2 lg:col-span-1 xl:col-span-2"
                />
              </div>
            </div>

            {/* Image Content (Cloudflare R2) */}
            <div className="flex-1 w-full max-w-2xl lg:max-w-none">
              <div className="relative bg-gray-50 dark:bg-gray-900/50 rounded-[2rem] p-2 border-4 border-white dark:border-gray-800 shadow-2xl flex items-center justify-center min-h-[300px] md:min-h-[400px] lg:h-[450px] overflow-hidden group/image transition-all hover:shadow-indigo-500/20">
                {loadingSettings ? (
                  <Loader2 className="w-10 h-10 animate-spin text-gray-200" />
                ) : rangeImages[`range_image_${rangeKey}`] ? (
                  <div className="absolute inset-0 m-2 rounded-[1.5rem] overflow-hidden">
                    <NextImage
                      src={rangeImages[`range_image_${rangeKey}`]}
                      alt={rangeKey}
                      fill
                      className="object-cover transition-transform duration-700 group-hover/image:scale-105"
                      unoptimized // R2 URLs are external and dynamic
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-black/0 to-transparent opacity-0 group-hover/image:opacity-100 transition-opacity duration-300" />
                  </div>
                ) : (
                  <div className="text-center space-y-4">
                    <div className="w-20 h-20 bg-white dark:bg-gray-800 rounded-2xl flex items-center justify-center mx-auto shadow-sm ring-1 ring-gray-100 dark:ring-gray-700">
                      <ImageIcon className="w-10 h-10 text-gray-300 dark:text-gray-600" />
                    </div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest bg-white/50 dark:bg-gray-800/50 px-3 py-1.5 rounded-full inline-block">
                      Visuel {rangeKey} en attente
                    </p>
                  </div>
                )}

                {/* Admin Pencil Trigger */}
                {userRole === 'ADMIN' && (
                  <button
                    onClick={() => onImagePickerOpen(rangeKey)}
                    className="absolute bottom-6 right-6 p-4 bg-white/90 backdrop-blur-sm dark:bg-gray-800/90 text-indigo-600 dark:text-indigo-400 rounded-2xl shadow-xl border border-white/20 dark:border-gray-700/50 opacity-0 group-hover/image:opacity-100 hover:scale-110 active:scale-95 transition-all z-20 hover:bg-white dark:hover:bg-gray-800"
                    title={`Changer l'image pour ${rangeKey}`}
                  >
                    <Pencil className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function FeatureBlock({ icon, title, description, className = "" }: { icon: React.ReactNode, title: string, description: string, className?: string }) {
  return (
    <div className={`p-5 rounded-2xl bg-white dark:bg-gray-800/40 border border-gray-100 dark:border-gray-700/50 shadow-sm hover:shadow-md transition-shadow space-y-3 ${className}`}>
      <div className="flex items-center gap-3 text-gray-900 dark:text-white pb-2 border-b border-gray-50 dark:border-gray-700/30">
        <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg">
          {icon}
        </div>
        <h4 className="text-xs font-black uppercase tracking-widest">{title}</h4>
      </div>
      <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed font-medium">
        {description}
      </p>
    </div>
  );
}
