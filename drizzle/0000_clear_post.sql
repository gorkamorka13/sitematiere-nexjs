CREATE TYPE "public"."document_type" AS ENUM('PLAN', 'FLAG', 'CLIENT_LOGO', 'OTHER', 'PIN');--> statement-breakpoint
CREATE TYPE "public"."file_type" AS ENUM('IMAGE', 'DOCUMENT', 'VIDEO', 'AUDIO', 'ARCHIVE', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."project_status" AS ENUM('DONE', 'CURRENT', 'PROSPECT');--> statement-breakpoint
CREATE TYPE "public"."project_type" AS ENUM('PRS', 'PEB', 'MPB', 'MXB', 'UB', 'PASSERELLE', 'AUTRE');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('USER', 'ADMIN', 'VISITOR');--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text,
	"name" text,
	"passwordHash" text NOT NULL,
	"role" "user_role" DEFAULT 'USER' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"username" text,
	"color" text DEFAULT '#6366f1',
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" text PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"country" varchar(255) NOT NULL,
	"latitude" real NOT NULL,
	"longitude" real NOT NULL,
	"description" text,
	"type" "project_type" NOT NULL,
	"status" "project_status" DEFAULT 'PROSPECT' NOT NULL,
	"prospection" integer DEFAULT 0 NOT NULL,
	"studies" integer DEFAULT 0 NOT NULL,
	"fabrication" integer DEFAULT 0 NOT NULL,
	"transport" integer DEFAULT 0 NOT NULL,
	"construction" integer DEFAULT 0 NOT NULL,
	"projectCode" varchar(255),
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"ownerId" text NOT NULL,
	"visible" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "images" (
	"id" text PRIMARY KEY NOT NULL,
	"url" text NOT NULL,
	"thumbnailUrl" text,
	"alt" text,
	"order" integer DEFAULT 0 NOT NULL,
	"projectId" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "slideshow_images" (
	"id" text PRIMARY KEY NOT NULL,
	"projectId" text NOT NULL,
	"imageId" text NOT NULL,
	"order" integer DEFAULT 0 NOT NULL,
	"isPublished" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "slideshow_images_projectId_imageId_unique" UNIQUE("projectId","imageId")
);
--> statement-breakpoint
CREATE TABLE "videos" (
	"id" text PRIMARY KEY NOT NULL,
	"url" text NOT NULL,
	"title" text,
	"projectId" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"isPublished" boolean DEFAULT false NOT NULL,
	"order" integer DEFAULT 0 NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "documents" (
	"id" text PRIMARY KEY NOT NULL,
	"url" text NOT NULL,
	"name" text NOT NULL,
	"type" "document_type" NOT NULL,
	"projectId" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "files" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"blobUrl" text NOT NULL,
	"blobPath" text NOT NULL,
	"fileType" "file_type" NOT NULL,
	"mimeType" text NOT NULL,
	"size" integer NOT NULL,
	"projectId" text,
	"thumbnailUrl" text,
	"width" integer,
	"height" integer,
	"duration" integer,
	"isDeleted" boolean DEFAULT false NOT NULL,
	"deletedAt" timestamp,
	"deletedBy" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "files_blobUrl_unique" UNIQUE("blobUrl")
);
--> statement-breakpoint
CREATE INDEX "projects_country_index" ON "projects" USING btree ("country");--> statement-breakpoint
CREATE INDEX "projects_type_index" ON "projects" USING btree ("type");--> statement-breakpoint
CREATE INDEX "projects_status_index" ON "projects" USING btree ("status");--> statement-breakpoint
CREATE INDEX "images_projectId_index" ON "images" USING btree ("projectId");--> statement-breakpoint
CREATE INDEX "slideshow_images_projectId_order_index" ON "slideshow_images" USING btree ("projectId","order");--> statement-breakpoint
CREATE INDEX "slideshow_images_projectId_isPublished_index" ON "slideshow_images" USING btree ("projectId","isPublished");--> statement-breakpoint
CREATE INDEX "videos_projectId_order_index" ON "videos" USING btree ("projectId","order");--> statement-breakpoint
CREATE INDEX "documents_projectId_index" ON "documents" USING btree ("projectId");--> statement-breakpoint
CREATE INDEX "files_projectId_index" ON "files" USING btree ("projectId");--> statement-breakpoint
CREATE INDEX "files_isDeleted_index" ON "files" USING btree ("isDeleted");--> statement-breakpoint
CREATE INDEX "files_fileType_index" ON "files" USING btree ("fileType");