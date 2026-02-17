import { R2_PUBLIC_URL } from "@/lib/constants";

/**
 * Normalizes image URLs to ensure they point to the correct storage location
 * Handles both R2 public URLs and legacy local paths
 */
export function normalizeImageUrl(url: string): string {
    if (!url) return '';

    // If already a full URL (http/https), return as is
    if (url.startsWith('http://') || url.startsWith('https://')) {
        return url;
    }

    // If it's a local path (starts with / or doesn't have protocol)
    // Convert to R2 public URL

    // Remove leading slash if present
    const cleanPath = url.startsWith('/') ? url.substring(1) : url;

    // Return the full R2 URL
    return `${R2_PUBLIC_URL}/${cleanPath}`;
}
