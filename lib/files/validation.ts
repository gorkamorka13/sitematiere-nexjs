// Maximum file size: 10Mo
export const MAX_FILE_SIZE = 10 * 1024 * 1024;

export const ALLOWED_FILE_TYPES = {
  // Images
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/webp': ['.webp'],
  'image/gif': ['.gif'],

  // Documents
  'application/pdf': ['.pdf'],
  'application/msword': ['.doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'application/vnd.ms-excel': ['.xls'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],

  // Videos
  'video/mp4': ['.mp4'],
  'video/webm': ['.webm'],

  // Archives
  'application/zip': ['.zip'],
  'application/x-rar-compressed': ['.rar'],
};

export type AllowedMimeType = keyof typeof ALLOWED_FILE_TYPES;

/**
 * Validate file size
 */
export function validateFileSize(size: number): { valid: boolean; error?: string } {
  if (size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `La taille du fichier ne doit pas dépasser ${MAX_FILE_SIZE / 1024}Ko.`
    };
  }
  return { valid: true };
}

/**
 * Validate file type
 */
export function validateFileType(mimeType: string, fileName: string): { valid: boolean; error?: string } {
  const allowedExtensions = ALLOWED_FILE_TYPES[mimeType as AllowedMimeType];

  if (!allowedExtensions) {
    return {
      valid: false,
      error: `Type de fichier non supporté: ${mimeType}`
    };
  }

  const ext = fileName.slice(fileName.lastIndexOf('.')).toLowerCase();
  if (!allowedExtensions.includes(ext)) {
    return {
      valid: false,
      error: `L'extension ${ext} ne correspond pas au type MIME ${mimeType}`
    };
  }

  return { valid: true };
}

/**
 * Sanitize file name to be safe for file systems and URLs
 */
export function sanitizeFileName(fileName: string): string {
  // Remove non-ascii chars, replace spaces with underscores, remove special chars
  // Keep only alphanumeric, dots, underscores and hyphens
  const lastDotIndex = fileName.lastIndexOf('.');
  const name = lastDotIndex > 0 ? fileName.slice(0, lastDotIndex) : fileName;
  const ext = lastDotIndex > 0 ? fileName.slice(lastDotIndex) : '';

  const sanitizedName = name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[^a-z0-9]/g, '_')       // Replace non-alphanum with underscore
    .replace(/_+/g, '_');             // Remove duplicate underscores

  return `${sanitizedName}${ext.toLowerCase()}`;
}
