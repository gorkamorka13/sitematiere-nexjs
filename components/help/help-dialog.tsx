"use client";

import { useState, useEffect } from "react";
import { X, Shield, HelpCircle, User, Users, Info, FileText, Check, LayoutDashboard, Image as ImageIcon, Globe, Zap, Pencil, Loader2 } from "lucide-react";
import NextImage from "next/image";
import { DatabaseImagePicker } from "@/components/image-processor/DatabaseImagePicker";
import { getAllSystemSettings, updateSystemSetting } from "@/app/actions/settings-actions";

interface HelpDialogProps {
  isOpen: boolean;
  onClose: () => void;
  user: { id: string; role: string; name?: string | null };
}

export default function HelpDialog({ isOpen, onClose, user }: HelpDialogProps) {
  const [activeTab, setActiveTab] = useState<"intro" | "roles" | "gammes">("intro");
  const [activeRange, setActiveRange] = useState<string>("PRS");
  const [rangeImages, setRangeImages] = useState<Record<string, string>>({});
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [loadingSettings, setLoadingSettings] = useState(false);

  useEffect(() => {
    if (isOpen && activeTab === "gammes") {
      const fetchSettings = async () => {
        setLoadingSettings(true);
        const settings = await getAllSystemSettings();
        setRangeImages(settings);
        setLoadingSettings(false);
      };
      fetchSettings();
    }
  }, [isOpen, activeTab]);

  const handleImageSelect = async (url: string) => {
    const key = `range_image_${activeRange}`;
    setRangeImages(prev => ({ ...prev, [key]: url }));
    await updateSystemSetting(key, url);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1050] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"
        onClick={onClose}
      />

      {/* Modal Body */}
      <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] md:max-h-[85vh] flex flex-col border border-gray-100 dark:border-gray-700 overflow-hidden animate-in zoom-in-95 duration-300">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 z-10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-50 dark:bg-indigo-900/40 rounded-xl">
              <HelpCircle className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h2 className="text-xl font-black text-gray-900 dark:text-white leading-tight uppercase tracking-tight">
                Centre d&apos;Aide
              </h2>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">
                Guide et documentation technique
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-all"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Tabs Navigation */}
        <div className="flex border-b border-gray-50 dark:border-gray-700/50 bg-gray-50/50 dark:bg-gray-900/20 px-2 md:px-4 overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveTab("intro")}
            className={`px-3 md:px-4 py-3 text-[10px] md:text-xs font-bold uppercase tracking-widest transition-all border-b-2 whitespace-nowrap ${
              activeTab === "intro"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            }`}
          >
            Introduction
          </button>
          <button
            onClick={() => setActiveTab("roles")}
            className={`px-3 md:px-4 py-3 text-[10px] md:text-xs font-bold uppercase tracking-widest transition-all border-b-2 whitespace-nowrap ${
              activeTab === "roles"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            }`}
          >
            Rôles & Permissions
          </button>
          <button
            onClick={() => setActiveTab("gammes")}
            className={`px-3 md:px-4 py-3 text-[10px] md:text-xs font-bold uppercase tracking-widest transition-all border-b-2 whitespace-nowrap ${
              activeTab === "gammes"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            }`}
          >
            Gammes de Produits
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-10 scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-gray-700">
          {activeTab === "intro" && (
            <div className="max-w-4xl mx-auto space-y-12">
              {/* Hero Section */}
              <div className="text-center space-y-4">
                <h1 className="text-2xl md:text-3xl font-black text-gray-900 dark:text-white uppercase tracking-tight">
                  Bienvenue sur <span className="text-indigo-600">Site Matière</span>
                </h1>
                <p className="text-gray-500 dark:text-gray-400 max-w-2xl mx-auto leading-relaxed font-medium">
                  Une plateforme complète pour la gestion de projets de construction de ponts,
                  allant de la prospection à la mise en service.
                </p>
              </div>

              {/* Grid Features */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FeatureCard
                  icon={<LayoutDashboard className="w-6 h-6" />}
                  title="Tableau de Bord de Pilotage"
                  description="Suivre l'avancement global via des cartes interactives et une synthèse statistique détaillée par pays, type et statut."
                  color="text-blue-500 bg-blue-50 dark:bg-blue-900/20"
                />
                <FeatureCard
                  icon={<Globe className="w-6 h-6" />}
                  title="Cartographie Intégrée"
                  description="Visualiser chaque projet sur une carte mondiale avec des marqueurs personnalisés selon l'état actuel (Prospection, Études, Chantier...)."
                  color="text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20"
                />
                <FeatureCard
                  icon={<ImageIcon className="w-6 h-6" />}
                  title="Gestion de Médias & Fichiers"
                  description="Explorer et gérer les galeries photos, vidéos et documents techniques (PDF, plans) au sein d'un explorateur unifié."
                  color="text-amber-500 bg-amber-50 dark:bg-amber-900/20"
                />
                <FeatureCard
                  icon={<Zap className="w-6 h-6" />}
                  title="Performance & Sécurité"
                  description="Une interface fluide et optimisée, sécurisée par un système de permissions granulaire pour garantir la protection des données."
                  color="text-indigo-500 bg-indigo-50 dark:bg-indigo-900/20"
                />
              </div>

              {/* Steps Section */}
              <section className="bg-gray-50 dark:bg-gray-900/30 rounded-2xl md:rounded-3xl p-6 md:p-8 border border-gray-100 dark:border-gray-700">
                <h3 className="text-sm font-black uppercase tracking-widest text-gray-800 dark:text-white mb-6">Cycle de vie des projets</h3>
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <PhaseBadge label="Prospection" />
                  <span className="hidden sm:inline text-gray-300">→</span>
                  <PhaseBadge label="Études" />
                  <span className="hidden sm:inline text-gray-300">→</span>
                  <PhaseBadge label="Fabrication" />
                  <span className="hidden sm:inline text-gray-300">→</span>
                  <PhaseBadge label="Transport" />
                  <span className="hidden sm:inline text-gray-300">→</span>
                  <PhaseBadge label="Construction" />
                </div>
              </section>

              {/* System Note */}
              <div className="flex items-center gap-2 justify-center text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                <Shield className="w-3 h-3" />
                Système optimisé pour Cloudflare Workers & Neon Database
              </div>
            </div>
          )}

          {activeTab === "roles" && (
            <div className="max-w-4xl mx-auto space-y-12">
              {/* Intro Section */}
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <Info className="w-4 h-4 text-indigo-500" />
                  <h3 className="text-sm font-black uppercase tracking-widest text-gray-800 dark:text-white">
                    1. Rôles Système (Globaux)
                  </h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <RoleCard
                    role="ADMIN"
                    title="Administrateur"
                    description="Accès total à tous les projets, médias et réglages système."
                    color="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400"
                    icon={<Shield className="w-5 h-5" />}
                  />
                  <RoleCard
                    role="USER"
                    title="Utilisateur"
                    description="Accès aux projets possédés ou autorisés explicitement."
                    color="bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400"
                    icon={<User className="w-5 h-5" />}
                  />
                  <RoleCard
                    role="VISITOR"
                    title="Visiteur"
                    description="Lecture seule sur les projets. Accès restreint aux documents PDF."
                    color="bg-gray-50 dark:bg-gray-900/40 text-gray-500 dark:text-gray-400"
                    icon={<Users className="w-5 h-5" />}
                  />
                </div>
              </section>

              {/* Levels Section */}
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <FileText className="w-4 h-4 text-indigo-500" />
                  <h3 className="text-sm font-black uppercase tracking-widest text-gray-800 dark:text-white">
                    2. Niveaux par Projet
                  </h3>
                </div>
                <div className="bg-white dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden shadow-sm">
                  <table className="min-w-full divide-y divide-gray-100 dark:divide-gray-700/50">
                    <thead className="bg-gray-50 dark:bg-gray-900/50">
                      <tr>
                        <th className="px-6 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest">Niveau</th>
                        <th className="px-6 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest">Droits</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
                      <PermissionRow level="READ" label="Lecture" rights="Consulter le projet, voir les cartes et la galerie média." />
                      <PermissionRow level="WRITE" label="Écriture" rights="Lecture + modification détails projet & ajout de médias." />
                      <PermissionRow level="MANAGE" label="Gestion" rights="Écriture + suppression de médias & gestion des accès." />
                      <PermissionRow level="OWNER" label="Propriétaire" rights="Identique à MANAGE, définit le responsable principal." />
                    </tbody>
                  </table>
                </div>
              </section>

              {/* Matrix Section */}
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <Shield className="w-4 h-4 text-indigo-500" />
                  <h3 className="text-sm font-black uppercase tracking-widest text-gray-800 dark:text-white">
                    3. Matrice de Capacités
                  </h3>
                </div>
                <div className="overflow-x-auto rounded-2xl border border-gray-100 dark:border-gray-700">
                  <table className="min-w-full divide-y divide-gray-100 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-900/50">
                      <tr>
                        <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest">Action</th>
                        <th className="px-2 py-3 text-center text-[10px] font-bold text-gray-400 uppercase tracking-widest">Visitor</th>
                        <th className="px-2 py-3 text-center text-[10px] font-bold text-gray-400 uppercase tracking-widest">User (Read)</th>
                        <th className="px-2 py-3 text-center text-[10px] font-bold text-gray-400 uppercase tracking-widest">User (Write)</th>
                        <th className="px-2 py-3 text-center text-[10px] font-bold text-gray-400 uppercase tracking-widest">Admin</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50 text-xs">
                      <MatrixRow label="Consulter Cartes & Détails" access={[true, true, true, true]} />
                      <MatrixRow label="Galerie Photos / Vidéos" access={[true, true, true, true]} />
                      <MatrixRow label="Accès Documents PDF" access={[false, true, true, true]} />
                      <MatrixRow label="Modifier détails Projet" access={[false, false, true, true]} />
                      <MatrixRow label="Gestion des Médias (R2)" access={[false, false, true, true]} />
                      <MatrixRow label="Gérer Permissions / Système" access={[false, false, false, true]} />
                  </tbody>
                </table>
              </div>
            </section>

            </div>
          )}

          {activeTab === "gammes" && (
            <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500">
              {/* Range Selector */}
              <div className="flex flex-wrap gap-2 pb-4 border-b border-gray-100 dark:border-gray-700/50">
                {Object.keys(PROJECT_RANGES).map((range) => (
                  <button
                    key={range}
                    onClick={() => setActiveRange(range)}
                    className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-tight transition-all ${
                      activeRange === range
                        ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200 dark:shadow-none"
                        : "bg-gray-100 dark:bg-gray-800 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700"
                    }`}
                  >
                    {range}
                  </button>
                ))}
              </div>

              {/* Range Content */}
              <div key={activeRange} className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div className="lg:col-span-2 space-y-6 md:space-y-8">
                    <div>
                      <h3 className="text-xl md:text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tight mb-2 text-center md:text-left">
                        {PROJECT_RANGES[activeRange].name}
                      </h3>
                      <p className="text-xs md:text-sm font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest text-center md:text-left">
                        {PROJECT_RANGES[activeRange].subtitle}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
                      <div className="p-5 rounded-2xl bg-gray-50 dark:bg-gray-900/40 border border-gray-100 dark:border-gray-700/50 space-y-3">
                        <div className="flex items-center gap-2 text-gray-900 dark:text-white">
                          <LayoutDashboard className="w-4 h-4 text-indigo-500" />
                          <h4 className="text-[10px] font-black uppercase tracking-widest">Utilisation</h4>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed font-semibold">
                          {PROJECT_RANGES[activeRange].usage}
                        </p>
                      </div>

                      <div className="p-5 rounded-2xl bg-gray-50 dark:bg-gray-900/40 border border-gray-100 dark:border-gray-700/50 space-y-3">
                        <div className="flex items-center gap-2 text-gray-900 dark:text-white">
                          <Zap className="w-4 h-4 text-indigo-500" />
                          <h4 className="text-[10px] font-black uppercase tracking-widest">Technique</h4>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed font-semibold">
                          {PROJECT_RANGES[activeRange].technique}
                        </p>
                      </div>

                      <div className="p-5 rounded-2xl bg-gray-50 dark:bg-gray-900/40 border border-gray-100 dark:border-gray-700/50 space-y-3">
                        <div className="flex items-center gap-2 text-gray-900 dark:text-white">
                          <Check className="w-4 h-4 text-indigo-500" />
                          <h4 className="text-[10px] font-black uppercase tracking-widest">Avantages</h4>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed font-semibold">
                          {PROJECT_RANGES[activeRange].advantages}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="relative bg-gray-50 dark:bg-gray-900/50 rounded-2xl md:rounded-3xl p-6 border border-gray-100 dark:border-gray-800 flex items-center justify-center min-h-[250px] md:min-h-[300px] overflow-hidden group/image shadow-inner">
                    {loadingSettings ? (
                      <Loader2 className="w-10 h-10 animate-spin text-gray-200" />
                    ) : rangeImages[`range_image_${activeRange}`] ? (
                      <div className="absolute inset-0">
                        <NextImage
                          src={rangeImages[`range_image_${activeRange}`]}
                          alt={activeRange}
                          fill
                          className="object-cover"
                          unoptimized
                        />
                        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover/image:opacity-100 transition-opacity" />
                      </div>
                    ) : (
                      <div className="text-center space-y-4">
                        <div className="w-16 h-16 bg-white dark:bg-gray-800 rounded-2xl flex items-center justify-center mx-auto shadow-sm">
                          <ImageIcon className="w-8 h-8 text-gray-300" />
                        </div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                          Visuel {activeRange} en attente
                        </p>
                      </div>
                    )}

                    {/* Admin Pencil Trigger */}
                    {user?.role === 'ADMIN' && (
                      <button
                        onClick={() => setIsPickerOpen(true)}
                        className="absolute bottom-3 right-3 p-2 bg-white dark:bg-gray-800 text-indigo-600 dark:text-indigo-400 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 opacity-0 group-hover/image:opacity-100 hover:scale-110 active:scale-95 transition-all z-20"
                        title="Changer l'image"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Database Image Picker for Admin */}
        <DatabaseImagePicker
          isOpen={isPickerOpen}
          onClose={() => setIsPickerOpen(false)}
          onSelect={(url) => handleImageSelect(url)}
        />

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 flex flex-col sm:flex-row justify-between items-center gap-4">
          <span className="text-[9px] md:text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center sm:text-left">Site Matière — Documentation v1.2</span>
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-[10px] md:text-xs font-black uppercase tracking-widest rounded-xl hover:scale-105 active:scale-95 transition-all shadow-lg"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  color: string;
}

function FeatureCard({ icon, title, description, color }: FeatureCardProps) {
  return (
    <div className="p-6 rounded-2xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800/10 hover:shadow-lg transition-all group">
      <div className={`p-3 rounded-xl w-fit mb-4 ${color}`}>
        {icon}
      </div>
      <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight mb-2 group-hover:text-indigo-600 transition-colors">
        {title}
      </h3>
      <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed font-medium">
        {description}
      </p>
    </div>
  );
}

interface PhaseBadgeProps {
  label: string;
}

function PhaseBadge({ label }: PhaseBadgeProps) {
  return (
    <div className="px-3 py-1.5 bg-white dark:bg-gray-800 rounded-lg text-[10px] font-black uppercase tracking-tighter text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 shadow-sm">
      {label}
    </div>
  );
}

interface RoleCardProps {
  role: string;
  title: string;
  description: string;
  color: string;
  icon: React.ReactNode;
}

function RoleCard({ role, title, description, color, icon }: RoleCardProps) {
  return (
    <div className={`p-5 rounded-2xl border border-transparent hover:border-current/10 transition-all ${color}`}>
      <div className="flex items-center gap-3 mb-3">
        {icon}
        <span className="text-sm font-black uppercase tracking-tighter">{title}</span>
      </div>
      <p className="text-xs font-medium leading-relaxed opacity-80">{description}</p>
      <div className="mt-4 text-[10px] font-bold uppercase tracking-widest px-2 py-1 bg-white/50 dark:bg-black/20 rounded-lg w-fit">
        Role: {role}
      </div>
    </div>
  );
}

interface PermissionRowProps {
  level: string;
  label: string;
  rights: string;
}

function PermissionRow({ level, label, rights }: PermissionRowProps) {
  return (
    <tr className="hover:bg-gray-50/50 dark:hover:bg-gray-700/10 transition-colors">
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex flex-col">
          <span className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-tight">{label}</span>
          <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{level}</span>
        </div>
      </td>
      <td className="px-6 py-4">
        <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed font-medium">{rights}</p>
      </td>
    </tr>
  );
}

function MatrixRow({ label, access }: { label: string; access: boolean[] }) {
  return (
    <tr className="hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors">
      <td className="px-4 py-3 font-medium text-gray-700 dark:text-gray-300">{label}</td>
      {access.map((hasAccess, i) => (
        <td key={i} className="px-2 py-3 text-center">
          {hasAccess ? (
            <div className="inline-flex items-center justify-center w-5 h-5 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full">
              <Check className="w-3 h-3" strokeWidth={3} />
            </div>
          ) : (
            <div className="inline-flex items-center justify-center w-5 h-5 bg-gray-100 dark:bg-gray-700/50 text-gray-400 dark:text-gray-600 rounded-full">
              <X className="w-3 h-3" strokeWidth={3} />
            </div>
          )}
        </td>
      ))}
    </tr>
  );
}

interface ProjectRange {
  name: string;
  subtitle: string;
  usage: string;
  technique: string;
  advantages: string;
}

const PROJECT_RANGES: Record<string, ProjectRange> = {
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
