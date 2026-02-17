import 'server-only';

import { uploadToR2, deleteFromR2 } from '../storage/r2-operations';
import sharp from 'sharp';
import { FileType } from '@prisma/client';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import os from 'os';

const execAsync = promisify(exec);

export interface UploadResult {
  url: string;
  pathname: string;
  contentType: string;
}

/**
 * Upload a file to Cloudflare R2
 */
export async function uploadFile(
  file: File,
  projectFolderName: string
): Promise<UploadResult> {
  const filename = `${projectFolderName}/${crypto.randomUUID()}-${file.name}`;

  const url = await uploadToR2(file, filename);

  return {
    url,
    pathname: filename,
    contentType: file.type,
  };
}

/**
 * Delete a file from Cloudflare R2
 */
export async function deleteFile(key: string): Promise<void> {
  await deleteFromR2(key);
}

/**
 * Generate a thumbnail for an image using Sharp
 */
export async function generateThumbnail(fileBuffer: Buffer): Promise<Buffer> {
  return await sharp(fileBuffer)
    .resize(200, 200, {
      fit: 'cover',
      position: 'center'
    })
    .jpeg({ quality: 80 })
    .toBuffer();
}

/**
 * Generate a thumbnail for a video using ffmpeg
 * Note: Requires ffmpeg to be installed on the system
 */
export async function generateVideoThumbnail(fileBuffer: Buffer): Promise<Buffer> {
  const tempDir = os.tmpdir();
  const inputPath = path.join(tempDir, `input-${Date.now()}.mp4`);
  const outputPath = path.join(tempDir, `output-${Date.now()}.jpg`);

  try {
    // Write buffer to temp file because ffmpeg needs a file path
    fs.writeFileSync(inputPath, fileBuffer);

    // Use ffmpeg directly via child_process
    const ffmpegCommand = `ffmpeg -i "${inputPath}" -ss 00:00:01 -vframes 1 -s 200x200 "${outputPath}"`;
    await execAsync(ffmpegCommand);

    // Read the generated thumbnail
    const thumbnailBuffer = fs.readFileSync(outputPath);
    return thumbnailBuffer;
  } finally {
    // Cleanup temp files
    if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
    if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
  }
}

/**
 * Helper to determine Prisma FileType from MIME type
 */
export function getFileTypeFromMime(mimeType: string): FileType {
  if (mimeType.startsWith('image/')) return FileType.IMAGE;
  if (mimeType.startsWith('video/')) return FileType.VIDEO;
  if (mimeType.startsWith('audio/')) return FileType.AUDIO;
  if (mimeType === 'application/pdf') return FileType.DOCUMENT;
  if (['application/zip', 'application/x-rar-compressed'].includes(mimeType)) return FileType.ARCHIVE;
  return FileType.OTHER;
}
