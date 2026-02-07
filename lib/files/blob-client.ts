import { put, del, list } from '@vercel/blob';
import sharp from 'sharp';
import { FileType } from '@prisma/client';
import ffmpeg from 'fluent-ffmpeg';
import fs from 'fs';
import path from 'path';
import os from 'os';

export interface UploadResult {
  url: string;
  pathname: string;
  contentType: string;
}

/**
 * Upload a file to Vercel Blob
 */
export async function uploadFile(
  file: File,
  projectFolderName: string
): Promise<UploadResult> {
  const filename = `${projectFolderName}/${crypto.randomUUID()}-${file.name}`;

  const blob = await put(filename, file, {
    access: 'public',
  });

  return {
    url: blob.url,
    pathname: blob.pathname,
    contentType: blob.contentType,
  };
}

/**
 * Delete a file from Vercel Blob
 */
export async function deleteFile(url: string): Promise<void> {
  await del(url);
}

/**
 * List files in Vercel Blob (useful for admin/debug)
 */
export async function listFiles(prefix?: string) {
  const { blobs } = await list({ prefix });
  return blobs;
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
 * Generate a thumbnail for a video using fluent-ffmpeg
 * Note: Requires ffmpeg to be installed on the system
 */
export async function generateVideoThumbnail(fileBuffer: Buffer): Promise<Buffer> {
  const tempDir = os.tmpdir();
  const inputPath = path.join(tempDir, `input-${Date.now()}.mp4`);
  const outputPath = path.join(tempDir, `output-${Date.now()}.jpg`);

  try {
    // Write buffer to temp file because ffmpeg needs a file path
    fs.writeFileSync(inputPath, fileBuffer);

    await new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .screenshots({
          timestamps: ['1'], // Capture at 1 second
          filename: path.basename(outputPath),
          folder: tempDir,
          size: '200x200'
        })
        .on('end', resolve)
        .on('error', reject);
    });

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
