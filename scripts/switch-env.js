#!/usr/bin/env node

/**
 * Script pour switcher entre mode LOCAL et mode PRODUCTION (Cloudflare)
 * 
 * Usage:
 *   node scripts/switch-env.js local    -> Configure pour le développement local
 *   node scripts/switch-env.js prod     -> Configure pour Cloudflare Pages
 *   node scripts/switch-env.js          -> Mode interactif
 */

const { PrismaClient } = require('@prisma/client');
const readline = require('readline');

const prisma = new PrismaClient();

const CONFIG = {
  local: {
    baseUrl: 'http://localhost:3000',
    name: 'LOCAL (Développement)',
    description: 'URLs pointant vers localhost:3000'
  },
  prod: {
    baseUrl: 'https://sitematiere-nexjs.pages.dev',
    name: 'PRODUCTION (Cloudflare)',
    description: 'URLs pointant vers sitematiere-nexjs.pages.dev'
  }
};

async function updateUrls(targetEnv) {
  const targetConfig = CONFIG[targetEnv];
  const otherEnv = targetEnv === 'local' ? 'prod' : 'local';
  const otherConfig = CONFIG[otherEnv];
  
  console.log(`\n🔄 Mise à jour pour l'environnement: ${targetConfig.name}`);
  console.log(`   ${targetConfig.description}\n`);
  
  // Chercher les URLs qui ne sont pas déjà dans le bon format
  const files = await prisma.file.findMany({
    where: {
      OR: [
        { blobUrl: { startsWith: otherConfig.baseUrl } },
        { blobUrl: { startsWith: '/api/' } }
      ]
    }
  });
  
  console.log(`📁 ${files.length} fichiers à mettre à jour\n`);
  
  if (files.length === 0) {
    console.log('✅ Aucune mise à jour nécessaire. Les URLs sont déjà correctes.\n');
    return;
  }
  
  let updatedCount = 0;
  
  for (const file of files) {
    let newUrl;
    
    if (file.blobUrl.startsWith(otherConfig.baseUrl)) {
      // Remplacer l'ancienne URL
      newUrl = file.blobUrl.replace(otherConfig.baseUrl, targetConfig.baseUrl);
    } else if (file.blobUrl.startsWith('/api/')) {
      // Ajouter le baseUrl si c'est une URL relative
      newUrl = `${targetConfig.baseUrl}${file.blobUrl}`;
    } else {
      // Ignorer les URLs déjà correctes
      continue;
    }
    
    await prisma.file.update({
      where: { id: file.id },
      data: { blobUrl: newUrl }
    });
    
    updatedCount++;
    console.log(`  ✓ ${file.name || file.id}`);
    console.log(`    ${file.blobUrl.substring(0, 60)}...`);
    console.log(`    → ${newUrl.substring(0, 60)}...\n`);
  }
  
  console.log(`✅ ${updatedCount} fichiers mis à jour avec succès !\n`);
}

async function showStatus() {
  console.log('\n📊 État actuel de la base de données:\n');
  
  const localCount = await prisma.file.count({
    where: { blobUrl: { startsWith: CONFIG.local.baseUrl } }
  });
  
  const prodCount = await prisma.file.count({
    where: { blobUrl: { startsWith: CONFIG.prod.baseUrl } }
  });
  
  const relativeCount = await prisma.file.count({
    where: { 
      AND: [
        { blobUrl: { startsWith: '/api/' } },
        { blobUrl: { not: { startsWith: 'http' } } }
      ]
    }
  });
  
  const totalCount = await prisma.file.count();
  
  console.log(`  🏠 Local (localhost:3000):     ${localCount} fichiers`);
  console.log(`  🌐 Production (Cloudflare):    ${prodCount} fichiers`);
  console.log(`  📍 URLs relatives:              ${relativeCount} fichiers`);
  console.log(`  ─────────────────────────────────`);
  console.log(`  📁 Total:                       ${totalCount} fichiers\n`);
  
  if (localCount > prodCount && localCount > relativeCount) {
    console.log('  👉 Environnement actuel: LOCAL\n');
  } else if (prodCount > localCount && prodCount > relativeCount) {
    console.log('  👉 Environnement actuel: PRODUCTION\n');
  } else {
    console.log('  👉 Environnement: MIXTE ou NON CONFIGURÉ\n');
  }
}

function askQuestion(query) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  return new Promise(resolve => {
    rl.question(query, answer => {
      rl.close();
      resolve(answer.trim().toLowerCase());
    });
  });
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  console.log('\n╔═══════════════════════════════════════════════════╗');
  console.log('║   Switcher d\'environnement - Site Matière        ║');
  console.log('╚═══════════════════════════════════════════════════╝\n');
  
  try {
    if (command === 'local' || command === 'dev') {
      await updateUrls('local');
    } else if (command === 'prod' || command === 'production') {
      await updateUrls('prod');
    } else if (command === 'status' || command === 's') {
      await showStatus();
    } else {
      // Mode interactif
      console.log('Options disponibles:\n');
      console.log('  1. 🏠 LOCAL     - URLs: http://localhost:3000');
      console.log('  2. 🌐 PROD      - URLs: https://sitematiere-nexjs.pages.dev');
      console.log('  3. 📊 STATUS    - Voir l\'état actuel\n');
      
      const answer = await askQuestion('Choisissez (1, 2 ou 3): ');
      
      if (answer === '1' || answer === 'local' || answer === 'l') {
        await updateUrls('local');
      } else if (answer === '2' || answer === 'prod' || answer === 'p') {
        await updateUrls('prod');
      } else if (answer === '3' || answer === 'status' || answer === 's') {
        await showStatus();
      } else {
        console.log('\n❌ Option invalide. Utilisation:');
        console.log('   node scripts/switch-env.js local     -> Mode local');
        console.log('   node scripts/switch-env.js prod      -> Mode production');
        console.log('   node scripts/switch-env.js status    -> Voir l\'état\n');
      }
    }
  } catch (error) {
    console.error('\n❌ Erreur:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
