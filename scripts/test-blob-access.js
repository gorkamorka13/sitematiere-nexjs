const { head } = require('@vercel/blob');

async function testBlobAccess() {
  const testUrl = 'https://l1nmqms7zjmviefs.public.blob.vercel-storage.com/flags/cmlb0ds420002vo5084soqeuh-flag.png';

  console.log('Testing blob access...');
  console.log('URL:', testUrl);

  try {
    // Test with head to get metadata
    const metadata = await head(testUrl);
    console.log('\n✅ Blob metadata:', metadata);
  } catch (error) {
    console.error('\n❌ Error accessing blob:', error.message);
  }

  // Test direct fetch without auth
  try {
    const response = await fetch(testUrl);
    console.log(`\nDirect fetch (no auth): ${response.status} ${response.statusText}`);
  } catch (error) {
    console.error('\nDirect fetch error:', error.message);
  }

  // Test fetch with token
  try {
    const response = await fetch(testUrl, {
      headers: {
        'Authorization': `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}`
      }
    });
    console.log(`\nFetch with token: ${response.status} ${response.statusText}`);
  } catch (error) {
    console.error('\nFetch with token error:', error.message);
  }
}

testBlobAccess()
  .catch(console.error);
