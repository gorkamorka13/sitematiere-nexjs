"use client";

import React, { useState } from "react";
import {
  FileText,
  Download,
  Loader2,
  Map as MapIcon,
  Image as ImageIcon,
  AlignLeft,
  BarChart3,
  Paperclip,
  X,
} from "lucide-react";
import { Project, Document as ProjectDocument, Video as ProjectVideo } from "@prisma/client";
import jsPDF from "jspdf";

// Minimal local UI components to avoid missing dependency errors
const Dialog = ({ open, children, onClose }: { open: boolean; children: React.ReactNode; onClose: () => void }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm px-2">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col border border-gray-100 dark:border-gray-700 overflow-hidden animate-in zoom-in-95 duration-200">
        {children}
      </div>
    </div>
  );
};

interface ProjectExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  project: (Project & { documents: ProjectDocument[]; videos: ProjectVideo[] }) | null;
  images: { url: string; name: string }[];
  globalMetadata?: {
    appVersion: string;
    buildDate: string;
  };
}

export function ProjectExportDialog({
  isOpen,
  onClose,
  project,
  images = [],
  globalMetadata,
}: ProjectExportDialogProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [options, setOptions] = useState({
    globalMap: false,
    projectMap: false,
    progress: true,
    description: true,
    documents: true,
    lastPhoto: true,
  });

  if (!project) return null;

  // Helper to load image as data URL
  const loadImageAsDataURL = (url: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject("Could not get canvas context");
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL("image/jpeg", 0.75));
      };
      img.onerror = () => reject(`Failed to load image at ${url}`);
      img.src = url.startsWith('http') ? url : window.location.origin + (url.startsWith('/') ? url : '/' + url);
    });
  };

  const handleExport = async () => {
    setIsGenerating(true);
    try {
      const doc = new jsPDF({
        orientation: "p",
        unit: "mm",
        format: "a4",
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 20;
      const contentWidth = pageWidth - 2 * margin;
      let yPos = margin;

      // --- 1. Header (Indigo Bar) ---
      doc.setFillColor(79, 70, 229); // Indigo 600
      doc.rect(0, 0, pageWidth, 40, "F");

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(22);
      doc.setFont("helvetica", "bold");
      doc.text("RAPPORT DE PROJET", margin, 18);

      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.text(`Émis le ${new Date().toLocaleDateString('fr-FR')}`, margin, 28);
      doc.text(`Logiciel Matière v${globalMetadata?.appVersion || '0.0.38'}`, pageWidth - margin - 40, 28);

      yPos = 55;

      // --- 2. Title Section (Centered) ---
      doc.setTextColor(17, 24, 39); // Gray 900
      doc.setFontSize(24);
      doc.setFont("helvetica", "bold");
      doc.text(project.name.toUpperCase(), pageWidth / 2, yPos, { align: "center" });
      yPos += 10;

      doc.setFontSize(14);
      doc.setTextColor(75, 85, 99); // Gray 600
      doc.setFont("helvetica", "bold");
      doc.text(`${project.country} | ${project.type} | STATUT: ${project.status}`, pageWidth / 2, yPos, { align: "center" });
      yPos += 15;

      // --- 3. Last Photo (Main Visual) ---
      const lastPhoto = images[images.length - 1];
      if (options.lastPhoto && lastPhoto) {
        try {
          const imgData = await loadImageAsDataURL(lastPhoto.url);
          const imgWidth = contentWidth;
          const imgHeight = (imgWidth * 9) / 16;

          if (yPos + imgHeight > pageHeight - 30) {
            doc.addPage();
            yPos = margin + 10;
          }

          doc.addImage(imgData, "JPEG", margin, yPos, imgWidth, imgHeight);
          yPos += imgHeight + 15;
        } catch (e) {
          console.warn("Could not load last photo for PDF", e);
        }
      }

      // --- 4. Description Section ---
      if (options.description && project.description) {
        if (yPos > pageHeight - 40) { doc.addPage(); yPos = margin; }

        doc.setTextColor(79, 70, 229);
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text("DESCRIPTION DU PROJET", margin, yPos);
        yPos += 8;

        doc.setTextColor(55, 65, 81);
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        const splitDescription = doc.splitTextToSize(project.description.replace(/\\n/g, '\n'), contentWidth);

        splitDescription.forEach((line: string) => {
            if (yPos > pageHeight - 15) { doc.addPage(); yPos = margin + 10; }
            doc.text(line, margin, yPos);
            yPos += 5;
        });
        yPos += 12;
      }

      // --- 5. Progress Section ---
      if (options.progress) {
        if (yPos > pageHeight - 65) { doc.addPage(); yPos = margin; }

        doc.setTextColor(79, 70, 229);
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text("AVANCEMENT DU CHANTIER", margin, yPos);
        yPos += 12;

        const steps = [
          { label: "Prospection", val: project.prospection },
          { label: "Études", val: project.studies },
          { label: "Fabrication", val: project.fabrication },
          { label: "Transport", val: project.transport },
          { label: "Construction", val: project.construction },
        ];

        steps.forEach(step => {
          doc.setTextColor(55, 65, 81);
          doc.setFontSize(9);
          doc.setFont("helvetica", "bold");
          doc.text(step.label.toUpperCase(), margin, yPos);
          doc.setFillColor(243, 244, 246);
          doc.rect(margin + 45, yPos - 3.5, 100, 4, "F");
          doc.setFillColor(79, 70, 229);
          doc.rect(margin + 45, yPos - 3.5, step.val, 4, "F");
          doc.setFont("helvetica", "normal");
          doc.text(`${step.val}%`, margin + 150, yPos);
          yPos += 9;
        });
        yPos += 10;
      }

      // --- 6. Documents & Plans Section ---
      if (options.documents && project.documents.length > 0) {
        if (yPos > pageHeight - 40) { doc.addPage(); yPos = margin; }

        doc.setTextColor(79, 70, 229);
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text("DOCUMENTS & PLANS", margin, yPos);
        yPos += 10;

        const planDocs = project.documents.filter(d => d.type === 'PLAN' || d.name.toLowerCase().includes('plan'));
        const otherDocs = project.documents.filter(d => d.type !== 'FLAG' && d.type !== 'CLIENT_LOGO' && d.type !== 'PLAN' && !d.name.toLowerCase().includes('plan'));

        // Plans visuals
        if (planDocs.length > 0) {
            doc.setTextColor(17, 24, 39);
            doc.setFontSize(11);
            doc.setFont("helvetica", "bold");
            doc.text("Plans Techniques :", margin, yPos);
            yPos += 8;

            for (const plan of planDocs) {
                if (yPos > pageHeight - 30) { doc.addPage(); yPos = margin + 10; }

                doc.setFillColor(219, 234, 254);
                doc.rect(margin, yPos - 4, 4, 4, "F");
                doc.setTextColor(55, 65, 81);
                doc.setFontSize(10);
                doc.setFont("helvetica", "normal");
                doc.text(`${plan.name}`, margin + 6, yPos);
                yPos += 6;

                // SPECIAL: Search for an image that matches this plan's name (visual preview)
                const planVisual = images.find(img => img.name.toLowerCase().includes('plan') || img.name.toLowerCase().includes(plan.name.split('.')[0].toLowerCase()));
                if (planVisual) {
                    try {
                        const planImgData = await loadImageAsDataURL(planVisual.url);
                        const pImgWidth = contentWidth * 0.7;
                        const pImgHeight = (pImgWidth * 2) / 3;

                        if (yPos + pImgHeight > pageHeight - 20) { doc.addPage(); yPos = margin + 10; }

                        doc.addImage(planImgData, "JPEG", margin + (contentWidth - pImgWidth)/2, yPos, pImgWidth, pImgHeight);
                        yPos += pImgHeight + 10;
                    } catch (e) {
                        console.warn("Could not load plan preview", e);
                    }
                }
            }
            yPos += 6;
        }

        if (otherDocs.length > 0) {
            doc.setTextColor(17, 24, 39);
            doc.setFontSize(11);
            doc.setFont("helvetica", "bold");
            doc.text("Autres fichiers :", margin, yPos);
            yPos += 8;

            otherDocs.forEach(d => {
                if (yPos > pageHeight - 15) { doc.addPage(); yPos = margin + 10; }
                doc.setTextColor(75, 85, 99);
                doc.setFontSize(9);
                doc.setFont("helvetica", "normal");
                doc.text(`• ${d.name} (${d.type})`, margin + 5, yPos);
                yPos += 6;
            });
        }
      }

      // --- Global Footer ---
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(156, 163, 175);
        doc.text(`Rapport de projet : ${project.name}`, margin, pageHeight - 10);
        doc.text(`Page ${i} / ${pageCount}`, pageWidth - margin, pageHeight - 10, { align: "right" });
        doc.setDrawColor(229, 231, 235);
        doc.line(margin, pageHeight - 15, pageWidth - margin, pageHeight - 15);
      }

      doc.save(`Rapport_${project.name.replace(/\s+/g, '_')}.pdf`);
      onClose();
    } catch (error) {
      console.error("PDF Generation failed:", error);
      alert("Erreur lors de la génération du PDF.");
    } finally {
      setIsGenerating(false);
    }
  };

  const OptionRow = ({ id, label, icon: Icon, color, checked, onChange }: any) => (
    <div
      className="flex items-center space-x-3 p-3 rounded-xl border border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/40 hover:bg-gray-50 dark:hover:bg-gray-900/60 transition-colors cursor-pointer"
      onClick={() => onChange(!checked)}
    >
      <input
        type="checkbox"
        id={id}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600 cursor-pointer"
        onClick={(e) => e.stopPropagation()}
      />
      <label htmlFor={id} className="flex flex-1 items-center gap-3 cursor-pointer">
        <Icon className={`w-4 h-4 ${color}`} />
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</span>
      </label>
    </div>
  );

  return (
    <Dialog open={isOpen} onClose={onClose}>
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-indigo-600 flex-shrink-0" />
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">Rapport PDF Personnalisé</h3>
        </div>
        <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
          <X className="w-5 h-5 text-gray-500" />
        </button>
      </div>

      <div className="p-6 overflow-y-auto max-h-[60vh] custom-scrollbar">
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 font-medium">
          Configurez le contenu du rapport pour <span className="text-indigo-600 font-bold">{project.name}</span>.
        </p>

        <div className="space-y-3">
          <OptionRow
            id="lastPhoto" label="Inclure la photo principale" icon={ImageIcon} color="text-purple-500"
            checked={options.lastPhoto} onChange={(v: boolean) => setOptions(o => ({ ...o, lastPhoto: v }))}
          />
          <OptionRow
            id="description" label="Description technique complète" icon={AlignLeft} color="text-blue-500"
            checked={options.description} onChange={(v: boolean) => setOptions(o => ({ ...o, description: v }))}
          />
          <OptionRow
            id="progress" label="État d'avancement des travaux" icon={BarChart3} color="text-green-500"
            checked={options.progress} onChange={(v: boolean) => setOptions(o => ({ ...o, progress: v }))}
          />
          <OptionRow
            id="documents" label="Plans & Documents archivés" icon={Paperclip} color="text-orange-500"
            checked={options.documents} onChange={(v: boolean) => setOptions(o => ({ ...o, documents: v }))}
          />

          <div className="pt-2">
             <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 px-1">Options Avancées (Beta)</div>
             <div className="space-y-3 opacity-60">
                <OptionRow
                    id="projectMap" label="Carte du projet" icon={MapIcon} color="text-indigo-400"
                    checked={options.projectMap} onChange={(v: boolean) => setOptions(o => ({ ...o, projectMap: v }))}
                />
                <OptionRow
                    id="globalMap" label="Carte globale multi-projets" icon={MapIcon} color="text-gray-400"
                    checked={options.globalMap} onChange={(v: boolean) => setOptions(o => ({ ...o, globalMap: v }))}
                />
             </div>
          </div>
        </div>
      </div>

      <div className="p-4 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row gap-3">
        <button
          onClick={onClose}
          disabled={isGenerating}
          className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-800 transition-all"
        >
          Annuler
        </button>
        <button
          onClick={handleExport}
          disabled={isGenerating}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold shadow-lg shadow-indigo-600/20 transition-all disabled:opacity-50"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Génération du PDF...
            </>
          ) : (
            <>
              <Download className="w-4 h-4" />
              Générer le Rapport
            </>
          )}
        </button>
      </div>
    </Dialog>
  );
}
