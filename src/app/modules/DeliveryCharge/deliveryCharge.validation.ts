import { z } from 'zod';

const updateDeliveryChargeConfigZodSchema = z.object({
  body: z.object({
    insideDhaka: z.coerce.number().min(0),
    outsideDhaka: z.coerce.number().min(0),
  }),
});

const resolveDeliveryChargeZodSchema = z.object({
  body: z.object({
    zone: z.enum(['inside', 'outside']),
    productIds: z.array(z.string()).optional().default([]),
  }),
});

export const DeliveryChargeValidation = {
  resolveDeliveryChargeZodSchema,
  updateDeliveryChargeConfigZodSchema,
  createDeliveryChargeRuleZodSchema: z.object({
    body: z
      .object({
        zone: z.enum(['inside', 'outside']),
        scope: z.enum(['all', 'category', 'subcategory', 'product']),
        charge: z.coerce.number().min(0),
        isActive: z.boolean().optional().default(true),
        appliesToCategories: z.array(z.string()).optional(),
        appliesToProducts: z.array(z.string()).optional(),
      })
      .refine(
        data => {
          const hasCategories =
            data.appliesToCategories && data.appliesToCategories.length > 0;
          const hasProducts =
            data.appliesToProducts && data.appliesToProducts.length > 0;

          if (data.scope === 'all') return !hasCategories && !hasProducts;
          if (data.scope === 'product') return hasProducts && !hasCategories;
          if (data.scope === 'category' || data.scope === 'subcategory') {
            return hasCategories && !hasProducts;
          }
          return true;
        },
        {
          message:
            'Scope requires matching categories/products and cannot include both.',
          path: ['scope'],
        },
      )
      .transform(data => ({
        ...data,
        appliesToCategories: data.appliesToCategories ?? [],
        appliesToProducts: data.appliesToProducts ?? [],
      })),
  }),
  updateDeliveryChargeRuleZodSchema: z.object({
    body: z
      .object({
        zone: z.enum(['inside', 'outside']).optional(),
        scope: z.enum(['all', 'category', 'subcategory', 'product']).optional(),
        charge: z.coerce.number().min(0).optional(),
        isActive: z.boolean().optional(),
        appliesToCategories: z.array(z.string()).optional(),
        appliesToProducts: z.array(z.string()).optional(),
      })
      .partial()
      .refine(
        data => {
          const hasCategories =
            data.appliesToCategories && data.appliesToCategories.length > 0;
          const hasProducts =
            data.appliesToProducts && data.appliesToProducts.length > 0;
          const scope = data.scope;

          if (!scope) return true;
          if (scope === 'all') return !hasCategories && !hasProducts;
          if (scope === 'product') return !hasCategories;
          if (scope === 'category' || scope === 'subcategory') {
            return !hasProducts;
          }
          return true;
        },
        {
          message:
            'Scope requires matching categories/products and cannot include both.',
          path: ['scope'],
        },
      ),
  }),
};
