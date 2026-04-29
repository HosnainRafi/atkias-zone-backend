// src/app/modules/HomepageSection/homepageSection.validation.ts
import { z } from 'zod';

const SectionTypes = [
  'BANNER',
  'PRODUCT_GRID',
  'CATEGORY_GRID',
  'BRAND_GRID',
  'YOUTUBE_VIDEOS',
  'ANNOUNCEMENT_BAR',
  'CUSTOM_HTML',
] as const;
const ItemTypes = ['PRODUCT', 'CATEGORY', 'BRAND', 'BANNER', 'VIDEO'] as const;

const sectionItemSchema = z
  .object({
    type: z.enum(ItemTypes),
    referenceId: z.string().optional().nullable(),
    title: z.string().optional().nullable(),
    image: z.string().url().optional().nullable(),
    linkUrl: z.string().url().optional().nullable(),
    order: z.coerce.number().int().optional().default(0),
  })
  .transform(data => ({
    refType: data.type,
    refId: data.referenceId ?? null,
    title: data.title ?? null,
    image: data.image ?? null,
    linkUrl: data.linkUrl ?? null,
    order: data.order,
  }));

const createSectionZodSchema = z.object({
  body: z.object({
    title: z
      .string()
      .min(1, { message: 'Title is required' })
      .optional()
      .nullable(),
    subtitle: z.string().optional().nullable(),
    type: z.enum(SectionTypes),
    isActive: z.boolean().optional().default(true),
    order: z.coerce.number().int().optional().default(0),
    config: z.string().optional().nullable(),
    items: z.array(sectionItemSchema).optional().default([]),
  }),
});

const updateSectionZodSchema = z.object({
  body: z.object({
    title: z.string().min(1).optional().nullable(),
    subtitle: z.string().optional().nullable(),
    type: z.enum(SectionTypes).optional(),
    isActive: z.boolean().optional(),
    order: z.coerce.number().int().optional(),
    config: z.string().optional().nullable(),
  }),
});

const addItemZodSchema = z.object({
  body: sectionItemSchema,
});

const updateItemZodSchema = z.object({
  body: z
    .object({
      type: z.enum(ItemTypes).optional(),
      referenceId: z.string().optional().nullable(),
      title: z.string().optional().nullable(),
      image: z.string().url().optional().nullable(),
      linkUrl: z.string().url().optional().nullable(),
      order: z.coerce.number().int().optional(),
    })
    .transform(data => ({
      ...(data.type !== undefined ? { refType: data.type } : {}),
      ...(data.referenceId !== undefined ? { refId: data.referenceId } : {}),
      ...(data.title !== undefined ? { title: data.title } : {}),
      ...(data.image !== undefined ? { image: data.image } : {}),
      ...(data.linkUrl !== undefined ? { linkUrl: data.linkUrl } : {}),
      ...(data.order !== undefined ? { order: data.order } : {}),
    })),
});

export const HomepageSectionValidation = {
  createSectionZodSchema,
  updateSectionZodSchema,
  addItemZodSchema,
  updateItemZodSchema,
};
