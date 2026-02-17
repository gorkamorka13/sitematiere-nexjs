import { NextRequest, NextResponse } from 'next/server';

/**
 * API route to generate signed URLs for Cloudflare R2 assets
 * This is necessary because blobs uploaded with access:'public' still return 403
 * due to store configuration. We need to append a token to make them accessible.
 */
// export const runtime = 'edge'; // Commenté pour le dev local
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const blobUrl = searchParams.get('url');

  if (!blobUrl) {
    return NextResponse.json({ error: 'Missing blob URL' }, { status: 400 });
  }

  // Validate that it's a Cloudflare R2 or legacy storage URL
  if (!blobUrl.startsWith('https://') || (!blobUrl.includes('blob.vercel-storage.com') && !blobUrl.includes('r2.cloudflarestorage.com'))) {
    return NextResponse.json({ error: 'Invalid blob URL' }, { status: 400 });
  }

  try {
    // For storage, we need to append the token as a query parameter
    // The format is: original_url?token=BLOB_READ_WRITE_TOKEN
    const token = process.env.BLOB_READ_WRITE_TOKEN;

    if (!token) {
      console.error('BLOB_READ_WRITE_TOKEN not configured');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    // Create signed URL by appending token
    const signedUrl = `${blobUrl}${blobUrl.includes('?') ? '&' : '?'}token=${token}`;

    // Return the signed URL as JSON
    return NextResponse.json({ signedUrl });

  } catch (error) {
    console.error('Error generating signed URL:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
