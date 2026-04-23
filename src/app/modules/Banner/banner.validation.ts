// src/app/modules/Banner/banner.validation.ts
import { z } from "zod";

const BannerPositions = ["HERO", "PROMO", "POPUP"] as const;

const createBannerZodSchema = z.object({
  body: z.object({
    title: z.string().optional().nullable(),
    image: z.string().url({ message: "Image must be a valid URL" }),
    mobileImage: z.string().url().optional().nullable(),
    linkUrl: z.string().url().optional().nullable(),
    position: z.enum(BannerPositions).default("HERO"),
    isActive: z.boolean().optional().default(true),
    order: z.coerce.number().int().optional().default(0),
    validFrom: z.coerce.date().optional().nullable(),
    validUntil: z.coerce.date().optional().nullable(),
  }),
});

const updateBannerZodSchema = z.object({
  body: z.object({
    title: z.string().optional().nullable(),
    image: z.string().url().optional(),
    mobileImage: z.string().url().optional().nullable(),
    linkUrl: z.string().url().optional().nullable(),
    position: z.enum(BannerPositions).optional(),
    isActive: z.boolean().optional(),
    order: z.coerce.number().int().optional(),
    validFrom: z.coerce.date().optional().nullable(),
    validUntil: z.coerce.date().optional().nullable(),
  }),
});

export const BannerValidation = {
  createBannerZodSchema,
  updateBannerZodSchema,
};
