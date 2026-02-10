const https = require('https');

const urls = [
  'https://res.cloudinary.com/dklzpatsp/image/upload/v1770501898/sitematiere/projects/magbele/magbele.pdf',
  'https://res.cloudinary.com/dklzpatsp/raw/upload/v1770505216/sitematiere/projects/magbele/magbele.pdf'
];

urls.forEach(url => {
  https.get(url, (res) => {
    console.log(`URL: ${url}`);
    console.log(`Status Code: ${res.statusCode}`);
    console.log('---');
  }).on('error', (e) => {
    console.error(`Error fetching ${url}: ${e.message}`);
  });
});
