// src/app/modules/Order/order.validation.ts
import { z } from 'zod';
import { OrderStatus, PaymentMethod, PaymentStatus } from './order.constants';

const shippingAddressZodSchema = z.object({
  customerName: z.string().min(1, { message: 'Customer name is required' }),
  mobile: z.string().min(1, { message: 'Mobile number is required' }),
  email: z.string().email().optional().nullable(),
  district: z.string().min(1, { message: 'District is required' }),
  upazila: z.string().min(1, { message: 'Upazila is required' }),
  addressLine: z.string().min(1, { message: 'Address is required' }),
  postalCode: z.string().optional(),
  deliveryChargeZone: z.string().optional(),
});

const shippingAddressUpdateZodSchema = z.object({
  customerName: z.string().min(1).optional(),
  mobile: z.string().min(1).optional(),
  email: z.string().email().optional().nullable(),
  district: z.string().min(1).optional(),
  upazila: z.string().min(1).optional(),
  addressLine: z.string().min(1).optional(),
  postalCode: z.string().optional().nullable(),
  deliveryChargeZone: z.string().optional().nullable(),
});

const orderItemZodSchema = z.object({
  productId: z.string().min(1, { message: 'Product ID is required' }),
  productVariantId: z.string().optional().nullable(),
  quantity: z.coerce
    .number()
    .int()
    .positive({ message: 'Quantity must be a positive integer' }),
});

const createOrderZodSchema = z.object({
  body: z.object({
    shippingAddress: shippingAddressZodSchema,
    items: z
      .array(orderItemZodSchema)
      .min(1, { message: 'Order must have at least one item' }),
    orderNote: z.string().optional(),
    shipping: z.coerce.number().min(0).default(0).optional(),
    couponCode: z.string().trim().toUpperCase().optional(),
    paymentMethod: z
      .enum([...PaymentMethod] as [string, ...string[]])
      .default('COD')
      .optional(),
  }),
});

const updateOrderStatusZodSchema = z.object({
  body: z.object({
    status: z.enum([...OrderStatus] as [string, ...string[]], {
      message: 'Invalid order status',
    }),
    paymentStatus: z
      .enum([...PaymentStatus] as [string, ...string[]])
      .optional(),
    note: z.string().optional(),
  }),
});

const updateOrderZodSchema = z.object({
  body: z.object({
    shippingAddress: shippingAddressUpdateZodSchema.optional(),
    items: z
      .array(orderItemZodSchema)
      .min(1, { message: 'Order must have at least one item' })
      .optional(),
    orderNote: z.string().optional(),
    shipping: z.coerce.number().min(0).optional(),
    paymentMethod: z
      .enum([...PaymentMethod] as [string, ...string[]])
      .optional(),
    paymentStatus: z
      .enum([...PaymentStatus] as [string, ...string[]])
      .optional(),
  }),
});

const trackOrderZodSchema = z.object({
  body: z
    .object({
      trackingNumber: z.string().optional(),
      mobile: z.string().optional(),
    })
    .refine(data => data.trackingNumber || data.mobile, {
      message: 'Either tracking number or mobile is required',
      path: ['trackingNumber'],
    }),
});

export const OrderValidation = {
  createOrderZodSchema,
  createManualOrderZodSchema: createOrderZodSchema,
  updateOrderStatusZodSchema,
  updateOrderZodSchema,
  trackOrderZodSchema,
};
