// src/app/modules/Order/order.service.ts
import httpStatus from "http-status";
import ApiError from "../../../errors/ApiError";
import { IGenericResponse } from "../../../interfaces/common";
import calculatePagination from "../../../shared/calculatePagination";
import prisma from "../../../shared/prisma";
import { CouponService, TCouponValidationResponse } from "../Coupon/coupon.service";
import { TCreateOrderPayload, TOrder, TOrderItem, TPublicOrderTracking } from "./order.interface";
import { generateTrackingNumber } from "./order.utils";
import { PaymentStatus, OrderStatus } from "@prisma/client";

const orderInclude = {
  items: true,
  statusHistories: true,
  coupon: true,
};

const createOrderIntoDB = async (payload: TCreateOrderPayload): Promise<TOrder> => {
  const { items, shippingAddress, couponCode, shipping = 0, orderNote, paymentMethod } = payload;

  const productIds = items.map((i) => i.productId);
  const productsFromDB = await prisma.product.findMany({
    where: { id: { in: productIds } },
    include: { variants: true },
  });

  let subtotal = 0;
  const processedItems: TOrderItem[] = [];
  const stockUpdates: { variantId?: string; productId: string; quantity: number }[] = [];

  for (const item of items) {
    const product = productsFromDB.find((p) => p.id === item.productId);
    if (!product) throw new ApiError(httpStatus.BAD_REQUEST, `Product ${item.productId} not found.`);
    if (!product.isActive) throw new ApiError(httpStatus.BAD_REQUEST, `"${product.title}" is unavailable.`);

    let variant = undefined;
    if (item.productVariantId) {
      variant = product.variants.find((v) => v.id === item.productVariantId);
      if (!variant) throw new ApiError(httpStatus.BAD_REQUEST, `Invalid variant for "${product.title}".`);
      if (variant.stock < item.quantity) {
        throw new ApiError(httpStatus.BAD_REQUEST, `Not enough stock for "${product.title}" (${variant.label}). Available: ${variant.stock}.`);
      }
    }

    const unitPrice = Number(variant?.priceOverride ?? product.basePrice);
    const totalPrice = unitPrice * item.quantity;
    subtotal += totalPrice;

    processedItems.push({
      productId: product.id,
      productVariantId: variant?.id ?? null,
      title: product.title,
      variantLabel: variant?.label ?? null,
      image: product.images[0],
      quantity: item.quantity,
      unitPrice,
      totalPrice,
    });

    if (variant) {
      stockUpdates.push({ variantId: variant.id, productId: product.id, quantity: item.quantity });
    }
  }

  let discountAmount = 0;
  let couponId: string | undefined;

  if (couponCode) {
    const couponResult: TCouponValidationResponse = await CouponService.validateAndApplyCoupon(couponCode, items.map((i) => ({ productId: i.productId, productVariantId: i.productVariantId ?? undefined, quantity: i.quantity })));
    if (!couponResult.isValid) throw new ApiError(httpStatus.BAD_REQUEST, couponResult.message);
    discountAmount = couponResult.discountAmount;
    couponId = couponResult.coupon?.id;
  }

  const totalAmount = subtotal + shipping - discountAmount;
  const trackingNumber = generateTrackingNumber();

  const result = await prisma.$transaction(async (tx) => {
    const newOrder = await tx.order.create({
      data: {
        trackingNumber,
        customerName: shippingAddress.customerName,
        email: shippingAddress.email,
        mobile: shippingAddress.mobile,
        district: shippingAddress.district,
        upazila: shippingAddress.upazila,
        addressLine: shippingAddress.addressLine,
        postalCode: shippingAddress.postalCode,
        deliveryChargeZone: shippingAddress.deliveryChargeZone,
        orderNote,
        subtotal,
        shipping,
        couponId,
        discountAmount,
        totalAmount,
        paymentMethod: (paymentMethod as any) ?? PaymentStatus.pending,
        paymentStatus: PaymentStatus.pending,
        status: OrderStatus.pending,
        items: {
          create: processedItems.map((item) => ({
            productId: item.productId,
            productVariantId: item.productVariantId,
            title: item.title,
            variantLabel: item.variantLabel,
            image: item.image,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.totalPrice,
          })),
        },
        statusHistories: {
          create: { status: OrderStatus.pending, note: "Order placed" },
        },
      },
      include: orderInclude,
    });

    for (const update of stockUpdates) {
      if (update.variantId) {
        await tx.productVariant.update({
          where: { id: update.variantId },
          data: { stock: { decrement: update.quantity } },
        });
      }
    }

    if (couponId) {
      await tx.coupon.update({ where: { id: couponId }, data: { usedCount: { increment: 1 } } });
    }

    return newOrder;
  });

  return result as unknown as TOrder;
};

const getAllOrdersFromDB = async (options: {
  page?: number; limit?: number; sortBy?: string; sortOrder?: "asc" | "desc"; status?: string;
}): Promise<IGenericResponse<TOrder[]>> => {
  const { page, limit, skip, sortBy, sortOrder } = calculatePagination(options);
  const where = options.status ? { status: options.status as any } : {};

  const [result, total] = await Promise.all([
    prisma.order.findMany({
      where,
      include: orderInclude,
      orderBy: sortBy ? { [sortBy]: sortOrder || "desc" } : { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.order.count({ where }),
  ]);

  return { meta: { page, limit, total }, data: result as unknown as TOrder[] };
};

const getSingleOrderFromDB = async (id: string): Promise<TOrder | null> => {
  const result = await prisma.order.findUnique({ where: { id }, include: orderInclude });
  if (!result) throw new ApiError(httpStatus.NOT_FOUND, "Order not found.");
  return result as unknown as TOrder;
};

const updateOrderStatusInDB = async (id: string, adminId: string, payload: { status: string; note?: string; paymentStatus?: string }): Promise<TOrder | null> => {
  const order = await prisma.order.findUnique({ where: { id } });
  if (!order) throw new ApiError(httpStatus.NOT_FOUND, "Order not found.");

  const result = await prisma.order.update({
    where: { id },
    data: {
      status: payload.status as any,
      paymentStatus: payload.paymentStatus ? (payload.paymentStatus as any) : undefined,
      statusHistories: {
        create: { status: payload.status as any, note: payload.note, changedById: adminId },
      },
    },
    include: orderInclude,
  });

  return result as unknown as TOrder;
};

const trackOrderPublicly = async (trackingNumber: string, mobile: string): Promise<TPublicOrderTracking[]> => {
  const orders = await prisma.order.findMany({
    where: { trackingNumber, mobile },
    include: { items: true, statusHistories: true },
  });

  if (!orders.length) throw new ApiError(httpStatus.NOT_FOUND, "Order not found.");

  return orders.map((order) => ({
    trackingNumber: order.trackingNumber,
    status: order.status as any,
    paymentStatus: order.paymentStatus as any,
    statusHistories: order.statusHistories as any,
    createdAt: order.createdAt,
    items: order.items.map((item) => ({
      title: item.title,
      variantLabel: item.variantLabel,
      quantity: item.quantity,
      unitPrice: Number(item.unitPrice),
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
