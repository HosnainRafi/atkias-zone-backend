// src/app/modules/Brand/brand.validation.ts
import { z } from "zod";

const createSlug = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

const createBrandZodSchema = z.object({
  body: z
    .object({
      name: z.string().min(1, { message: "Brand name is required" }),
      logo: z
        .string()
        .url({ message: "Invalid logo URL" })
        .optional()
        .nullable(),
      description: z.string().optional().nullable(),
      country: z.string().optional().nullable(),
      isActive: z.boolean().optional().default(true),
      order: z.coerce.number().int().optional().default(0),
    })
    .transform((data) => ({ ...data, slug: createSlug(data.name) })),
});

const updateBrandZodSchema = z.object({
  body: z
    .object({
      name: z.string().min(1).optional(),
      logo: z.string().url().optional().nullable(),
      description: z.string().optional().nullable(),
      country: z.string().optional().nullable(),
      isActive: z.boolean().optional(),
      order: z.coerce.number().int().optional(),
    })
    .transform((data) =>
      data.name ? { ...data, slug: createSlug(data.name) } : data,
    ),
});

export const BrandValidation = { createBrandZodSchema, updateBrandZodSchema };
