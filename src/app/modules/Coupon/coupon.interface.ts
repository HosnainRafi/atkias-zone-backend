// src/app/modules/Coupon/coupon.interface.ts

export type TCouponType = "percentage" | "fixed";

export type TCoupon = {
  id?: string;
  code: string;
  description?: string | null;
  type: TCouponType;
  value: number;
  minOrderAmount?: number | null;
  maxDiscountAmount?: number | null;
  usageLimit: number;
  usedCount: number;
  validFrom: Date;
  validUntil: Date;
  isActive: boolean;
  createdById: string;
  appliesToAllProducts: boolean;
  appliesToCategories?: string[]; // Array of Category IDs
  appliesToProducts?: string[]; // Array of Product IDs
  createdAt?: Date;
  updatedAt?: Date;
};

// This represents the items sent from the client's cart
export type TCouponCartItem = {
  productId: string;
  productSizeId: string;
  quantity: number;
};
