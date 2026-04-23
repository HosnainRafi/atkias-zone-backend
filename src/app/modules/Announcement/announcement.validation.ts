// src/app/modules/Announcement/announcement.validation.ts
import { z } from "zod";

const createAnnouncementZodSchema = z.object({
  body: z.object({
    text: z.string().min(1, { message: "Announcement text is required" }),
    linkUrl: z.string().url().optional().nullable(),
    isActive: z.boolean().optional().default(true),
    order: z.coerce.number().int().optional().default(0),
  }),
});

const updateAnnouncementZodSchema = z.object({
  body: z.object({
    text: z.string().min(1).optional(),
    linkUrl: z.string().url().optional().nullable(),
    isActive: z.boolean().optional(),
    order: z.coerce.number().int().optional(),
  }),
});

export const AnnouncementValidation = {
  createAnnouncementZodSchema,
  updateAnnouncementZodSchema,
};
