#!/usr/bin/env node
/**
 * Script de migration Phase 0
 * Migre les fichiers de public/images/ vers Vercel Blob
 * 
 * Usage: node scripts/migrate-to-blob.js
 */

const fs = require('fs');
const path = require('path');
const { put } = require('@vercel/blob');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Configuration
const IMAGES_DIR = path.join(process.cwd(), 'public', 'images');
const BATCH_SIZE = 10; // Nombre de fichiers uploadés en parallèle
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100 Mo (pas de limite stricte)

// Types MIME supportés
const MIME_TYPES = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.pdf': 'application/pdf',
  '.mp4': 'video/mp4',
  '.mov': 'video/quicktime',
  '.mp3': 'audio/mpeg',
  '.zip': 'application/zip',
};

// Mapping dossier → projet
async function getProjectMapping() {
  const projects = await prisma.project.findMany({
    select: { id: true, name: true }
  });
  
  const mapping = {};
  projects.forEach(project => {
    // Normaliser le nom pour matcher les dossiers
    const normalizedName = project.name.toLowerCase().replace(/\s+/g, '');
    mapping[normalizedName] = project.id;
  });
  
  return mapping;
}

// Détecter le type de fichier
function getFileType(ext) {
  const imageExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
  const videoExts = ['.mp4', '.mov'];
  const audioExts = ['.mp3'];
  const archiveExts = ['.zip'];
  
  if (imageExts.includes(ext)) return 'IMAGE';
  if (ext === '.pdf') return 'DOCUMENT';
  if (videoExts.includes(ext)) return 'VIDEO';
  if (audioExts.includes(ext)) return 'AUDIO';
  if (archiveExts.includes(ext)) return 'ARCHIVE';
  return 'OTHER';
}

// Scanner récursivement les fichiers
async function scanFiles(dir, projectMapping, basePath = '') {
  const files = [];
  
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relativePath = path.join(basePath, entry.name);
      
      if (entry.isDirectory()) {
        // Récursion dans les sous-dossiers
        const subFiles = await scanFiles(fullPath, projectMapping, relativePath);
        files.push(...subFiles);
      } else {
        // Déterminer le projet associé
        const dirName = basePath.split(path.sep)[0].toLowerCase();
        const projectId = projectMapping[dirName] || null;
        
        const stat = fs.statSync(fullPath);
        const ext = path.extname(entry.name).toLowerCase();
        
        files.push({
          name: entry.name,
          path: fullPath,
          relativePath: relativePath,
          size: stat.size,
          ext: ext,
          mimeType: MIME_TYPES[ext] || 'application/octet-stream',
          fileType: getFileType(ext),
          projectId: projectId,
          dirName: dirName
        });
      }
    }
  } catch (error) {
    console.error(`Erreur lecture dossier ${dir}:`, error.message);
  }
  
  return files;
}

// Upload un fichier vers Vercel Blob
async function uploadToBlob(file, projectId) {
  try {
    // Vérifier taille
    if (file.size > MAX_FILE_SIZE) {
      return {
        success: false,
        error: `Fichier trop grand (${(file.size / 1024).toFixed(1)} Ko > 150 Ko)`
      };
    }
    
    // Lire le fichier
    const buffer = fs.readFileSync(file.path);
    
    // Générer UUID pour le nom sur Blob
    const uuid = require('crypto').randomUUID();
    const blobName = projectId 
      ? `${projectId}/${uuid}${file.ext}`
      : `unmapped/${uuid}${file.ext}`;
    
    // Upload
    const blob = await put(blobName, buffer, {
      access: 'public',
      contentType: file.mimeType,
    });
    
    return {
      success: true,
      blobUrl: blob.url,
      blobPath: blobName,
      size: file.size
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

// Créer entrée en BDD
async function createFileRecord(file, uploadResult) {
  try {
    const data = {
      name: file.name,
      blobUrl: uploadResult.blobUrl,
      blobPath: uploadResult.blobPath,
      fileType: file.fileType,
      mimeType: file.mimeType,
      size: file.size,
    };
    
    // N'ajouter projectId que si un projet est trouvé
    if (file.projectId) {
      data.projectId = file.projectId;
    }
    
    const fileRecord = await prisma.file.create({ data });
    
    return { success: true, record: fileRecord };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Migration principale
async function migrate() {
  console.log('🚀 Démarrage migration Phase 0');
  console.log('═══════════════════════════════════════\n');
  
  try {
    // 1. Récupérer mapping projets
    console.log('📋 Chargement des projets...');
    const projectMapping = await getProjectMapping();
    console.log(`   ${Object.keys(projectMapping).length} projets trouvés\n`);
    
    // 2. Scanner les fichiers
    console.log('🔍 Scan des fichiers...');
    const files = await scanFiles(IMAGES_DIR, projectMapping);
    console.log(`   ${files.length} fichiers trouvés\n`);
    
    // Statistiques
    const stats = {
      total: files.length,
      uploaded: 0,
      failed: 0,
      skipped: 0,
      byType: {},
      byProject: {}
    };
    
    // 3. Traiter par lots
    console.log('📤 Upload vers Vercel Blob...');
    console.log(`   Traitement par lots de ${BATCH_SIZE} fichiers\n`);
    
    for (let i = 0; i < files.length; i += BATCH_SIZE) {
      const batch = files.slice(i, i + BATCH_SIZE);
      const batchNum = Math.floor(i / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(files.length / BATCH_SIZE);
      
      console.log(`\n📦 Lot ${batchNum}/${totalBatches}`);
      
      for (const file of batch) {
        process.stdout.write(`   ${file.relativePath} ... `);
        
        // Upload
        const uploadResult = await uploadToBlob(file, file.projectId);
        
        if (!uploadResult.success) {
          console.log(`❌ ${uploadResult.error}`);
          stats.failed++;
          continue;
        }
        
        // Créer entrée BDD
        const dbResult = await createFileRecord(file, uploadResult);
        
        if (!dbResult.success) {
          console.log(`❌ BDD: ${dbResult.error}`);
          stats.failed++;
          continue;
        }
        
        console.log(`✅`);
        stats.uploaded++;
        
        // Stats par type
        stats.byType[file.fileType] = (stats.byType[file.fileType] || 0) + 1;
        
        // Stats par projet
        if (file.projectId) {
          stats.byProject[file.dirName] = (stats.byProject[file.dirName] || 0) + 1;
        }
      }
    }
    
    // 4. Rapport final
    console.log('\n\n═══════════════════════════════════════');
    console.log('📊 RAPPORT DE MIGRATION');
    console.log('═══════════════════════════════════════');
    console.log(`Total fichiers:    ${stats.total}`);
    console.log(`Uploadés:          ${stats.uploaded} ✅`);
    console.log(`Échecs:            ${stats.failed} ❌`);
    console.log(`\nPar type:`);
    Object.entries(stats.byType).forEach(([type, count]) => {
      console.log(`  ${type}: ${count}`);
    });
    console.log(`\nPar projet (top 10):`);
    Object.entries(stats.byProject)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .forEach(([project, count]) => {
        console.log(`  ${project}: ${count}`);
      });
    
    // Sauvegarder rapport
    const report = {
      date: new Date().toISOString(),
      stats: stats,
      files: files.map(f => ({
        name: f.name,
        project: f.dirName,
        size: f.size,
        type: f.fileType
      }))
    };
    
    fs.writeFileSync(
      path.join(process.cwd(), 'migration-report.json'),
      JSON.stringify(report, null, 2)
    );
    
    console.log('\n💾 Rapport sauvegardé dans migration-report.json');
    console.log('\n✅ Migration terminée !');
    
  } catch (error) {
    console.error('\n❌ Erreur fatale:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Vérifier token Vercel Blob
if (!process.env.BLOB_READ_WRITE_TOKEN) {
  console.error('❌ Erreur: BLOB_READ_WRITE_TOKEN non défini');
  console.log('   Ajoutez-le dans votre fichier .env.local');
  process.exit(1);
}

// Lancer migration
migrate();
