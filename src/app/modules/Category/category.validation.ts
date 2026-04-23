// src/app/modules/Category/category.validation.ts
import { z } from "zod";

const CategoryType = ["PRODUCT", "SKIN_TYPE", "CONCERN"] as const;

const createSlug = (name: string): string => {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
};

const sizeChartZodSchema = z
  .string()
  .url({ message: "Size chart must be a valid URL" })
  .optional()
  .nullable();

const createCategoryZodSchema = z.object({
  body: z
    .object({
      name: z.string().min(1, { message: "Category name is required" }),
      description: z.string().optional(),
      image: z.string().url({ message: "Invalid image URL" }).optional(),
      sizeChart: sizeChartZodSchema,
      parentId: z.string().optional().nullable(),
      order: z.coerce.number().int().optional().default(0),
      type: z.enum(CategoryType).optional().default("PRODUCT"),
      isActive: z.boolean().optional().default(true),
    })
    .transform((data) => ({
      ...data,
      slug: createSlug(data.name),
      parentId: data.parentId === "" ? null : data.parentId,
    })),
});

const updateCategoryZodSchema = z.object({
  body: z
    .object({
      name: z.string().optional(),
      description: z.string().optional(),
      image: z.string().url({ message: "Invalid image URL" }).optional(),
      sizeChart: sizeChartZodSchema,
      parentId: z.string().optional().nullable(),
      order: z.coerce.number().int().optional(),
      type: z.enum(CategoryType).optional(),
      isActive: z.boolean().optional(),
    })
    .transform((data) => {
      const transformedData: Record<string, unknown> = { ...data };
      if (data.name) {
        transformedData.slug = createSlug(data.name);
      }
      if (data.parentId !== undefined) {
        transformedData.parentId =
          data.parentId === "" || data.parentId === null ? null : data.parentId;
      }
      return transformedData;
    }),
});

export const CategoryValidation = {
  createCategoryZodSchema,
  updateCategoryZodSchema,
};
