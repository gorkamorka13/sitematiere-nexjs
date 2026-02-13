/**
 * Utility to convert Cloudflare R2 URLs to signed URLs by appending the token
 * This is necessary because blobs return 403 without proper authentication
 */
export function getSignedBlobUrl(url: string | undefined): string {
  if (!url) return '';

  // If it's not a storage URL, return as-is
  if (!url.includes('blob.vercel-storage.com') && !url.includes('r2.cloudflarestorage.com')) {
    return url.startsWith('http') ? url : `/${url}`;
  }

  // For storage URLs, we need to use the API proxy
  // because we can't expose the token in client-side code
  return `/api/blob-proxy?url=${encodeURIComponent(url)}`;
}
