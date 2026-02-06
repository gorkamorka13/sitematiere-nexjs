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
