// src/app/modules/HomepageSection/homepageSection.validation.ts
import { z } from "zod";

const SectionTypes = [
  "FEATURED_PRODUCTS",
  "CATEGORY_SHOWCASE",
  "BRAND_SHOWCASE",
  "CUSTOM",
] as const;
const ItemTypes = ["PRODUCT", "CATEGORY", "BRAND", "CUSTOM"] as const;

const sectionItemSchema = z.object({
  type: z.enum(ItemTypes),
  referenceId: z.string().optional().nullable(),
  title: z.string().optional().nullable(),
  image: z.string().url().optional().nullable(),
  linkUrl: z.string().url().optional().nullable(),
  order: z.coerce.number().int().optional().default(0),
});

const createSectionZodSchema = z.object({
  body: z.object({
    title: z.string().min(1, { message: "Title is required" }),
    type: z.enum(SectionTypes),
    isActive: z.boolean().optional().default(true),
    order: z.coerce.number().int().optional().default(0),
    items: z.array(sectionItemSchema).optional().default([]),
  }),
});

const updateSectionZodSchema = z.object({
  body: z.object({
    title: z.string().min(1).optional(),
    type: z.enum(SectionTypes).optional(),
    isActive: z.boolean().optional(),
    order: z.coerce.number().int().optional(),
  }),
});

const addItemZodSchema = z.object({
  body: sectionItemSchema,
});

const updateItemZodSchema = z.object({
  body: z.object({
    type: z.enum(ItemTypes).optional(),
    referenceId: z.string().optional().nullable(),
    title: z.string().optional().nullable(),
    image: z.string().url().optional().nullable(),
    linkUrl: z.string().url().optional().nullable(),
    order: z.coerce.number().int().optional(),
  }),
});

export const HomepageSectionValidation = {
  createSectionZodSchema,
  updateSectionZodSchema,
  addItemZodSchema,
  updateItemZodSchema,
};
