// src/app/modules/Coupon/coupon.service.ts
import httpStatus from "http-status";
import ApiError from "../../../errors/ApiError";
import prisma from "../../../shared/prisma";
import { TCoupon, TCouponCartItem } from "./coupon.interface";

// --- Create Coupon (Admin) ---
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
          ? {
              connect: appliesToCategories.map((id) => ({ id })),
            }
          : undefined,
      products:
        appliesToProducts && appliesToProducts.length > 0
          ? {
              connect: appliesToProducts.map((id) => ({ id })),
            }
          : undefined,
    },
    include: {
      categories: true,
      products: true,
    },
  });
  return result as unknown as TCoupon;
};

// --- Get All Coupons (Admin) ---
const getAllCouponsFromDB = async (): Promise<TCoupon[]> => {
  const result = await prisma.coupon.findMany({
    include: {
      createdBy: {
        select: {
          name: true,
          email: true,
        },
      },
      categories: true,
      products: true,
    },
  });
  return result as unknown as TCoupon[];
};

// --- Get Single Coupon (Admin) ---
const getSingleCouponFromDB = async (id: string): Promise<TCoupon | null> => {
  const result = await prisma.coupon.findUnique({
    where: { id },
    include: {
      createdBy: {
        select: {
          name: true,
          email: true,
        },
      },
      categories: true,
      products: true,
    },
  });
  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, "Coupon not found.");
  }
  return result as unknown as TCoupon;
};

// --- Update Coupon (Admin) ---
const updateCouponInDB = async (
  id: string,
  payload: Partial<TCoupon>
): Promise<TCoupon | null> => {
  const { appliesToCategories, appliesToProducts, ...rest } = payload;

  const result = await prisma.coupon.update({
    where: { id },
    data: {
      ...rest,
      categories: appliesToCategories
        ? {
            set: appliesToCategories.map((id) => ({ id })),
          }
        : undefined,
      products: appliesToProducts
        ? {
            set: appliesToProducts.map((id) => ({ id })),
          }
        : undefined,
    },
    include: {
      createdBy: {
        select: {
          name: true,
          email: true,
        },
      },
      categories: true,
      products: true,
    },
  });

  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, "Coupon not found.");
  }
  return result as unknown as TCoupon;
};

// --- Delete Coupon (Admin) ---
const deleteCouponFromDB = async (id: string): Promise<TCoupon | null> => {
  const result = await prisma.coupon.delete({
    where: { id },
  });
  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, "Coupon not found.");
  }
  return result as unknown as TCoupon;
};

// --- Validate & Apply Coupon (Public/Order) ---
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
  const response = (
    isValid: boolean,
    discountAmount: number,
    message: string,
    coupon?: TCoupon
  ): TCouponValidationResponse => ({
    isValid,
    discountAmount,
    message,
    coupon,
  });

  // --- 1. Find the coupon ---
  const coupon = await prisma.coupon.findUnique({
    where: { code: code.toUpperCase() },
    include: {
      categories: true,
      products: true,
    },
  });

  if (!coupon) {
    return response(false, 0, "Invalid coupon code.");
  }

  // --- 2. Check basic validity (active, date, usage) ---
  if (!coupon.isActive) {
    return response(false, 0, "This coupon is no longer active.");
  }
  const now = new Date();
  if (coupon.validUntil < now) {
    return response(false, 0, "This coupon has expired.");
  }
  if (coupon.validFrom > now) {
    return response(false, 0, "This coupon is not yet valid.");
  }
  if (coupon.usedCount >= coupon.usageLimit) {
    return response(false, 0, "This coupon has reached its usage limit.");
  }

  // --- 3. Get product data for all items in the cart ---
  const productIds = items.map((item) => item.productId);
  const productsFromDB = await prisma.product.findMany({
    where: { id: { in: productIds } },
    include: {
      sizes: true,
    },
  });

  let cartSubtotal = 0;
  let eligibleTotal = 0;

  // --- 4. Calculate totals and check eligibility ---
  for (const item of items) {
    const product = productsFromDB.find((p) => p.id === item.productId);
    if (!product) continue;

    const size = product.sizes.find((s) => s.id === item.productSizeId);
    if (!size) continue;

    const itemPrice = size.priceOverride ?? product.basePrice;
    const itemTotal = itemPrice * item.quantity;
    cartSubtotal += itemTotal;

    // --- 4b. Check eligibility ---
    if (coupon.appliesToAllProducts) {
      eligibleTotal += itemTotal;
    } else if (coupon.categories.length > 0) {
      // Check if the product's category is in the coupon's list
      const isCategoryMatch = coupon.categories.some(
        (cat) => cat.id === product.categoryId
      );
      if (isCategoryMatch) {
        eligibleTotal += itemTotal;
      }
    } else if (coupon.products.length > 0) {
      // Check if the product's ID is in the coupon's list
      const isProductMatch = coupon.products.some(
        (prod) => prod.id === product.id
      );
      if (isProductMatch) {
        eligibleTotal += itemTotal;
      }
    }
  }

  // --- 5. Check order minimum ---
  if (coupon.minOrderAmount && cartSubtotal < coupon.minOrderAmount) {
    return response(
      false,
      0,
      `Minimum order of ${coupon.minOrderAmount} BDT required.`
    );
  }

  // If no items were eligible, coupon is invalid for this cart
  if (eligibleTotal === 0 && !coupon.appliesToAllProducts) {
    return response(
      false,
      0,
      "This coupon is not valid for the items in your cart."
    );
  }

  // --- 6. All checks passed, calculate discount ---
  let discountAmount = 0;

  if (coupon.type === "fixed") {
    discountAmount = coupon.value;
    if (discountAmount > eligibleTotal) {
      discountAmount = eligibleTotal;
    }
  } else if (coupon.type === "percentage") {
    discountAmount = (eligibleTotal * coupon.value) / 100;

    if (coupon.maxDiscountAmount && discountAmount > coupon.maxDiscountAmount) {
      discountAmount = coupon.maxDiscountAmount;
    }
    if (discountAmount > eligibleTotal) {
      discountAmount = eligibleTotal;
    }
  }

  return response(
    true,
    parseFloat(discountAmount.toFixed(2)),
    "Coupon applied successfully!",
    coupon as unknown as TCoupon
  );
};

export const CouponService = {
  createCouponIntoDB,
  getAllCouponsFromDB,
  getSingleCouponFromDB,
  updateCouponInDB,
  deleteCouponFromDB,
  validateAndApplyCoupon,
};
