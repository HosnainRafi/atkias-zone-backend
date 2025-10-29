// src/app/modules/Coupon/coupon.validation.ts
import { z } from "zod";
import { CouponType } from "./coupon.constants";

// --- Base Schema (Common fields) ---
const couponBaseFields = z.object({
  code: z.string().min(1, { message: "Coupon code is required" }).toUpperCase(),
  description: z.string().optional(),
  value: z.coerce
    .number({
      message: "Discount value is required and must be a number",
    })
    .positive({ message: "Discount value must be positive" }),
  minOrderAmount: z.coerce.number().positive().optional(),
  usageLimit: z.coerce
    .number({
      message: "Usage limit is required and must be a number",
    })
    .int()
    .positive({ message: "Usage limit must be a positive integer" }),
  validFrom: z.coerce.date({ message: 'Invalid "valid from" date' }),
  validUntil: z.coerce.date({ message: 'Invalid "valid until" date' }),
  isActive: z.boolean().default(true).optional(), // Optional for updates
  appliesToAllProducts: z.boolean().default(true).optional(),
  appliesToCategories: z.array(z.string()).optional(),
  appliesToProducts: z.array(z.string()).optional(),
});

// --- Schema specific to 'percentage' coupons ---
const percentageCouponSchema = couponBaseFields.extend({
  type: z.literal(CouponType[0]), // 'percentage'
  value: couponBaseFields.shape.value.max(100, {
    message: "Percentage value cannot exceed 100",
  }),
  maxDiscountAmount: z.coerce
    // --- FIX 1: Use 'message' instead of 'invalid_type_error' ---
    .number({ message: "Max discount must be a number" })
    .positive({ message: "Max discount must be positive" })
    .optional(),
});

// --- Schema specific to 'fixed' coupons ---
const fixedCouponSchema = couponBaseFields.extend({
  type: z.literal(CouponType[1]), // 'fixed'
  // maxDiscountAmount is correctly excluded
});

// --- Discriminated Union for CREATE ---
const couponBodyUnionSchema = z.discriminatedUnion("type", [
  percentageCouponSchema,
  fixedCouponSchema,
]);

// --- Combined Schema for CREATE with final refinements ---
const couponBodyBaseSchema = couponBodyUnionSchema
  .refine((data) => data.validUntil > data.validFrom, {
    message: '"Valid until" date must be after "valid from" date',
    path: ["validUntil"],
  })
  .refine(
    (data) => {
      if (data.appliesToAllProducts === false) {
        const hasCategories =
          data.appliesToCategories && data.appliesToCategories.length > 0;
        const hasProducts =
          data.appliesToProducts && data.appliesToProducts.length > 0;
        return hasCategories || hasProducts;
      }
      return true;
    },
    {
      message:
        "If coupon doesn't apply to all products, you must specify categories or products.",
      path: ["appliesToAllProducts"],
    }
  )
  .refine(
    (data) => {
      const hasCategories =
        data.appliesToCategories && data.appliesToCategories.length > 0;
      const hasProducts =
        data.appliesToProducts && data.appliesToProducts.length > 0;
      return !(hasCategories && hasProducts);
    },
    {
      message: "Coupon can apply to categories OR products, but not both.",
      path: ["appliesToCategories"],
    }
  )
  .transform((data) => ({
    ...data,
    appliesToCategories: data.appliesToCategories ?? [],
    appliesToProducts: data.appliesToProducts ?? [],
  }));

// --- Create Schema ---
const createCouponZodSchema = z
  .object({
    body: couponBodyBaseSchema,
  })
  .transform((data) => ({
    body: {
      ...data.body,
      code: data.body.code.toUpperCase().trim(),
    },
  }));

// --- UPDATE SCHEMA LOGIC ---

// --- FIX 2: Create partial versions of individual schemas ---
const partialPercentageCouponSchema = percentageCouponSchema.partial();
const partialFixedCouponSchema = fixedCouponSchema.partial();

// --- FIX 3: Create a NEW discriminated union using the partial schemas ---
const updateCouponBodyUnionSchema = z.discriminatedUnion("type", [
  partialPercentageCouponSchema,
  partialFixedCouponSchema,
]);

// --- FIX 4: Define the Update Schema using the partial union ---
const updateCouponZodSchema = z
  .object({
    body: updateCouponBodyUnionSchema, // Use the union of partial schemas
  })
  // Refine dates on the outer object (applies after union)
  .refine(
    (data) => {
      // Check only if both dates are present in the partial update
      if (data.body?.validFrom && data.body?.validUntil) {
        return data.body.validUntil > data.body.validFrom;
      }
      return true; // Skip validation if one or both dates are absent
    },
    {
      message: '"Valid until" date must be after "valid from" date',
      path: ["body", "validUntil"], // Point error to the relevant field
    }
  )
  // Optional: Add other refinements specific to updates if needed
  // Transform code if present in the update
  .transform((data) => {
    if (data.body?.code) {
      data.body.code = data.body.code.toUpperCase().trim();
    }
    // Ensure arrays are handled correctly even in partial updates
    if (data.body?.appliesToCategories === undefined)
      delete data.body.appliesToCategories;
    else data.body.appliesToCategories = data.body.appliesToCategories ?? [];
    if (data.body?.appliesToProducts === undefined)
      delete data.body.appliesToProducts;
    else data.body.appliesToProducts = data.body.appliesToProducts ?? [];

    return data;
  });

// --- Apply Coupon Schema --- (Remains the same)
const couponCartItemZodSchema = z.object({
  productId: z.string().min(1, { message: "Product ID is required" }),
  productSizeId: z.string().min(1, { message: "Product Size ID is required" }),
  quantity: z.coerce
    .number()
    .int()
    .positive({ message: "Quantity must be a positive integer" }),
});

const applyCouponZodSchema = z.object({
  body: z.object({
    code: z.string().min(1, { message: "Coupon code is required" }),
    items: z
      .array(couponCartItemZodSchema)
      .min(1, { message: "At least one item is required to apply a coupon" }),
  }),
});

export const CouponValidation = {
  createCouponZodSchema,
  updateCouponZodSchema,
  applyCouponZodSchema,
};
