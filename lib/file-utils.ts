// Helper to normalize file URLs
export function getFileUrl(blobUrl: string | null): string {
  if (!blobUrl) return '';
  
  // If already absolute URL, return as-is
  if (blobUrl.startsWith('http')) {
    return blobUrl;
  }
  
  // If relative URL starting with /, prepend the base URL
  if (blobUrl.startsWith('/')) {
    return `${process.env.NEXT_PUBLIC_APP_URL || ''}${blobUrl}`;
  }
  
  return blobUrl;
}
