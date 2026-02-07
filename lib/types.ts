import { UserRole } from "@prisma/client";
import { JWT } from "next-auth/jwt";
import { Session } from "next-auth";

// Extended User type for session
export interface SessionUser {
  id: string;
  username: string;
  name?: string | null;
  role: UserRole;
  color?: string | null;
}

// Document types
export interface ProjectDocument {
  id: string;
  name: string;
  url: string;
  type: string;
  projectId: string;
  createdAt: Date;
  updatedAt: Date;
}

// Video types
export interface ProjectVideo {
  id: string;
  name: string;
  url: string;
  projectId: string;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

// Extended Project with relations
export interface ExtendedProject {
  id: string;
  name: string;
  country: string | null;
  latitude: number;
  longitude: number;
  description: string | null;
  status: string;
  type: string;
  prospection: number;
  studies: number;
  fabrication: number;
  transport: number;
  construction: number;
  projectCode: string | null;
  ownerId: string;
  documents: ProjectDocument[];
  videos: ProjectVideo[];
  images: { id: string; url: string; alt: string | null; order: number }[];
  createdAt: Date;
  updatedAt: Date;
}

// NextAuth callback types
export interface JWTCallbackParams {
  token: JWT;
  user?: SessionUser;
}

export interface SessionCallbackParams {
  session: Session;
  token: JWT;
}

// MySQL migration types
export interface MySQLProjectRow {
  id: number;
  name: string;
  country: string;
  latitude: number;
  longitude: number;
  description: string;
  status: string;
  type: string;
  prospection: number;
  studies: number;
  fabrication: number;
  transport: number;
  construction: number;
  created_at: Date;
  updated_at: Date;
}

export interface MySQLDocumentRow {
  id: number;
  project_id: number;
  name: string;
  url: string;
  type: string;
  created_at: Date;
  updated_at: Date;
}

export interface MySQLVideoRow {
  id: number;
  project_id: number;
  name: string;
  url: string;
  order_num: number;
  created_at: Date;
  updated_at: Date;
}

// PDF Viewer props
export interface PdfViewerProps {
  documents: ProjectDocument[];
}

// File statistics types
export interface FileStatistics {
  totalImages: number;
  totalPdfs: number;
  storageUsed: string;
  storageLimit?: string;
  totalProjects: number;
  orphanedFiles?: number;
  lastScan: string;
}

// Event handler types
export interface DragEventHandlers {
  onDragStart?: (e: React.DragEvent) => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
}
