/**
 * Utility to convert Vercel Blob URLs to signed URLs by appending the token
 * This is necessary because blobs return 403 without proper authentication
 */
export function getSignedBlobUrl(url: string | undefined): string {
  if (!url) return '';

  // If it's not a Vercel Blob URL, return as-is
  if (!url.includes('blob.vercel-storage.com')) {
    return url.startsWith('http') ? url : `/${url}`;
  }

  // For Vercel Blob URLs, we need to use the API proxy
  // because we can't expose the token in client-side code
  return `/api/blob-proxy?url=${encodeURIComponent(url)}`;
}
