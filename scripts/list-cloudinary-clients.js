const cloudinary = require('cloudinary').v2;
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });


cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

async function listClients() {
  console.log('☁️  Listing Cloudinary client logos...\n');
  try {
    const result = await cloudinary.api.resources({
      type: 'upload',
      prefix: 'sitematiere/clients/',
      max_results: 100
    });

    result.resources.forEach(res => {
      console.log(`- ${res.public_id} (${res.secure_url})`);
    });

    if (result.resources.length === 0) {
      console.log('Aucun logo trouvé dans sitematiere/clients/');
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

listClients();
