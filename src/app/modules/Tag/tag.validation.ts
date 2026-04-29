import { z } from 'zod';

const TagType = [
  'SKIN_TYPE',
  'CONCERN',
  'INGREDIENT',
  'FEATURE',
  'ROUTINE',
  'TEXTURE',
  'AGE_GROUP',
  'SPF_TYPE',
  'GENDER',
] as const;

const createSlug = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');

const createTagZodSchema = z.object({
  body: z
    .object({
      name: z.string().min(1, { message: 'Tag name is required' }),
      type: z.enum(TagType, { message: 'Tag type is required' }),
    })
    .transform(data => ({ ...data, slug: createSlug(data.name) })),
});

const updateTagZodSchema = z.object({
  body: z
    .object({
      name: z.string().min(1).optional(),
      type: z.enum(TagType).optional(),
    })
    .transform(data =>
      data.name ? { ...data, slug: createSlug(data.name) } : data,
    ),
});

export const TagValidation = {
  createTagZodSchema,
  updateTagZodSchema,
};
