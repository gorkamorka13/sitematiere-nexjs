const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function debugMoaImage() {
  console.log('🔍 Recherche de moa.jpg...\n');

  try {
    // 1. Recherche dans Document
    const docs = await prisma.document.findMany({
      where: {
        OR: [
          { url: { contains: 'moa' } },
          { project: { name: { contains: 'moa', mode: 'insensitive' } } }
        ]
      },
      include: {
        project: { select: { name: true } }
      }
    });

    console.log('📄 Résultats dans Document:');
    docs.forEach(d => {
      console.log(`  - Type: ${d.type}, Project: ${d.project.name}, URL: ${d.url}`);
    });

    // 2. Recherche dans File
    const files = await prisma.file.findMany({
      where: {
        OR: [
          { name: { contains: 'moa', mode: 'insensitive' } },
          { blobUrl: { contains: 'moa' } }
        ]
      },
      include: {
        project: { select: { name: true } }
      }
    });

    console.log('\n📸 Résultats dans File:');
    files.forEach(f => {
      console.log(`  - Name: ${f.name}, Project: ${f.project?.name || 'N/A'}, URL: ${f.blobUrl}`);
    });

    // 3. Vérification Système de fichiers
    const pathsToCheck = [
      'public/images1/client/moa.jpg',
      'public/images1/client/moa.png',
      'public/images/client/moa.jpg',
      'public/images/client/moa.png',
      'public/images1/moa/client_logo.jpg'
    ];

    console.log('\n📁 Vérification Système de fichiers:');
    pathsToCheck.forEach(p => {
      const fullPath = path.join(process.cwd(), p);
      if (fs.existsSync(fullPath)) {
        console.log(`  ✅ EXISTE: ${p}`);
      } else {
        console.log(`  ❌ MANQUE: ${p}`);
      }
    });

  } catch (error) {
    console.error('Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugMoaImage();
