import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  // 0. Get a user for ownerId
  const user = await prisma.user.findFirst()
  if (!user) {
    console.error('No user found in database. Please create a user first.')
    return
  }

  // 1. Create special projects if they don't exist
  const flagProject = await prisma.project.upsert({
    where: { id: 'project-flags' },
    update: {},
    create: {
      id: 'project-flags',
      name: 'Flag',
      country: 'Système',
      type: 'AUTRE',
      status: 'DONE',
      latitude: 0,
      longitude: 0,
      description: 'Dossier spécial pour les drapeaux',
      ownerId: user.id
    }
  })

  const clientProject = await prisma.project.upsert({
    where: { id: 'project-clients' },
    update: {
      name: 'Client',
    },
    create: {
      id: 'project-clients',
      name: 'Client',
      country: 'Système',
      type: 'AUTRE',
      status: 'DONE',
      latitude: 0,
      longitude: 0,
      description: 'Dossier spécial pour les images clients/logos',
      ownerId: user.id
    }
  })

  console.log('Special projects created/verified')

  // 2. Move existing files that likely belong to these folders
  const flagsMoved = await prisma.file.updateMany({
    where: {
      OR: [
        { name: { contains: 'flag', mode: 'insensitive' } },
        { blobPath: { contains: 'flag', mode: 'insensitive' } }
      ],
      projectId: null
    },
    data: {
      projectId: flagProject.id
    }
  })

  const clientsMoved = await prisma.file.updateMany({
    where: {
      OR: [
        { name: { contains: 'client', mode: 'insensitive' } },
        { blobPath: { contains: 'client', mode: 'insensitive' } }
      ],
      projectId: null
    },
    data: {
      projectId: clientProject.id
    }
  })

  console.log(`Moved ${flagsMoved.count} flags and ${clientsMoved.count} clients.`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
