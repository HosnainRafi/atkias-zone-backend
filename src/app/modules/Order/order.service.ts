// src/app/modules/Order/order.service.ts
import httpStatus from "http-status";
import ApiError from "../../../errors/ApiError";
import { IGenericResponse } from "../../../interfaces/common";
import calculatePagination from "../../../shared/calculatePagination";
import prisma from "../../../shared/prisma";
import {
  CouponService,
  TCouponValidationResponse,
} from "../Coupon/coupon.service";
import {
  TCreateOrderPayload,
  TOrder,
  TOrderItem,
  TPublicOrderTracking,
} from "./order.interface";
import { generateTrackingNumber } from "./order.utils";
import { PaymentStatus, OrderStatus } from "@prisma/client";

// --- Create Order (Public) ---
const createOrderIntoDB = async (
  payload: TCreateOrderPayload
): Promise<TOrder> => {
  const {
    items,
    shippingAddress,
    couponCode,
    shipping = 0,
    orderNote,
  } = payload;

  // 1. Prepare product validation
  const productIds = items.map((item) => item.productId);
  const productsFromDB = await prisma.product.findMany({
    where: { id: { in: productIds } },
    include: { sizes: true },
  });

  let subtotal = 0;
  const processedItems: TOrderItem[] = [];
  const stockUpdates: {
    sizeId: string;
    quantity: number;
    title: string;
    size: string;
  }[] = [];

  // 2. Validate items, calculate subtotal, prepare stock updates
  for (const item of items) {
    const product = productsFromDB.find((p) => p.id === item.productId);

    if (!product) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        `Product with ID ${item.productId} not found.`
      );
    }
    if (!product.isActive) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        `Product "${product.title}" is currently unavailable.`
      );
    }

    const size = product.sizes.find((s) => s.id === item.productSizeId);

    if (!size) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        `Invalid size ID ${item.productSizeId} for product "${product.title}".`
      );
    }

    if (size.stock < item.quantity) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        `Not enough stock for ${product.title} (Size: ${size.size}). Available: ${size.stock}, Requested: ${item.quantity}.`
      );
    }

    const unitPrice = size.priceOverride ?? product.basePrice;
    const totalPrice = unitPrice * item.quantity;
    subtotal += totalPrice;

    processedItems.push({
      productId: product.id,
      productSizeId: size.id,
      title: product.title,
      size: size.size,
      image: product.images[0],
      quantity: item.quantity,
      unitPrice: unitPrice,
      totalPrice: totalPrice,
    });

    stockUpdates.push({
      sizeId: size.id,
      quantity: item.quantity,
      title: product.title,
      size: size.size,
    });
  }

  // 3. Apply Coupon (if provided)
  let discountAmount = 0;
  let couponId: string | undefined;

  if (couponCode) {
    const couponResult: TCouponValidationResponse =
      await CouponService.validateAndApplyCoupon(couponCode, items);

    if (!couponResult.isValid) {
      throw new ApiError(httpStatus.BAD_REQUEST, couponResult.message);
    }

    discountAmount = couponResult.discountAmount;
    couponId = couponResult.coupon?.id;
  }

  // 4. Calculate Total
  const totalAmount = subtotal + shipping - discountAmount;

  // 5. Generate Tracking Number
  const trackingNumber = generateTrackingNumber();

  // 6. Transaction: Create Order, Update Stock, Update Coupon Usage
  const result = await prisma.$transaction(async (tx) => {
    // a. Create Order
    const newOrder = await tx.order.create({
      data: {
        trackingNumber,
        customerName: shippingAddress.customerName,
        mobile: shippingAddress.mobile,
        district: shippingAddress.district,
        upazila: shippingAddress.upazila,
        addressLine: shippingAddress.addressLine,
        postalCode: shippingAddress.postalCode,
        orderNote,
        subtotal,
        shipping,
        couponId,
        discountAmount,
        totalAmount,
        paymentStatus: PaymentStatus.pending,
        status: OrderStatus.pending,
        items: {
          create: processedItems.map((item) => ({
            productId: item.productId,
            productSizeId: item.productSizeId,
            title: item.title,
            size: item.size,
            image: item.image,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.totalPrice,
          })),
        },
        statusHistory: {
          create: {
            status: OrderStatus.pending,
            note: "Order placed",
          },
        },
      },
      include: {
        items: true,
        statusHistory: true,
      },
    });

    // b. Update Stock
    for (const update of stockUpdates) {
      await tx.productSize.update({
        where: { id: update.sizeId },
        data: {
          stock: { decrement: update.quantity },
        },
      });
    }

    // c. Update Coupon Usage
    if (couponId) {
      await tx.coupon.update({
        where: { id: couponId },
        data: {
          usedCount: { increment: 1 },
        },
      });
    }

    return newOrder;
  });

  return result as unknown as TOrder;
};

// --- Get All Orders (Admin) ---
const getAllOrdersFromDB = async (options: {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}): Promise<IGenericResponse<TOrder[]>> => {
  const { page, limit, skip, sortBy, sortOrder } = calculatePagination(options);

  const result = await prisma.order.findMany({
    include: {
      items: true,
      statusHistory: true,
    },
    orderBy: sortBy ? { [sortBy]: sortOrder || "desc" } : { createdAt: "desc" },
    skip,
    take: limit,
  });

  const total = await prisma.order.count();

  return {
    meta: { page, limit, total },
    data: result as unknown as TOrder[],
  };
};

// --- Get Single Order (Admin) ---
const getSingleOrderFromDB = async (id: string): Promise<TOrder | null> => {
  const result = await prisma.order.findUnique({
    where: { id },
    include: {
      items: true,
      statusHistory: true,
    },
  });

  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, "Order not found.");
  }
  return result as unknown as TOrder;
};

// --- Update Order Status (Admin) ---
const updateOrderStatusInDB = async (
  id: string,
  adminId: string,
  payload: { status: string; note?: string }
): Promise<TOrder | null> => {
  const { status, note } = payload;

  const order = await prisma.order.findUnique({ where: { id } });
  if (!order) {
    throw new ApiError(httpStatus.NOT_FOUND, "Order not found.");
  }

  const result = await prisma.order.update({
    where: { id },
    data: {
      status: status as any,
      statusHistory: {
        create: {
          status: status as any,
          note,
          changedById: adminId,
        },
      },
    },
    include: {
      items: true,
      statusHistory: true,
    },
  });

  return result as unknown as TOrder;
};

// --- Track Order (Public) ---
const trackOrderPublicly = async (
  trackingNumber: string,
  mobile: string
): Promise<TPublicOrderTracking[]> => {
  const orders = await prisma.order.findMany({
    where: {
      trackingNumber,
      mobile,
    },
    include: {
      items: true,
      statusHistory: true,
    },
  });

  if (!orders || orders.length === 0) {
    throw new ApiError(
      httpStatus.NOT_FOUND,
      "Order not found with the provided tracking number and mobile."
    );
  }

  // Map to public format
  return orders.map((order) => ({
    trackingNumber: order.trackingNumber,
    status: order.status as any,
    paymentStatus: order.paymentStatus as any,
    statusHistory: order.statusHistory.map((h) => ({
      status: h.status as any,
      note: h.note,
      changedAt: h.changedAt,
    })),
    createdAt: order.createdAt,
    items: order.items.map((item) => ({
      title: item.title,
      size: item.size,
      quantity: item.quantity,
      image: item.image,
    })),
  }));
};

export const OrderService = {
  createOrderIntoDB,
  getAllOrdersFromDB,
  getSingleOrderFromDB,
  updateOrderStatusInDB,
  trackOrderPublicly,
};
