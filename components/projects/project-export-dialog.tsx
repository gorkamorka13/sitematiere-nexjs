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
import * as htmlToImage from "html-to-image";
import JSZip from "jszip";
import dynamic from "next/dynamic";
import { decimalToDMS } from "@/lib/coordinate-utils";

// Dynamic imports for maps to handle Leaflet's window dependency
const ProjectsMap = dynamic(() => import("@/components/ui/projects-map"), { ssr: false });
const ProjectMap = dynamic(() => import("@/components/ui/project-map"), { ssr: false });

// Minimal local UI components to avoid missing dependency errors
const Dialog = ({ open, children }: { open: boolean; children: React.ReactNode; onClose: () => void }) => {
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
  filteredProjects?: Project[]; // Projects currently displayed on the global map (filtered)
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
  filteredProjects,
  images = [],
}: ProjectExportDialogProps) {
  // Use filtered projects if provided, otherwise fall back to all projects
  const projectsForMap = filteredProjects && filteredProjects.length > 0 ? filteredProjects : allProjects;
  const [isGenerating, setIsGenerating] = useState(false);
  const [exportStatus, setExportStatus] = useState<string>("");
  const [captureKey, setCaptureKey] = useState<"global" | "project" | null>(null);
  const portalRef = React.useRef<HTMLDivElement | null>(null);
  const [options, setOptions] = useState({
    globalMap: false,
    projectMap: false,
    progress: true,
    description: true,
    documents: false,
    lastPhoto: true,
  });

  if (!isOpen || !project) return null;

  /**
   * Premium Image Loader: Center-crop (cover)
   */
  const loadPremiumImage = (url: string, targetRatio: number = 16/9): Promise<string> => {
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

      // Draw the image cropped and centered (no rounded corners)
      ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight, 0, 0, canvas.width, canvas.height);

      // Support transparency for PNG
      const isPng = url.toLowerCase().endsWith('.png');
      resolve(canvas.toDataURL(isPng ? "image/png" : "image/jpeg", 0.9));
      };
      img.onerror = () => reject(`Failed to load image at ${url}`);
      img.src = url.startsWith('http') ? url : window.location.origin + (url.startsWith('/') ? url : '/' + url);
    });
  };

  /**
   * Capture a map element using html-to-image
   */
  const captureMap = async (mode: 'global' | 'project', elementId: string): Promise<string | null> => {
    try {
      // Step 1: Trigger JIT rendering
      setCaptureKey(mode);

      // Step 2: Wait for component mount and Leaflet settle (reduced times)
      const waitTime = mode === 'global' ? 3000 : 2000;
      await new Promise(resolve => setTimeout(resolve, waitTime));
      window.dispatchEvent(new Event('resize'));
      await new Promise(resolve => setTimeout(resolve, 500));

      const element = document.getElementById(elementId);
      if (!element) {
        console.error(`[CAPTURE v2.2] Element ${elementId} not found after JIT wait`);
        setCaptureKey(null);
        return null;
      }

      console.log(`[CAPTURE v2.2] Starting capture for ${elementId}`);

      // Use html-to-image for better performance
      const dataUrl = await htmlToImage.toJpeg(element, {
        quality: 0.85,
        backgroundColor: '#ffffff',
        pixelRatio: 1,
        cacheBust: true,
        skipFonts: true,
        filter: (node) => {
          if (node instanceof HTMLElement) {
            if (node.style.display === 'none') return false;
            if (node.classList?.contains('leaflet-control-container')) return false;
          }
          return true;
        }
      });

      console.log(`[CAPTURE v2.2] SUCCESS: ${elementId}`);

      // Cleanup
      setCaptureKey(null);
      return dataUrl;
    } catch (error) {
      console.error(`Error capturing map ${elementId}:`, error);
      setCaptureKey(null);
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
      // const indigo600 = [79, 70, 229]; // #4f46e5
      const gray900 = [17, 24, 39];
      const gray500 = [107, 114, 128];

      let yPos = 0;

      // Helper for Section Headers
      const addSectionHeader = (title: string, currentY: number) => {
        doc.setFillColor(230, 39, 38); // Red Matière #E62726
        doc.rect(margin, currentY, 4, 8, "F");
        doc.setTextColor(230, 39, 38);
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text(title.toUpperCase(), margin + 8, currentY + 6.5);

        doc.setDrawColor(229, 231, 235);
        doc.line(margin, currentY + 12, pageWidth - margin, currentY + 12);
        return currentY + 20;
      };

      // --- 1. PREMIUM HEADER (Printable) ---
      // Left Part: Brand with Red Background (as in app menu)
      doc.setFillColor(230, 39, 38); // #E62726 (Matière Red)
      doc.roundedRect(margin, 10, 32, 10, 1.5, 1.5, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(14);
      doc.setFont("times", "bold");
      doc.text("Matière", margin + 16, 17, { align: "center" });

      try {
        // Logo Matière (Top Right)
        const logoUrl = "/Matiere_logo_512.png";
        const logoData = await loadPremiumImage(logoUrl, 1).catch(() => null);
        if (logoData) {
          doc.addImage(logoData, "PNG", pageWidth - margin - 15, 10, 15, 15);
        }
      } catch (e) {
        console.warn("Logo could not be loaded", e);
      }

      doc.setTextColor(gray500[0], gray500[1], gray500[2]);
      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      doc.text("GROUPE MATIÈRE", margin, 24);

      doc.setDrawColor(229, 231, 235);
      doc.line(margin, 26, pageWidth - margin, 26);

      yPos = 38;

      // --- 2. REPORT TITLE ---
      doc.setTextColor(230, 39, 38); // Match red Matière
      doc.setFontSize(22);
      doc.setFont("helvetica", "bold");
      doc.text("RAPPORT TECHNIQUE", margin, yPos);

      const getPdfProgressColor = (val: number) => {
          if (val >= 100) return [34, 197, 94]; // Green-500 #22C55E
          if (val > 50) return [251, 191, 36]; // Yellow-500 #FBBF24
          if (val > 25) return [249, 115, 22]; // Orange-500 #F97316
          return [239, 68, 68]; // Red-500 #EF4444
      };

      yPos += 12;

      // --- 3. PROJECT TITLE ---
      doc.setTextColor(gray900[0], gray900[1], gray900[2]);
      doc.setFontSize(26);
      doc.setFont("helvetica", "bold");
      doc.text(project.name.toUpperCase(), margin, yPos);

      yPos += 12;

      // --- 4. PROJECT DETAILS TABLE (Manual) ---
      const tableRows = [
        { label: "Identifiant du projet", value: project.projectCode || project.id },
        { label: "Localisation / Pays", value: project.country },
        { label: "Type d'ouvrage", value: project.type },
        { label: "Statut de réalisation", value: project.status },
        { label: "Coordonnées GPS", value: `${decimalToDMS(project.latitude, true)} | ${decimalToDMS(project.longitude, false)}` }
      ];

      const rowHeight = 8;
      const col1Width = 50;
      const tableTop = yPos;

      doc.setFontSize(9);
      tableRows.forEach((row, index) => {
        const currentY = tableTop + (index * rowHeight);

        // Background for zebra striping
        if (index % 2 === 0) {
          doc.setFillColor(249, 250, 251);
          doc.rect(margin, currentY, contentWidth, rowHeight, "F");
        }

        // Cell Borders
        doc.setDrawColor(243, 244, 246);
        doc.rect(margin, currentY, contentWidth, rowHeight);

        // Label
        doc.setFont("helvetica", "bold");
        doc.setTextColor(gray500[0], gray500[1], gray500[2]);
        doc.text(row.label, margin + 4, currentY + 5.5);

        // Value
        doc.setFont("helvetica", "normal");
        doc.setTextColor(gray900[0], gray900[1], gray900[2]);
        doc.text(String(row.value), margin + col1Width + 4, currentY + 5.5);
      });

      yPos = tableTop + (tableRows.length * rowHeight) + 15;

      // --- 5. MAIN PHOTO (Premium Fit) ---
      const lastPhoto = images[images.length - 1];
      if (options.lastPhoto && lastPhoto) {
        try {
          const imgData = await loadPremiumImage(lastPhoto.url, 16/9);
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

      // --- 6. MAPS (Captures) ---
      if (options.globalMap || options.projectMap) {
        setExportStatus("Préparation cartes...");
        yPos = addSectionHeader("Localisation & Contexte", yPos);

        const mapWidth = (contentWidth - 10) / 2;
        const mapHeight = (mapWidth * 3) / 4;

        if (yPos + mapHeight > pageHeight - 30) {
          doc.addPage();
          yPos = margin + 10;
        }

        // Global Map (Regional View) - LEFT
        if (options.globalMap) {
          setExportStatus("Capture vue régionale...");
          const globalMapImg = await captureMap("global", "pdf-global-map-capture");
          if (globalMapImg) {
            doc.addImage(globalMapImg, "JPEG", margin, yPos, mapWidth, mapHeight);
          }
        }

        // Project Map (Local View) - RIGHT
        if (options.projectMap) {
          setExportStatus("Capture vue locale...");
          const projectMapImg = await captureMap("project", "pdf-project-map-capture");
          if (projectMapImg) {
            const rightX = margin + mapWidth + 10;
            doc.addImage(projectMapImg, "JPEG", rightX, yPos, mapWidth, mapHeight);
          }
        }

        // Legends below maps
        yPos += mapHeight + 8;
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");

        if (options.globalMap) {
          doc.setTextColor(79, 70, 229);
          doc.text("Vue régionale", margin + mapWidth/2, yPos, { align: "center" });
          doc.setFont("helvetica", "normal");
          doc.setTextColor(107, 114, 128);
          doc.setFontSize(7);
          const projectCount = projectsForMap.length;
          doc.text(`${projectCount} projet${projectCount > 1 ? 's' : ''} dans la région`, margin + mapWidth/2, yPos + 4, { align: "center" });
        }

        if (options.projectMap) {
          const rightX = margin + mapWidth + 10;
          doc.setFontSize(9);
          doc.setFont("helvetica", "bold");
          doc.setTextColor(79, 70, 229);
          doc.text("Localisation précise", rightX + mapWidth/2, yPos, { align: "center" });
          doc.setFont("helvetica", "normal");
          doc.setTextColor(107, 114, 128);
          doc.setFontSize(7);
          doc.text(project.name, rightX + mapWidth/2, yPos + 4, { align: "center" });
          // Coordinates in sexagesimal format
          const latDMS = decimalToDMS(project.latitude, true);
          const lngDMS = decimalToDMS(project.longitude, false);
          doc.text(`${latDMS} | ${lngDMS}`, rightX + mapWidth/2, yPos + 8, { align: "center" });
        }

        setExportStatus("Finalisation...");
        yPos += 18;
      }

      // --- 7. DESCRIPTION (ZEBRA TABLE) ---
      if (options.description && project.description) {
        yPos = addSectionHeader("Description du Projet", yPos);

        const lines = project.description.replace(/\\n/g, '\n').split('\n').filter(l => l.trim().length > 0);

        lines.forEach((line, index) => {
          if (yPos > pageHeight - 20) { doc.addPage(); yPos = margin + 10; }

          // Alternating background
          if (index % 2 === 0) {
            doc.setFillColor(249, 250, 251); // Gray-50
            doc.rect(margin, yPos - 5, contentWidth, 8, "F");
          }

          // Check if it's a key: value pair
          if (line.includes(':')) {
            const [key, ...rest] = line.split(':');
            const value = rest.join(':').trim();

            doc.setTextColor(107, 114, 128); // Gray-500
            doc.setFontSize(9);
            doc.setFont("helvetica", "bold");
            doc.text(key.trim().toUpperCase(), margin + 4, yPos + 1);

            doc.setTextColor(31, 41, 55); // Gray-800
            doc.setFont("helvetica", "normal");
            doc.setFontSize(10);
            const splitVal = doc.splitTextToSize(value, contentWidth - 60);
            doc.text(splitVal, margin + 55, yPos + 1);

            yPos += (Array.isArray(splitVal) ? splitVal.length * 5 : 5) + 3;
          } else {
            // Normal text
            doc.setTextColor(55, 65, 81);
            doc.setFontSize(10);
            doc.setFont("helvetica", "normal");
            const splitText = doc.splitTextToSize(line, contentWidth - 8);
            doc.text(splitText, margin + 4, yPos + 1);
            yPos += (Array.isArray(splitText) ? splitText.length * 5 : 5) + 3;
          }
        });
        yPos += 12;
      }

      // --- 8. PROGRESS ---
      if (options.progress) {
        if (yPos > pageHeight - 70) { doc.addPage(); yPos = margin + 10; }
        yPos = addSectionHeader("Avancement du Projet", yPos);

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
              const color = getPdfProgressColor(step.val);
              doc.setFillColor(color[0], color[1], color[2]);
              doc.roundedRect(margin + 45, yPos - 3.5, step.val, 3.5, 1.5, 1.5, "F");
          }

          doc.setFont("helvetica", "normal");
          doc.text(`${step.val}%`, margin + 150, yPos);
          yPos += 10;
        });
        yPos += 10;
      }

      // --- 9. DOCUMENTS & PLANS (Conditional) ---
      const planDocs = project.documents.filter(d => d.type === 'PLAN' || d.name.toLowerCase().includes('plan'));
      const otherDocs = project.documents.filter(d => d.type !== 'FLAG' && d.type !== 'CLIENT_LOGO' && d.type !== 'PLAN' && !d.name.toLowerCase().includes('plan'));

      if (options.documents && (planDocs.length > 0 || otherDocs.length > 0)) {
        if (yPos > pageHeight - 50) { doc.addPage(); yPos = margin + 10; }
        yPos = addSectionHeader("Plans & Documentation Technique", yPos);

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
                        const planImgData = await loadPremiumImage(planVisual.url, 3/2);
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

      // --- EXPORT LOGIC: PDF or ZIP ---
      const pdfFileName = `RAPPORT_TECHNIQUE_${project.name.replace(/\s+/g, '_').toUpperCase()}.pdf`;

      if (options.documents && project.documents && project.documents.length > 0) {
        // Create ZIP with PDF and documents
        setExportStatus("Préparation du ZIP avec annexes...");
        const zip = new JSZip();

        // Add PDF to ZIP
        const pdfBlob = doc.output('blob');
        zip.file(pdfFileName, pdfBlob);

        // Create folder for documents
        const docsFolder = zip.folder("Documents");

        // Download and add each document
        let docsAdded = 0;
        for (const doc of project.documents) {
          try {
            if (doc.url) {
              setExportStatus(`Téléchargement des annexes... ${docsAdded + 1}/${project.documents.length}`);
              const response = await fetch(doc.url);
              if (response.ok) {
                const blob = await response.blob();
                let fileName = doc.name || `document_${doc.id}`;

                // Ensure file has an extension
                if (!fileName.includes('.')) {
                  // Extract extension from URL
                  const urlExtension = doc.url.split('.').pop()?.split('?')[0];
                  if (urlExtension && urlExtension.length > 0 && urlExtension.length < 10) {
                    fileName += `.${urlExtension}`;
                  } else {
                    // Default extensions based on document type
                    const type = doc.type?.toLowerCase() || '';
                    if (type.includes('pdf')) fileName += '.pdf';
                    else if (type.includes('image') || type.includes('jpg') || type.includes('jpeg')) fileName += '.jpg';
                    else if (type.includes('png')) fileName += '.png';
                    else if (type.includes('dwg') || type.includes('autocad')) fileName += '.dwg';
                    else if (type.includes('doc')) fileName += '.docx';
                    else if (type.includes('xls')) fileName += '.xlsx';
                    else if (type.includes('zip')) fileName += '.zip';
                    else fileName += '.pdf'; // Default fallback
                  }
                }

                docsFolder?.file(fileName, blob);
                docsAdded++;
              }
            }
          } catch (e) {
            console.warn(`Could not download document ${doc.id}:`, e);
          }
        }

        // Generate and download ZIP
        setExportStatus("Génération du fichier ZIP...");
        const zipBlob = await zip.generateAsync({ type: "blob" });
        const zipUrl = URL.createObjectURL(zipBlob);
        const link = document.createElement('a');
        link.href = zipUrl;
        link.download = `RAPPORT_TECHNIQUE_${project.name.replace(/\s+/g, '_').toUpperCase()}_AVEC_ANNEXES.zip`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(zipUrl);
      } else {
        // Just save PDF
        doc.save(pdfFileName);
      }

      onClose();
    } catch (error) {
      console.error("PDF Generation failed:", error);
      alert("Erreur lors de la génération du rapport professionnel.");
    } finally {
      setIsGenerating(false);
    }
  };

  interface OptionRowProps {
    id: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    color: string;
    checked: boolean;
    onChange: (checked: boolean) => void;
  }

  const OptionRow = ({ id, label, icon: Icon, color, checked, onChange }: OptionRowProps) => (
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
          <h3 className="text-lg font-bold text-gray-900 dark:text-white uppercase tracking-tight">Export Rapport</h3>
        </div>
        <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
          <X className="w-5 h-5 text-gray-500" />
        </button>
      </div>

      <div className="p-6 overflow-y-auto max-h-[60vh] custom-scrollbar">
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 font-medium">
          Générez un document professionnel pour l&apos;ouvrage <span className="text-indigo-600 font-bold">{project.name}</span>.
        </p>

        <div className="space-y-3">
          <OptionRow
            id="lastPhoto" label="Photo de couverture" icon={ImageIcon} color="text-purple-500"
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
            id="documents" label="📦 ZIP avec Annexes (Documents du projet)" icon={Paperclip} color="text-orange-500"
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
              {options.documents && project.documents && project.documents.length > 0
                ? "Générer ZIP avec Annexes"
                : "Générer Rapport PDF"}
            </>
          )}
        </button>
      </div>

      {/* Hidden container for map capture - completely off-screen */}
      <div
        ref={portalRef}
        style={{
          position: 'absolute',
          top: '-9999px',
          left: '-9999px',
          width: '1024px',
          height: '768px',
          overflow: 'hidden',
          pointerEvents: 'none'
        }}
      >
        {captureKey === 'global' ? (
          <div id="pdf-global-map-capture" style={{ width: "1024px", height: "768px" }}>
            <ProjectsMap projects={projectsForMap} isCapture={true} />
          </div>
        ) : captureKey === 'project' ? (
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
        ) : null}
      </div>
    </Dialog>
  );
}
