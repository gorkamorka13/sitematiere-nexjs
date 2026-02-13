import { z } from "zod";

export const ProjectUpdateSchema = z.object({
  id: z.string().min(1, "L'ID du projet est requis"),
  latitude: z.number(),
  longitude: z.number(),
  description: z.string().optional(),
  prospection: z.number().min(0).max(100).optional(),
  studies: z.number().min(0).max(100).optional(),
  fabrication: z.number().min(0).max(100).optional(),
  transport: z.number().min(0).max(100).optional(),
  construction: z.number().min(0).max(100).optional(),
  flagName: z.string().optional(),
  clientLogoName: z.string().optional(),
});

export type ProjectUpdateInput = z.infer<typeof ProjectUpdateSchema>;

export const ProjectCreateSchema = z.object({
  name: z.string().min(1, "Le nom est requis").max(255),
  country: z.string().min(1, "Le pays est requis").max(255),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  type: z.enum(["PRS", "PEB", "MPB", "MXB", "UB", "PASSERELLE", "AUTRE"]),
  status: z.enum(["PROSPECT", "CURRENT", "DONE"]).default("PROSPECT"),
  description: z.string().optional(),
  projectCode: z.string().max(255).optional(),
  prospection: z.number().min(0).max(100).default(0),
  studies: z.number().min(0).max(100).default(0),
  fabrication: z.number().min(0).max(100).default(0),
  transport: z.number().min(0).max(100).default(0),
  construction: z.number().min(0).max(100).default(0),
  flagName: z.string().optional(),
  clientLogoName: z.string().optional(),
});

export type ProjectCreateInput = z.infer<typeof ProjectCreateSchema>;

export const ProjectDeleteSchema = z.object({
  id: z.string().min(1, "L'ID est requis"),
  confirmName: z.string(),
});

export type ProjectDeleteInput = z.infer<typeof ProjectDeleteSchema>;
