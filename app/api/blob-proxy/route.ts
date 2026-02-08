import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const blobUrl = searchParams.get('url');

  if (!blobUrl) {
    return NextResponse.json({ error: 'Missing blob URL' }, { status: 400 });
  }

  // Validate that it's a Vercel Blob URL
  if (!blobUrl.startsWith('https://') || !blobUrl.includes('blob.vercel-storage.com')) {
    return NextResponse.json({ error: 'Invalid blob URL' }, { status: 400 });
  }

  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    console.error('BLOB_READ_WRITE_TOKEN not configured');
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }

  try {
    // Vercel Blob requires the token as a URL parameter, not as a header
    const signedUrl = `${blobUrl}${blobUrl.includes('?') ? '&' : '?'}token=${token}`;

    // Fetch the blob content with the signed URL
    const response = await fetch(signedUrl);

    if (!response.ok) {
      console.error(`Failed to fetch blob: ${response.status} ${response.statusText}`);
      console.error(`URL attempted: ${blobUrl}`);
      return NextResponse.json(
        { error: 'Failed to fetch blob' },
        { status: response.status }
      );
    }

    // Get the content type from the original response
    const contentType = response.headers.get('content-type') || 'application/octet-stream';
    const blob = await response.blob();

    // Return the blob with proper headers
    return new NextResponse(blob, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    console.error('Error proxying blob:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
