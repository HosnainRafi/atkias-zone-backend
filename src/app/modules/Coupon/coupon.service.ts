// src/app/modules/Coupon/coupon.service.ts
import httpStatus from "http-status";
import ApiError from "../../../errors/ApiError";
import prisma from "../../../shared/prisma";
import { TCoupon, TCouponCartItem } from "./coupon.interface";

const couponInclude = {
  createdBy: { select: { name: true, email: true } },
  categories: { select: { categoryId: true } },
  products: { select: { productId: true } },
};

// --- Create Coupon ---
const createCouponIntoDB = async (
  adminId: string,
  payload: Omit<TCoupon, "createdById" | "usedCount">
): Promise<TCoupon> => {
  const { appliesToCategories, appliesToProducts, ...rest } = payload;

  const result = await prisma.coupon.create({
    data: {
      ...rest,
      createdById: adminId,
      categories:
        appliesToCategories && appliesToCategories.length > 0
          ? { create: appliesToCategories.map((id) => ({ categoryId: id })) }
          : undefined,
      products:
        appliesToProducts && appliesToProducts.length > 0
          ? { create: appliesToProducts.map((id) => ({ productId: id })) }
          : undefined,
    },
    include: couponInclude,
  });
  return result as unknown as TCoupon;
};

// --- Get All Coupons ---
const getAllCouponsFromDB = async (): Promise<TCoupon[]> => {
  const result = await prisma.coupon.findMany({ include: couponInclude });
  return result as unknown as TCoupon[];
};

// --- Get Single Coupon ---
const getSingleCouponFromDB = async (id: string): Promise<TCoupon | null> => {
  const result = await prisma.coupon.findUnique({ where: { id }, include: couponInclude });
  if (!result) throw new ApiError(httpStatus.NOT_FOUND, "Coupon not found.");
  return result as unknown as TCoupon;
};

// --- Update Coupon ---
const updateCouponInDB = async (id: string, payload: Partial<TCoupon>): Promise<TCoupon | null> => {
  const { appliesToCategories, appliesToProducts, ...rest } = payload;

  if (appliesToCategories !== undefined) {
    await prisma.couponCategory.deleteMany({ where: { couponId: id } });
  }
  if (appliesToProducts !== undefined) {
    await prisma.couponProduct.deleteMany({ where: { couponId: id } });
  }

  const result = await prisma.coupon.update({
    where: { id },
    data: {
      ...rest,
      categories:
        appliesToCategories && appliesToCategories.length > 0
          ? { create: appliesToCategories.map((cid) => ({ categoryId: cid })) }
          : undefined,
      products:
        appliesToProducts && appliesToProducts.length > 0
          ? { create: appliesToProducts.map((pid) => ({ productId: pid })) }
          : undefined,
    },
    include: couponInclude,
  });

  return result as unknown as TCoupon;
};

// --- Delete Coupon ---
const deleteCouponFromDB = async (id: string): Promise<TCoupon | null> => {
  const existing = await prisma.coupon.findUnique({ where: { id } });
  if (!existing) throw new ApiError(httpStatus.NOT_FOUND, "Coupon not found.");
  const result = await prisma.coupon.delete({ where: { id } });
  return result as unknown as TCoupon;
};

// --- Validate & Apply Coupon ---
export type TCouponValidationResponse = {
  isValid: boolean;
  discountAmount: number;
  message: string;
  coupon?: TCoupon;
};

const validateAndApplyCoupon = async (
  code: string,
  items: TCouponCartItem[]
): Promise<TCouponValidationResponse> => {
  const ok = (isValid: boolean, discountAmount: number, message: string, coupon?: TCoupon): TCouponValidationResponse =>
    ({ isValid, discountAmount, message, coupon });

  const coupon = await prisma.coupon.findUnique({
    where: { code },
    include: {
      categories: { select: { categoryId: true } },
      products: { select: { productId: true } },
    },
  });

  if (!coupon) return ok(false, 0, "Invalid coupon code.");
  if (!coupon.isActive) return ok(false, 0, "This coupon is no longer active.");

  const now = new Date();
  if (coupon.validUntil < now) return ok(false, 0, "This coupon has expired.");
  if (coupon.validFrom > now) return ok(false, 0, "This coupon is not yet valid.");
  if (coupon.usedCount >= coupon.usageLimit) return ok(false, 0, "This coupon has reached its usage limit.");

  const productIds = items.map((i) => i.productId);
  const productsFromDB = await prisma.product.findMany({
    where: { id: { in: productIds } },
    include: { variants: true },
  });

  let cartSubtotal = 0;
  let eligibleTotal = 0;

  for (const item of items) {
    const product = productsFromDB.find((p) => p.id === item.productId);
    if (!product) continue;

    const variant = product.variants.find((v) => v.id === item.productVariantId);
    const itemPrice = Number(variant?.priceOverride ?? product.basePrice);
    const itemTotal = itemPrice * item.quantity;
    cartSubtotal += itemTotal;

    if (coupon.appliesToAllProducts) {
      eligibleTotal += itemTotal;
    } else if (coupon.categories.length > 0) {
      const match = coupon.categories.some((cc) => cc.categoryId === product.categoryId);
      if (match) eligibleTotal += itemTotal;
    } else if (coupon.products.length > 0) {
      const match = coupon.products.some((cp) => cp.productId === product.id);
      if (match) eligibleTotal += itemTotal;
    }
  }

  if (coupon.minOrderAmount && cartSubtotal < Number(coupon.minOrderAmount)) {
    return ok(false, 0, `Minimum order of ${coupon.minOrderAmount} BDT required.`);
  }

  if (eligibleTotal === 0 && !coupon.appliesToAllProducts) {
    return ok(false, 0, "This coupon is not valid for the items in your cart.");
  }

  let discountAmount = 0;
  const effectiveEligible = coupon.appliesToAllProducts ? cartSubtotal : eligibleTotal;

  if (coupon.type === "fixed") {
    discountAmount = Math.min(Number(coupon.value), effectiveEligible);
  } else {
    discountAmount = (effectiveEligible * Number(coupon.value)) / 100;
    if (coupon.maxDiscountAmount && discountAmount > Number(coupon.maxDiscountAmount)) {
      discountAmount = Number(coupon.maxDiscountAmount);
    }
    if (discountAmount > effectiveEligible) discountAmount = effectiveEligible;
  }

  return ok(true, parseFloat(discountAmount.toFixed(2)), "Coupon applied successfully!", coupon as unknown as TCoupon);
};

export const CouponService = {
  createCouponIntoDB,
  getAllCouponsFromDB,
  getSingleCouponFromDB,
  updateCouponInDB,
  deleteCouponFromDB,
  validateAndApplyCoupon,
};
