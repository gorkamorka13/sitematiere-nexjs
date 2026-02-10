const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function listAllLogos() {
  console.log('📋 Liste de tous les logos clients...\n');

  try {
    const docs = await prisma.document.findMany({
      where: { type: 'CLIENT_LOGO' },
      include: { project: { select: { name: true, client: true } } }
    });

    docs.forEach(d => {
      console.log(`Project: ${d.project.name} | Client: ${d.project.client || 'N/A'} | URL: ${d.url}`);
    });

  } catch (error) {
    console.error('Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

listAllLogos();
