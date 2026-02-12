import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const projects = await prisma.project.findMany({
    where: {
      name: { in: ['Flag', 'client'], mode: 'insensitive' }
    }
  })
  console.log('Projects:', JSON.stringify(projects, null, 2))

  const files = await prisma.file.findMany({
    where: {
      OR: [
        { name: { contains: 'flag', mode: 'insensitive' } },
        { name: { contains: 'client', mode: 'insensitive' } }
      ]
    },
    take: 5
  })
  console.log('Files:', JSON.stringify(files, null, 2))
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
