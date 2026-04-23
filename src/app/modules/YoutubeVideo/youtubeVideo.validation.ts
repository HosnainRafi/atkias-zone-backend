// src/app/modules/YoutubeVideo/youtubeVideo.validation.ts
import { z } from "zod";

const createYoutubeVideoZodSchema = z.object({
  body: z.object({
    title: z.string().min(1, { message: "Title is required" }),
    youtubeId: z.string().min(1, { message: "YouTube video ID is required" }),
    thumbnail: z.string().url().optional().nullable(),
    description: z.string().optional().nullable(),
    isActive: z.boolean().optional().default(true),
    order: z.coerce.number().int().optional().default(0),
  }),
});

const updateYoutubeVideoZodSchema = z.object({
  body: z.object({
    title: z.string().min(1).optional(),
    youtubeId: z.string().min(1).optional(),
    thumbnail: z.string().url().optional().nullable(),
    description: z.string().optional().nullable(),
    isActive: z.boolean().optional(),
    order: z.coerce.number().int().optional(),
  }),
});

export const YoutubeVideoValidation = {
  createYoutubeVideoZodSchema,
  updateYoutubeVideoZodSchema,
};
