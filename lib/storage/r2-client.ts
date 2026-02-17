import { S3Client } from "@aws-sdk/client-s3";
import { FetchHttpHandler } from "@smithy/fetch-http-handler";
import { R2_PUBLIC_URL as FALLBACK_URL } from "@/lib/constants";

export const r2Client = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
  requestHandler: new FetchHttpHandler(),
});

export const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || "sitematiere-files";
export const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL || FALLBACK_URL;
