"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
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
  Calendar,
  Layers,
} from "lucide-react";
import { Project, Document as ProjectDocument, Video as ProjectVideo } from "@prisma/client";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import dynamic from "next/dynamic";

// Dynamic imports for maps to handle Leaflet's window dependency
const ProjectsMap = dynamic(() => import("@/components/ui/projects-map"), { ssr: false });
const ProjectMap = dynamic(() => import("@/components/ui/project-map"), { ssr: false });

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
  allProjects?: Project[];
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
  allProjects = [],
  images = [],
  globalMetadata,
}: ProjectExportDialogProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [exportStatus, setExportStatus] = useState<string>("");
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
  const [captureKey, setCaptureKey] = useState<"global" | "project" | null>(null);
  const [options, setOptions] = useState({
    globalMap: true,
    projectMap: true,
    progress: true,
    description: true,
    documents: true,
    lastPhoto: true,
  });

  if (!isOpen || !project) return null;

  /**
   * Premium Image Loader: Center-crop (cover) and rounded corners
   */
  const loadPremiumImage = (url: string, targetRatio: number = 16/9, borderRadius: number = 20): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        // Create canvas with a high resolution for PDF quality
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject("Could not get canvas context");

        // Set dimensions based on target ratio
        let drawWidth, drawHeight, offsetX, offsetY;
        const imgRatio = img.width / img.height;

        if (imgRatio > targetRatio) {
          // Image is wider than target
          drawHeight = img.height;
          drawWidth = img.height * targetRatio;
          offsetX = (img.width - drawWidth) / 2;
          offsetY = 0;
        } else {
          // Image is taller than target
          drawWidth = img.width;
          drawHeight = img.width / targetRatio;
          offsetX = 0;
          offsetY = (img.height - drawHeight) / 2;
        }

        // Final canvas size (scaled for quality)
        canvas.width = 1200;
        canvas.height = canvas.width / targetRatio;

        // Apply rounded corners clip
        ctx.beginPath();
        const r = borderRadius;
        ctx.moveTo(r, 0);
        ctx.lineTo(canvas.width - r, 0);
        ctx.quadraticCurveTo(canvas.width, 0, canvas.width, r);
        ctx.lineTo(canvas.width, canvas.height - r);
        ctx.quadraticCurveTo(canvas.width, canvas.height, canvas.width - r, canvas.height);
        ctx.lineTo(r, canvas.height);
        ctx.quadraticCurveTo(0, canvas.height, 0, canvas.height - r);
        ctx.lineTo(0, r);
        ctx.quadraticCurveTo(0, 0, r, 0);
        ctx.closePath();
        ctx.clip();

        // Draw the image cropped and centered
        ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight, 0, 0, canvas.width, canvas.height);

        resolve(canvas.toDataURL("image/jpeg", 0.85));
      };
      img.onerror = () => reject(`Failed to load image at ${url}`);
      img.src = url.startsWith('http') ? url : window.location.origin + (url.startsWith('/') ? url : '/' + url);
    });
  };

  /**
   * Capture a map element using html2canvas
   */
  const captureMap = async (mode: 'global' | 'project', elementId: string): Promise<string | null> => {
    try {
      // Step 1: Trigger JIT rendering (renders map in a portal at document.body)
      setCaptureKey(mode);

      // Step 2: Wait for component mount and Leaflet settle (Essential for JIT)
      await new Promise(resolve => setTimeout(resolve, 8000));
      window.dispatchEvent(new Event('resize'));
      await new Promise(resolve => setTimeout(resolve, 1000));

      const element = document.getElementById(elementId);
      if (!element) {
        console.error(`[CAPTURE v1.6] Element ${elementId} not found after JIT wait`);
        setCaptureMode(null);
        return null;
      }

      // Pre-fetching verification for map images (solving NS_BINDING_ABORTED)
      const imgs = Array.from(element.querySelectorAll('img'));
      console.log(`[CAPTURE v1.6] Found ${imgs.length} images to verify for ${elementId}`);

      await Promise.all(imgs.map(img => {
        if (img.complete) return Promise.resolve();
        return new Promise(resolve => {
          img.onload = resolve;
          img.onerror = resolve;
        });
      }));

      console.log(`[CAPTURE v1.6] Images verified, starting capture for ${elementId}`);

      const canvasPromise = html2canvas(element, {
        useCORS: true,
        allowTaint: false,
        backgroundColor: "#ffffff",
        scale: 1,
        logging: true, // Re-enable logs for v1.6 troubleshooting
        width: element.offsetWidth || 1024,
        height: element.offsetHeight || 768,
        scrollX: 0,
        scrollY: 0,
        onclone: (clonedDoc) => {
          // Extra styles for the clone
          const style = clonedDoc.createElement('style');
          style.innerHTML = `
            * { transition: none !important; animation: none !important; }
            .leaflet-pane { transform: none !important; }
          `;
          clonedDoc.head.appendChild(style);
        }
      });

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error(`TIMEOUT_30S_v1.6_${elementId}`)), 30000)
      );

      const canvas = await Promise.race([canvasPromise, timeoutPromise]) as HTMLCanvasElement;
      console.log(`[CAPTURE v1.6] SUCCESS: ${elementId}`);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.7);

      // Cleanup
      setCaptureMode(null);
      return dataUrl;
    } catch (error) {
      console.error(`Error capturing map ${elementId}:`, error);
      setCaptureMode(null);
      return null;
    }
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
      const indigo600 = [79, 70, 229]; // #4f46e5
      const gray900 = [17, 24, 39];
      const gray500 = [107, 114, 128];

      let yPos = 0;

      // Helper for Section Headers
      const addSectionHeader = (title: string, currentY: number) => {
        doc.setFillColor(indigo600[0], indigo600[1], indigo600[2]);
        doc.rect(margin, currentY, 3, 6, "F");
        doc.setTextColor(indigo600[0], indigo600[1], indigo600[2]);
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text(title.toUpperCase(), margin + 6, currentY + 4.5);

        doc.setDrawColor(229, 231, 235);
        doc.line(margin, currentY + 10, pageWidth - margin, currentY + 10);
        return currentY + 18;
      };

      // --- 1. COVER HEADER ---
      doc.setFillColor(indigo600[0], indigo600[1], indigo600[2]);
      doc.rect(0, 0, pageWidth, 45, "F");

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(24);
      doc.setFont("helvetica", "bold");
      doc.text("RAPPORT TECHNIQUE", margin, 22);

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`Identifiant: ${project.projectCode || project.id.substring(0,8)}`, margin, 32);
      doc.text(`Date d'export: ${new Date().toLocaleDateString('fr-FR')}`, pageWidth - margin, 32, { align: "right" });

      yPos = 60;

      // --- 2. MAIN TITLE ---
      doc.setTextColor(gray900[0], gray900[1], gray900[2]);
      doc.setFontSize(32);
      doc.setFont("helvetica", "bold");
      doc.text(project.name.toUpperCase(), pageWidth / 2, yPos, { align: "center" });
      yPos += 15;

      // --- 3. PROJECT INFO CARDS (Boxed) ---
      doc.setFillColor(249, 250, 251); // Gray 50
      doc.setDrawColor(229, 231, 235);
      doc.roundedRect(margin, yPos, contentWidth, 22, 3, 3, "FD");

      doc.setFontSize(8);
      doc.setTextColor(gray500[0], gray500[1], gray500[2]);
      doc.text("PAYS", margin + 10, yPos + 7);
      doc.text("TYPE DE STRUCTURE", margin + (contentWidth/3) + 5, yPos + 7);
      doc.text("STATUT ACTUEL", margin + (2 * contentWidth/3) + 5, yPos + 7);

      doc.setFontSize(11);
      doc.setTextColor(gray900[0], gray900[1], gray900[2]);
      doc.setFont("helvetica", "bold");
      doc.text(project.country, margin + 10, yPos + 15);
      doc.text(project.type, margin + (contentWidth/3) + 5, yPos + 15);

      // Status with color dot simulation
      const statusColor = project.status === 'DONE' ? [34, 197, 94] : project.status === 'CURRENT' ? [234, 179, 8] : [99, 102, 241];
      doc.setFillColor(statusColor[0], statusColor[1], statusColor[2]);
      doc.circle(margin + (2 * contentWidth/3) + 8, yPos + 13.5, 1.5, "F");
      doc.text(project.status, margin + (2 * contentWidth/3) + 12, yPos + 15);

      yPos += 35;

      // --- 4. MAIN PHOTO (Premium Fit) ---
      const lastPhoto = images[images.length - 1];
      if (options.lastPhoto && lastPhoto) {
        try {
          const imgData = await loadPremiumImage(lastPhoto.url, 16/9, 40); // Larger radius for main photo
          const imgWidth = contentWidth;
          const imgHeight = (imgWidth * 9) / 16;

          if (yPos + imgHeight > pageHeight - 30) {
            doc.addPage();
            yPos = margin + 10;
          }

          doc.addImage(imgData, "JPEG", margin, yPos, imgWidth, imgHeight);
          yPos += imgHeight + 20;
        } catch (e) {
          console.warn("Could not load last photo for PDF", e);
        }
      }

      // --- 4.5 MAPS (Captures) ---
      if (options.globalMap || options.projectMap) {
        setExportStatus("Préparation cartes...");
        yPos = addSectionHeader("Localisation & Contexte", yPos);

        const mapWidth = (contentWidth - 10) / 2; // Split page width
        const mapHeight = (mapWidth * 3) / 4; // 4:3 ratio

        if (yPos + mapHeight > pageHeight - 30) {
          doc.addPage();
          yPos = margin + 10;
        }

        // Project Map (Local View)
        if (options.projectMap) {
          setExportStatus("Capture vue locale...");
          const projectMapImg = await captureMap("project", "pdf-project-map-capture");
          if (projectMapImg) {
            doc.addImage(projectMapImg, "JPEG", margin, yPos, mapWidth, mapHeight);
          }
        }

        // Global Map (Regional View)
        if (options.globalMap) {
          setExportStatus("Capture vue régionale...");
          const globalMapImg = await captureMap("global", "pdf-global-map-capture");
          if (globalMapImg) {
            doc.addImage(globalMapImg, "JPEG", margin + mapWidth + 10, yPos, mapWidth, mapHeight);
          }
        }

        setExportStatus("Finalisation...");
        yPos += mapHeight + 15;
      }

      // --- 5. DESCRIPTION ---
      if (options.description && project.description) {
        yPos = addSectionHeader("Description du Projet", yPos);

        doc.setTextColor(55, 65, 81);
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        const splitDescription = doc.splitTextToSize(project.description.replace(/\\n/g, '\n'), contentWidth);

        splitDescription.forEach((line: string) => {
            if (yPos > pageHeight - 15) { doc.addPage(); yPos = margin + 15; }
            doc.text(line, margin, yPos);
            yPos += 6;
        });
        yPos += 12;
      }

      // --- 6. PROGRESS ---
      if (options.progress) {
        if (yPos > pageHeight - 70) { doc.addPage(); yPos = margin + 10; }
        yPos = addSectionHeader("Avancement du Chantier", yPos);

        const steps = [
          { label: "Prospection", val: project.prospection },
          { label: "Études", val: project.studies },
          { label: "Fabrication", val: project.fabrication },
          { label: "Transport", val: project.transport },
          { label: "Construction", val: project.construction },
        ];

        steps.forEach(step => {
          doc.setTextColor(gray900[0], gray900[1], gray900[2]);
          doc.setFontSize(9);
          doc.setFont("helvetica", "bold");
          doc.text(step.label.toUpperCase(), margin, yPos);

          // Progress track
          doc.setFillColor(243, 244, 246);
          doc.roundedRect(margin + 45, yPos - 3.5, 100, 3.5, 1.5, 1.5, "F");

          // Progress bar
          if (step.val > 0) {
              doc.setFillColor(indigo600[0], indigo600[1], indigo600[2]);
              doc.roundedRect(margin + 45, yPos - 3.5, step.val, 3.5, 1.5, 1.5, "F");
          }

          doc.setFont("helvetica", "normal");
          doc.text(`${step.val}%`, margin + 150, yPos);
          yPos += 10;
        });
        yPos += 10;
      }

      // --- 7. DOCUMENTS & PLANS ---
      if (options.documents && project.documents.length > 0) {
        if (yPos > pageHeight - 50) { doc.addPage(); yPos = margin + 10; }
        yPos = addSectionHeader("Plans & Documentation Technique", yPos);

        const planDocs = project.documents.filter(d => d.type === 'PLAN' || d.name.toLowerCase().includes('plan'));
        const otherDocs = project.documents.filter(d => d.type !== 'FLAG' && d.type !== 'CLIENT_LOGO' && d.type !== 'PLAN' && !d.name.toLowerCase().includes('plan'));

        if (planDocs.length > 0) {
            for (const plan of planDocs) {
                if (yPos > pageHeight - 40) { doc.addPage(); yPos = margin + 15; }

                doc.setTextColor(gray900[0], gray900[1], gray900[2]);
                doc.setFontSize(10);
                doc.setFont("helvetica", "bold");
                doc.text(`Plan: ${plan.name}`, margin, yPos);
                yPos += 8;

                const planVisual = images.find(img => img.name.toLowerCase().includes('plan') || img.name.toLowerCase().includes(plan.name.split('.')[0].toLowerCase()));
                if (planVisual) {
                    try {
                        const planImgData = await loadPremiumImage(planVisual.url, 3/2, 25);
                        const pImgWidth = contentWidth * 0.8;
                        const pImgHeight = (pImgWidth * 2) / 3;

                        if (yPos + pImgHeight > pageHeight - 20) { doc.addPage(); yPos = margin + 15; }

                        doc.addImage(planImgData, "JPEG", margin + (contentWidth - pImgWidth)/2, yPos, pImgWidth, pImgHeight);
                        yPos += pImgHeight + 12;
                    } catch (e) {
                        console.warn("Could not load plan preview", e);
                    }
                }
            }
            yPos += 5;
        }

        if (otherDocs.length > 0) {
            otherDocs.forEach(d => {
                if (yPos > pageHeight - 15) { doc.addPage(); yPos = margin + 15; }
                doc.setTextColor(gray500[0], gray500[1], gray500[2]);
                doc.setFontSize(9);
                doc.setFont("helvetica", "normal");
                doc.text(`• ${d.name} (${d.type})`, margin + 5, yPos);
                yPos += 6;
            });
        }
      }

      // --- GLOBAL FOOTER LOGIC ---
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);

        doc.setDrawColor(229, 231, 235);
        doc.line(margin, pageHeight - 15, pageWidth - margin, pageHeight - 15);

        doc.setFontSize(8);
        doc.setTextColor(gray500[0], gray500[1], gray500[2]);
        doc.text(`Projet: ${project.name} | Confidentialité: Interne Matière`, margin, pageHeight - 10);
        doc.text(`Page ${i} / ${pageCount}`, pageWidth - margin, pageHeight - 10, { align: "right" });
      }

      doc.save(`RAPPORT_TECHNIQUE_${project.name.replace(/\s+/g, '_').toUpperCase()}.pdf`);
      onClose();
    } catch (error) {
      console.error("PDF Generation failed:", error);
      alert("Erreur lors de la génération du rapport professionnel.");
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
          <h3 className="text-lg font-bold text-gray-900 dark:text-white uppercase tracking-tight">Export Rapport Premium</h3>
        </div>
        <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
          <X className="w-5 h-5 text-gray-500" />
        </button>
      </div>

      <div className="p-6 overflow-y-auto max-h-[60vh] custom-scrollbar">
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 font-medium">
          Générez un document professionnel pour l'ouvrage <span className="text-indigo-600 font-bold">{project.name}</span>.
        </p>

        <div className="space-y-3">
          <OptionRow
            id="lastPhoto" label="Photo de couverture (Premium Fit)" icon={ImageIcon} color="text-purple-500"
            checked={options.lastPhoto} onChange={(v: boolean) => setOptions(o => ({ ...o, lastPhoto: v }))}
          />
          <OptionRow
            id="description" label="Description technique & Contexte" icon={AlignLeft} color="text-blue-500"
            checked={options.description} onChange={(v: boolean) => setOptions(o => ({ ...o, description: v }))}
          />
          <OptionRow
            id="progress" label="Suivi d'avancement graphique" icon={BarChart3} color="text-green-500"
            checked={options.progress} onChange={(v: boolean) => setOptions(o => ({ ...o, progress: v }))}
          />
          <OptionRow
            id="documents" label="Annexes: Dossier Plans et Documents" icon={Paperclip} color="text-orange-500"
            checked={options.documents} onChange={(v: boolean) => setOptions(o => ({ ...o, documents: v }))}
          />

          <div className="pt-2">
             <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 px-1">Extensions Cartographiques</div>
             <div className="space-y-3">
                <OptionRow
                    id="projectMap" label="Géo-localisation ponctuelle" icon={MapIcon} color="text-indigo-400"
                    checked={options.projectMap} onChange={(v: boolean) => setOptions(o => ({ ...o, projectMap: v }))}
                />
                <OptionRow
                    id="globalMap" label="Contexte régional (Carte globale)" icon={MapIcon} color="text-gray-400"
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
          className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-800 transition-all font-bold"
        >
          Annuler
        </button>
        <button
          onClick={handleExport}
          disabled={isGenerating}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold shadow-lg shadow-indigo-600/20 transition-all active:scale-95 disabled:opacity-50"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              {exportStatus || "Génération..."}
            </>
          ) : (
            <>
              <Download className="w-4 h-4" />
              Générer Rapport PDF
            </>
          )}
        </button>
      </div>

      {/* JIT Map Capture Portal - Isolates map rendering from main dashboard DOM */}
      {/* JIT Map Capture Portal - Isolates map rendering into transient Iframe */}
      {portalTarget && captureKey && createPortal(
        <div style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            background: 'white'
        }}>
          {captureKey === 'global' ? (
            <div id="pdf-global-map-capture" style={{ width: "1024px", height: "768px" }}>
                <ProjectsMap projects={allProjects} isCapture={true} />
            </div>
          ) : (
            <div id="pdf-project-map-capture" style={{ width: "1024px", height: "768px" }}>
                <ProjectMap
                    latitude={project.latitude}
                    longitude={project.longitude}
                    status={project.status}
                    projectName={project.name}
                    country={project.country}
                    isCapture={true}
                />
            </div>
          )}
        </div>,
        portalTarget
      )}
    </Dialog>
  );
}
