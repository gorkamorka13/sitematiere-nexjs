import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function checkUrls() {
  console.log("--- Images ---");
  const images = await prisma.image.findMany({ take: 5 });
  images.forEach(img => console.log(`[Image] ID: ${img.id}, URL: ${img.url}`));

  console.log("\n--- Documents ---");
  const documents = await prisma.document.findMany({ take: 5 });
  documents.forEach(doc => console.log(`[Document] ID: ${doc.id}, Name: ${doc.name}, URL: ${doc.url}`));

  console.log("\n--- Videos ---");
  const videos = await prisma.video.findMany({ take: 5 });
  videos.forEach(vid => console.log(`[Video] ID: ${vid.id}, URL: ${vid.url}`));
}

checkUrls()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
