import { FileType } from '@/lib/db/schema';

export interface UploadResult {
  url: string;
  pathname: string;
  contentType: string;
}

/**
 * Upload a file to Cloudflare R2
 * Edge Runtime compatible - no Node.js modules
 */
export async function uploadFile(
  file: File,
  projectFolderName: string
): Promise<UploadResult> {
  const filename = `${projectFolderName}/${crypto.randomUUID()}-${file.name}`;
  
  // Import dynamically to avoid bundling Node.js modules in Edge
  const { uploadToR2 } = await import('../storage/r2-operations');
  const url = await uploadToR2(file, filename);

  return {
    url,
    pathname: filename,
    contentType: file.type,
  };
}

/**
 * Delete a file from Cloudflare R2
 * Edge Runtime compatible
 */
export async function deleteFile(key: string): Promise<void> {
  const { deleteFromR2 } = await import('../storage/r2-operations');
  await deleteFromR2(key);
}

/**
 * Helper to determine Prisma FileType from MIME type
 * Edge Runtime compatible
 */
export function getFileTypeFromMime(mimeType: string): FileType {
  if (mimeType.startsWith('image/')) return FileType.IMAGE;
  if (mimeType.startsWith('video/')) return FileType.VIDEO;
  if (mimeType.startsWith('audio/')) return FileType.AUDIO;
  if (mimeType === 'application/pdf') return FileType.DOCUMENT;
  if (['application/zip', 'application/x-rar-compressed'].includes(mimeType)) return FileType.ARCHIVE;
  return FileType.OTHER;
}
