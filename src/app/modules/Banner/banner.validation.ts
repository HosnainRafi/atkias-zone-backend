// src/app/modules/Banner/banner.validation.ts
import { z } from 'zod';

const BannerPositions = ['HERO', 'PROMO', 'POPUP'] as const;

const heroSlideSchema = z.object({
  image: z.string().url('Slide image must be a valid URL'),
  mobileImage: z.string().url().optional().nullable(),
  title: z.string().optional().nullable(),
  subtitle: z.string().optional().nullable(),
  buttonText: z.string().optional().nullable(),
  buttonLink: z.string().url().optional().nullable(),
});

const createBannerZodSchema = z.object({
  body: z
    .object({
      title: z.string().optional().nullable(),
      subtitle: z.string().optional().nullable(),
      description: z.string().optional().nullable(),
      image: z
        .string()
        .url({ message: 'Image must be a valid URL' })
        .optional()
        .nullable(),
      mobileImage: z.string().url().optional().nullable(),
      linkUrl: z.string().url().optional().nullable(),
      buttonText: z.string().optional().nullable(),
      buttonLink: z.string().url().optional().nullable(),
      slides: z.array(heroSlideSchema).optional().nullable(),
      position: z.enum(BannerPositions).default('HERO'),
      isActive: z.boolean().optional().default(true),
      order: z.coerce.number().int().optional().default(0),
      validFrom: z.coerce.date().optional().nullable(),
      validUntil: z.coerce.date().optional().nullable(),
    })
    .refine(
      data => {
        if (data.position === 'HERO') {
          return Array.isArray(data.slides) && data.slides.length > 0;
        }
        return !!data.image;
      },
      {
        message:
          'HERO banners require at least one slide. PROMO/POPUP banners require an image.',
        path: ['slides'],
      },
    ),
});

const updateBannerZodSchema = z.object({
  body: z.object({
    title: z.string().optional().nullable(),
    subtitle: z.string().optional().nullable(),
    description: z.string().optional().nullable(),
    image: z.string().url().optional().nullable(),
    mobileImage: z.string().url().optional().nullable(),
    linkUrl: z.string().url().optional().nullable(),
    buttonText: z.string().optional().nullable(),
    buttonLink: z.string().url().optional().nullable(),
    slides: z.array(heroSlideSchema).optional().nullable(),
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
