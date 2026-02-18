// Serialized types for Cloudflare Workers compatibility
// Converts Date fields to ISO strings for JSON serialization

import type { Project, Video, Document } from "@/lib/db/schema";

// Helper type to convert Date fields to strings
export type Serialized<T> = {
  [K in keyof T]: T[K] extends Date
    ? string
    : T[K] extends Date | null
    ? string | null
    : T[K] extends Date | undefined
    ? string | undefined
    : T[K];
};

// Serialized Project type (dates as strings)
export type SerializedProject = Serialized<Project>;

// Serialized Video type (dates as strings)
export type SerializedVideo = Serialized<Video>;

// Serialized Document type (dates as strings) - Note: Document only has createdAt
export type SerializedDocument = Serialized<Document>;

// Extended types with relations
export type SerializedProjectWithRelations = SerializedProject & {
  documents?: SerializedDocument[];
  videos?: SerializedVideo[];
};
