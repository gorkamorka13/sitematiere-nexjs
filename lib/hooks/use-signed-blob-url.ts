'use client';

import { useEffect, useState } from 'react';

/**
 * Hook to convert Vercel Blob URLs to signed URLs that can be accessed by the browser
 */
export function useSignedBlobUrl(blobUrl: string | undefined): string {
  const [signedUrl, setSignedUrl] = useState<string>('');

  useEffect(() => {
    if (!blobUrl) {
      setSignedUrl('');
      return;
    }

    // If it's not a Vercel Blob URL, return as-is
    if (!blobUrl.includes('blob.vercel-storage.com')) {
      setSignedUrl(blobUrl);
      return;
    }

    // If it's a Vercel Blob URL, get the signed version
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
