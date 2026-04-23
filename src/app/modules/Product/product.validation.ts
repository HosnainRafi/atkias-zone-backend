// src/app/modules/Product/product.validation.ts
import { z } from "zod";

const createSlug = (title: string): string =>
  title.toLowerCase().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-");

const productVariantZodSchema = z.object({
  label: z.string().min(1, { message: "Variant label is required (e.g. 150ml, 50g)" }),
  stock: z.coerce.number({ message: "Stock must be a number" }).int().min(0).default(0),
  priceOverride: z.coerce.number().positive().optional(),
  sku: z.string().optional(),
});

const createProductZodSchema = z.object({
  body: z
    .object({
      title: z.string().min(1, { message: "Title is required" }),
      description: z.string().optional(),
      howToUse: z.string().optional(),
      ingredients: z.string().optional(),
      categoryId: z.string().min(1, { message: "Category ID is required" }),
      brandId: z.string().optional().nullable(),
      basePrice: z.coerce.number({ message: "Base price must be a number" }).positive(),
      compareAtPrice: z.coerce.number().positive().optional(),
      appPrice: z.coerce.number().positive().optional(),
      images: z.array(z.string().url({ message: "Invalid image URL" })).min(1),
      variants: z.array(productVariantZodSchema).optional(),
      sku: z.string().optional(),
      isActive: z.boolean().default(true),
      newArrival: z.boolean().optional().default(false),
      isFeatured: z.boolean().optional().default(false),
      isOnOffer: z.boolean().optional().default(false),
      productOrder: z.coerce.number().int().optional().default(0),
    })
    .refine(
      (data) => (data.compareAtPrice ? data.compareAtPrice > data.basePrice : true),
      { message: '"Compare at" price must be greater than base price.', path: ["compareAtPrice"] }
    )
    .transform((data) => ({ ...data, slug: createSlug(data.title) })),
});

const updateProductZodSchema = z.object({
  body: z
    .object({
      title: z.string().min(1).optional(),
      description: z.string().optional(),
      howToUse: z.string().optional(),
      ingredients: z.string().optional(),
      categoryId: z.string().min(1).optional(),
      brandId: z.string().optional().nullable(),
      basePrice: z.coerce.number().positive().optional(),
      compareAtPrice: z.coerce.number().positive().optional().nullable(),
      appPrice: z.coerce.number().positive().optional().nullable(),
      images: z.array(z.string().url()).min(1).optional(),
      variants: z.array(productVariantZodSchema).optional(),
      sku: z.string().optional(),
      isActive: z.boolean().optional(),
      newArrival: z.boolean().optional(),
      isFeatured: z.boolean().optional(),
      isOnOffer: z.boolean().optional(),
      productOrder: z.coerce.number().int().optional(),
    })
    .transform((data) => (data.title ? { ...data, slug: createSlug(data.title) } : data)),
});

const applyCategoryDiscountZodSchema = z.object({
  body: z.object({
    categoryId: z.string().min(1, { message: "Category ID is required" }),
    discountType: z.enum(["percentage", "fixed"], { message: "Discount type is required" }),
    discountValue: z.coerce.number({ message: "Discount value is required" }).positive(),
  }),
});

export const ProductValidation = {
  createProductZodSchema,
  updateProductZodSchema,
  applyCategoryDiscountZodSchema,
};
