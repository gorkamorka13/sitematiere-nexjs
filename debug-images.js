const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const images = await prisma.file.findMany({
        where: { fileType: 'IMAGE' },
        take: 5
    });
    console.log('Sample Image URLs:');
    images.forEach(img => console.log(`- ${img.blobUrl}`));
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
