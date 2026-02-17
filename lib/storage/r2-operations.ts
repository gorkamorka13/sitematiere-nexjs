import { PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { r2Client, R2_BUCKET_NAME, R2_PUBLIC_URL } from "./r2-client";

/**
 * Upload a file to Cloudflare R2
 * @param file - File to upload
 * @param key - Storage key (path) for the file
 * @returns Public URL of the uploaded file
 */
export async function uploadToR2(file: File, key: string): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const uint8Array = new Uint8Array(arrayBuffer);

  await r2Client.send(new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
    Body: uint8Array,
    ContentType: file.type,
  }));

  return getFileUrl(key);
}

/**
 * Get the public URL for a file
 * @param key - Storage key of the file
 * @returns Public URL
 */
export function getFileUrl(key: string): string {
  if (R2_PUBLIC_URL) {
    // Encoded parts but keep slashes
    const encodedKey = key.split('/').map(segment => encodeURIComponent(segment)).join('/');
    return `${R2_PUBLIC_URL}/${encodedKey}`;
  }
  // Fallback to API route if no public URL configured
  return `/api/files/serve/${encodeURIComponent(key)}`;
}

/**
 * Delete a file from R2
 * @param key - Storage key of the file to delete
 */
export async function deleteFromR2(key: string): Promise<void> {
  await r2Client.send(new DeleteObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
  }));
}

/**
 * Get a signed URL for temporary access to a private file
 * @param key - Storage key of the file
 * @param expiresIn - Expiration time in seconds (default: 1 hour)
 * @returns Signed URL
 */
export async function getSignedDownloadUrl(key: string, expiresIn = 3600): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
  });
  return await getSignedUrl(r2Client, command, { expiresIn });
}

/**
 * Get a signed URL for uploading a file
 * @param key - Storage key (path) where the file will be stored
 * @param contentType - MIME type of the file
 * @param expiresIn - Expiration time in seconds (default: 1 hour)
 * @returns Signed URL for PUT request
 */
export async function getSignedUploadUrl(key: string, contentType: string, expiresIn = 3600): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
    ContentType: contentType,
  });
  return await getSignedUrl(r2Client, command, { expiresIn });
}

/**
 * Extract the R2 key from a full URL
 * @param url - Full URL (either R2 public URL or API route)
 * @returns Storage key
 */
export function extractKeyFromUrl(url: string): string {
  if (R2_PUBLIC_URL && url.startsWith(R2_PUBLIC_URL)) {
    return url.replace(`${R2_PUBLIC_URL}/`, '');
  }
  // Extract from API route: /api/files/serve/encoded-key
  const match = url.match(/\/api\/files\/serve\/(.+)$/);
  if (match) {
    return decodeURIComponent(match[1]);
  }
  // Fallback: assume it's already a key
  return url;
}
