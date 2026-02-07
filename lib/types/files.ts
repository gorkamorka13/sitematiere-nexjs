/**
 * Types pour la gestion des fichiers
 * Phase 1 - Setup & Configuration
 */

import { FileType } from "@prisma/client";

// ==================== TYPES DE BASE ====================

export interface FileItem {
  id: string;
  name: string;
  blobUrl: string;
  blobPath: string;
  fileType: FileType;
  mimeType: string;
  size: number;
  projectId: string | null;
  thumbnailUrl?: string | null;
  width?: number | null;
  height?: number | null;
  duration?: number | null;
  isDeleted: boolean;
  deletedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface UploadResult {
  success: boolean;
  file?: FileItem;
  error?: string;
}

export interface UploadedFile {
  id: string;
  name: string;
  blobUrl: string;
  thumbnailUrl?: string;
  size: number;
}

export interface UploadError {
  file: string;
  error: string;
}

// ==================== API REQUESTS/RESPONSES ====================

export interface UploadRequest {
  projectId: string;
  files: File[];
}

export interface UploadResponse {
  success: boolean;
  files: UploadedFile[];
  errors: UploadError[];
}

export interface ListFilesRequest {
  projectId?: string;
  fileType?: FileType | 'ALL';
  includeDeleted?: boolean;
  page?: number;
  limit?: number;
  sortBy?: 'name' | 'date' | 'size';
  order?: 'asc' | 'desc';
}

export interface ListFilesResponse {
  files: FileItem[];
  total: number;
  hasMore: boolean;
  page: number;
  limit: number;
}

export interface DeleteRequest {
  fileIds: string[];
  permanent?: boolean;
}

export interface DeleteResponse {
  success: boolean;
  deleted: string[];
  errors: { fileId: string; error: string }[];
}

export interface RestoreRequest {
  fileIds: string[];
}

export interface RestoreResponse {
  success: boolean;
  restored: string[];
  errors: { fileId: string; error: string }[];
}

export interface RenameRequest {
  fileId: string;
  newName: string;
}

export interface RenameResponse {
  success: boolean;
  file?: FileItem;
  error?: string;
}

export interface HistoryRequest {
  projectId?: string;
  action?: 'CREATE' | 'DELETE' | 'RENAME' | 'RESTORE';
  limit?: number;
}

export interface FileHistoryItem {
  id: string;
  fileId: string;
  fileName: string;
  action: string;
  projectId: string | null;
  userId: string | null;
  createdAt: Date;
}

export interface HistoryResponse {
  history: FileHistoryItem[];
  total: number;
}

// ==================== FRONTEND TYPES ====================

export interface FileExplorerState {
  files: FileItem[];
  selectedFiles: string[];
  viewMode: 'grid' | 'list';
  currentProject: { id: string; name: string } | null;
  filter: {
    type: 'all' | FileType;
    search: string;
  };
  isLoading: boolean;
  isUploading: boolean;
  uploadProgress: Map<string, number>;
  page: number;
  hasMore: boolean;
}

export interface UploadFile {
  id: string;
  file: globalThis.File;
  name: string;
  size: number;
  progress: number;
  status: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
}

export interface FileStats {
  totalImages: number;
  totalPdfs: number;
  totalVideos: number;
  totalOther: number;
  storageUsed: string;
  totalProjects: number;
  lastScan: string;
}

// ==================== BLOB TYPES ====================

export interface BlobItem {
  url: string;
  pathname: string;
  size: number;
  uploadedAt: Date;
}

export interface BlobUploadOptions {
  access: 'public';
  contentType?: string;
}

// ==================== VALIDATION TYPES ====================

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export interface FileValidationOptions {
  maxSize?: number;
  allowedTypes?: string[];
  allowedExtensions?: string[];
}

// ==================== COMPONENT PROPS ====================

export interface FileUploadZoneProps {
  onFilesSelected: (files: globalThis.File[]) => void;
  maxFileSize?: number;
  acceptedTypes?: string;
  disabled?: boolean;
}

export interface FileUploadProgressProps {
  uploads: UploadFile[];
  onCancel: (id: string) => void;
  onRetry: (id: string) => void;
}

export interface FileGridProps {
  files: FileItem[];
  selectedFiles: string[];
  onSelect: (fileId: string, multi: boolean) => void;
  onDoubleClick: (file: FileItem) => void;
  onContextMenu: (e: React.MouseEvent, file: FileItem) => void;
}

export interface FileListProps {
  files: FileItem[];
  selectedFiles: string[];
  onSelect: (fileId: string, multi: boolean) => void;
  onDoubleClick: (file: FileItem) => void;
  onSort: (column: string, order: 'asc' | 'desc') => void;
}

export interface FileContextMenuProps {
  x: number;
  y: number;
  file: FileItem | null;
  onClose: () => void;
  onRename: (file: FileItem) => void;
  onDelete: (file: FileItem) => void;
  onDownload: (file: FileItem) => void;
  onPreview: (file: FileItem) => void;
}

export interface FilePreviewModalProps {
  file: FileItem | null;
  isOpen: boolean;
  onClose: () => void;
  onNext?: () => void;
  onPrevious?: () => void;
}

// ==================== UTILITAIRES ====================

export type FileIconType = 'image' | 'pdf' | 'video' | 'audio' | 'archive' | 'document' | 'unknown';

export interface FileTypeConfig {
  icon: FileIconType;
  color: string;
  accept: string;
}

export const FILE_TYPE_CONFIG: Record<FileType, FileTypeConfig> = {
  IMAGE: { icon: 'image', color: 'text-pink-500', accept: 'image/*' },
  DOCUMENT: { icon: 'pdf', color: 'text-blue-500', accept: '.pdf,.doc,.docx' },
  VIDEO: { icon: 'video', color: 'text-red-500', accept: 'video/*' },
  AUDIO: { icon: 'audio', color: 'text-purple-500', accept: 'audio/*' },
  ARCHIVE: { icon: 'archive', color: 'text-yellow-500', accept: '.zip,.rar,.7z' },
  OTHER: { icon: 'unknown', color: 'text-gray-500', accept: '*' },
};

// ==================== CONSTANTES ====================

export const MAX_FILE_SIZE = 1500 * 1024; // 1500 Ko (1.5 Mo)
export const BATCH_SIZE = 10;
export const THUMBNAIL_SIZE = 200;

export const ALLOWED_MIME_TYPES = [
  'image/*',
  'application/pdf',
  'video/*',
  'audio/*',
  'application/zip',
  'application/x-zip-compressed',
];

export const ALLOWED_EXTENSIONS = [
  '.jpg',
  '.jpeg',
  '.png',
  '.gif',
  '.webp',
  '.pdf',
  '.mp4',
  '.mov',
  '.mp3',
  '.zip',
];
