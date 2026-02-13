'use client';

import { useEffect, useState } from 'react';

/**
 * Hook to convert Cloudflare R2 URLs to signed URLs that can be accessed by the browser
 */
export function useSignedBlobUrl(blobUrl: string | undefined): string {
  const [signedUrl, setSignedUrl] = useState<string>('');

  useEffect(() => {
    if (!blobUrl) {
      setSignedUrl('');
      return;
    }

    // If it's not a storage URL, return as-is
    if (!blobUrl.includes('blob.vercel-storage.com') && !blobUrl.includes('r2.cloudflarestorage.com')) {
      setSignedUrl(blobUrl);
      return;
    }

    // If it's not a Cloudflare or legacy URL, return as-is
    fetch(`/api/blob-url?url=${encodeURIComponent(blobUrl)}`)
      .then(res => res.json())
      .then(data => {
        if (data.signedUrl) {
          setSignedUrl(data.signedUrl);
        } else {
          console.error('Failed to get signed URL');
          setSignedUrl(blobUrl); // Fallback to original
        }
      })
      .catch(err => {
        console.error('Error fetching signed URL:', err);
        setSignedUrl(blobUrl); // Fallback to original
      });
  }, [blobUrl]);

  return signedUrl;
}
