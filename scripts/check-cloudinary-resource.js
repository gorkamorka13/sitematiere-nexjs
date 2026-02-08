const cloudinary = require('cloudinary').v2;
const path = require('path');
const envPath = path.join(__dirname, '../.env');
require('dotenv').config({ path: envPath });

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

async function checkResource() {
  const publicId = 'sitematiere/projects/magbele/magbele';
  console.log(`🔍 Vérification de la ressource: ${publicId}\n`);

  try {
    // Essayer de le trouver en tant qu'image (PDF as Image)
    console.log('--- Test en tant qu\'IMAGE ---');
    try {
      const imgInfo = await cloudinary.api.resource(publicId, { resource_type: 'image' });
      console.log('✅ Trouvé en tant qu\'IMAGE:');
      console.log(`   URL: ${imgInfo.secure_url}`);
      console.log(`   Format: ${imgInfo.format}`);
      console.log(`   Type: ${imgInfo.type}`);
    } catch (e) {
      console.log(`   ❌ Non trouvé en tant qu'IMAGE: ${e.message}`);
    }

    // Essayer de le trouver en tant que RAW
    console.log('\n--- Test en tant que RAW ---');
    try {
      const rawInfo = await cloudinary.api.resource(publicId + '.pdf', { resource_type: 'raw' });
      console.log('✅ Trouvé en tant que RAW:');
      console.log(`   URL: ${rawInfo.secure_url}`);
      console.log(`   Type: ${rawInfo.type}`);
    } catch (e) {
      console.log(`   ❌ Non trouvé en tant que RAW: ${e.message}`);
    }

  } catch (error) {
    console.error('Erreur générale:', error);
  }
}

checkResource();
