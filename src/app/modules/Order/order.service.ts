// src/app/modules/Order/order.service.ts
import type { Prisma } from "@prisma/client";
import { OrderStatus, PaymentMethod, PaymentStatus } from "@prisma/client";
import httpStatus from "http-status";
import ApiError from "../../../errors/ApiError";
import { IGenericResponse } from "../../../interfaces/common";
import calculatePagination from "../../../shared/calculatePagination";
import prisma from "../../../shared/prisma";
import {
  CouponService,
  TCouponValidationResponse,
} from "../Coupon/coupon.service";
import { DeliveryChargeService } from "../DeliveryCharge/deliveryCharge.service";
import {
  TCreateOrderPayload,
  TOrder,
  TOrderItem,
  TPublicOrderTracking,
  TUpdateOrderPayload,
} from "./order.interface";
import { generateTrackingNumber } from "./order.utils";

const orderInclude = {
  items: true,
  statusHistories: true,
  coupon: true,
};

const createOrderIntoDB = async (
  payload: TCreateOrderPayload,
): Promise<TOrder> => {
  const { items, shippingAddress, couponCode, orderNote, paymentMethod } =
    payload;

  const productIds = items.map((i) => i.productId);
  const productsFromDB = await prisma.product.findMany({
    where: { id: { in: productIds } },
    include: { variants: true },
  });

  let subtotal = 0;
  const processedItems: TOrderItem[] = [];
  const stockUpdates: {
    variantId?: string;
    productId: string;
    quantity: number;
  }[] = [];

  for (const item of items) {
    const product = productsFromDB.find((p) => p.id === item.productId);
    if (!product)
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        `Product ${item.productId} not found.`,
      );
    if (!product.isActive)
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        `"${product.title}" is unavailable.`,
      );

    let variant = undefined;
    if (item.productVariantId) {
      variant = product.variants.find((v) => v.id === item.productVariantId);
      if (!variant)
        throw new ApiError(
          httpStatus.BAD_REQUEST,
          `Invalid variant for "${product.title}".`,
        );
      if (variant.stock < item.quantity) {
        throw new ApiError(
          httpStatus.BAD_REQUEST,
          `Not enough stock for "${product.title}" (${variant.label}). Available: ${variant.stock}.`,
        );
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
      stockUpdates.push({
        variantId: variant.id,
        productId: product.id,
        quantity: item.quantity,
      });
    }
  }

  let discountAmount = 0;
  let couponId: string | undefined;

  if (couponCode) {
    const couponResult: TCouponValidationResponse =
      await CouponService.validateAndApplyCoupon(
        couponCode,
        items.map((i) => ({
          productId: i.productId,
          productVariantId: i.productVariantId ?? undefined,
          quantity: i.quantity,
        })),
      );
    if (!couponResult.isValid)
      throw new ApiError(httpStatus.BAD_REQUEST, couponResult.message);
    discountAmount = couponResult.discountAmount;
    couponId = couponResult.coupon?.id;
  }

  const resolvedDeliveryCharge =
    await DeliveryChargeService.resolveDeliveryCharge(shippingAddress);
  const shipping = resolvedDeliveryCharge.fee;
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
        deliveryChargeZone: resolvedDeliveryCharge.label,
        orderNote,
        subtotal,
        shipping,
        couponId,
        discountAmount,
        totalAmount,
        paymentMethod: (paymentMethod as any) ?? PaymentMethod.COD,
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
      await tx.coupon.update({
        where: { id: couponId },
        data: { usedCount: { increment: 1 } },
      });
    }

    return newOrder;
  });

  return result as unknown as TOrder;
};

const getAllOrdersFromDB = async (options: {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  status?: string;
  searchTerm?: string;
  paymentStatus?: string;
  paymentMethod?: string;
}): Promise<IGenericResponse<TOrder[]>> => {
  const { page, limit, skip, sortBy, sortOrder } = calculatePagination(options);

  const andConditions: Prisma.OrderWhereInput[] = [];

  if (options.status) {
    andConditions.push({ status: options.status as any });
  }

  if (options.paymentStatus) {
    andConditions.push({ paymentStatus: options.paymentStatus as any });
  }

  if (options.paymentMethod) {
    andConditions.push({ paymentMethod: options.paymentMethod as any });
  }

  if (options.searchTerm) {
    andConditions.push({
      OR: [
        {
          trackingNumber: { contains: options.searchTerm, mode: "insensitive" },
        },
        { customerName: { contains: options.searchTerm, mode: "insensitive" } },
        { mobile: { contains: options.searchTerm, mode: "insensitive" } },
        { email: { contains: options.searchTerm, mode: "insensitive" } },
      ],
    });
  }

  const where: Prisma.OrderWhereInput =
    andConditions.length > 0 ? { AND: andConditions } : {};

  const [result, total] = await Promise.all([
    prisma.order.findMany({
      where,
      include: orderInclude,
      orderBy: sortBy
        ? { [sortBy]: sortOrder || "desc" }
        : { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.order.count({ where }),
  ]);

  return { meta: { page, limit, total }, data: result as unknown as TOrder[] };
};

const getSingleOrderFromDB = async (id: string): Promise<TOrder | null> => {
  const result = await prisma.order.findUnique({
    where: { id },
    include: orderInclude,
  });
  if (!result) throw new ApiError(httpStatus.NOT_FOUND, "Order not found.");
  return result as unknown as TOrder;
};

const updateOrderIntoDB = async (
  id: string,
  payload: TUpdateOrderPayload,
): Promise<TOrder | null> => {
  const order = await prisma.order.findUnique({
    where: { id },
    include: orderInclude,
  });

  if (!order) throw new ApiError(httpStatus.NOT_FOUND, "Order not found.");

  const shippingAddress = payload.shippingAddress ?? {};
  const data: Prisma.OrderUpdateInput = {};
  const existingVariantQty: Record<string, number> = {};

  for (const item of order.items ?? []) {
    if (!item.productVariantId) continue;
    existingVariantQty[item.productVariantId] =
      (existingVariantQty[item.productVariantId] ?? 0) + item.quantity;
  }

  if (shippingAddress.customerName !== undefined)
    data.customerName = shippingAddress.customerName;
  if (shippingAddress.mobile !== undefined)
    data.mobile = shippingAddress.mobile;
  if (shippingAddress.email !== undefined) data.email = shippingAddress.email;
  if (shippingAddress.district !== undefined)
    data.district = shippingAddress.district;
  if (shippingAddress.upazila !== undefined)
    data.upazila = shippingAddress.upazila;
  if (shippingAddress.addressLine !== undefined)
    data.addressLine = shippingAddress.addressLine;
  if (shippingAddress.postalCode !== undefined)
    data.postalCode = shippingAddress.postalCode;
  if (shippingAddress.deliveryChargeZone !== undefined)
    data.deliveryChargeZone = shippingAddress.deliveryChargeZone;

  if (payload.orderNote !== undefined) data.orderNote = payload.orderNote;
  if (payload.shipping !== undefined) data.shipping = payload.shipping as any;
  if (payload.paymentMethod !== undefined)
    data.paymentMethod = payload.paymentMethod as any;
  if (payload.paymentStatus !== undefined)
    data.paymentStatus = payload.paymentStatus as any;

  let processedItems: TOrderItem[] | null = null;
  const stockUpdates: { variantId: string; quantity: number }[] = [];

  if (payload.items) {
    const productIds = payload.items.map((item) => item.productId);
    const productsFromDB = await prisma.product.findMany({
      where: { id: { in: productIds } },
      include: { variants: true },
    });

    let subtotal = 0;
    processedItems = [];

    for (const item of payload.items) {
      const product = productsFromDB.find((p) => p.id === item.productId);
      if (!product)
        throw new ApiError(
          httpStatus.BAD_REQUEST,
          `Product ${item.productId} not found.`,
        );
      if (!product.isActive)
        throw new ApiError(
          httpStatus.BAD_REQUEST,
          `"${product.title}" is unavailable.`,
        );

      let variant = undefined;
      if (item.productVariantId) {
        variant = product.variants.find((v) => v.id === item.productVariantId);
        if (!variant)
          throw new ApiError(
            httpStatus.BAD_REQUEST,
            `Invalid variant for "${product.title}".`,
          );

        const previouslyReserved = existingVariantQty[variant.id] ?? 0;
        const availableStock = variant.stock + previouslyReserved;
        if (availableStock < item.quantity) {
          throw new ApiError(
            httpStatus.BAD_REQUEST,
            `Not enough stock for "${product.title}" (${variant.label}). Available: ${availableStock}.`,
          );
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

      if (variant?.id) {
        stockUpdates.push({
          variantId: variant.id,
          quantity: item.quantity,
        });
      }
    }

    data.subtotal = subtotal as any;
    data.items = {
      deleteMany: {},
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
    };

    const shippingValue =
      payload.shipping !== undefined
        ? payload.shipping
        : Number(order.shipping);
    const discountAmount = Number(order.discountAmount);
    data.totalAmount = subtotal + shippingValue - discountAmount;
  } else if (payload.shipping !== undefined) {
    const subtotal = Number(order.subtotal);
    const discountAmount = Number(order.discountAmount);
    data.totalAmount = subtotal + payload.shipping - discountAmount;
  }

  const result = await prisma.$transaction(async (tx) => {
    if (payload.items) {
      for (const item of order.items ?? []) {
        if (!item.productVariantId) continue;
        await tx.productVariant.update({
          where: { id: item.productVariantId },
          data: { stock: { increment: item.quantity } },
        });
      }
    }

    const updatedOrder = await tx.order.update({
      where: { id },
      data,
      include: orderInclude,
    });

    if (payload.items) {
      for (const update of stockUpdates) {
        await tx.productVariant.update({
          where: { id: update.variantId },
          data: { stock: { decrement: update.quantity } },
        });
      }
    }

    return updatedOrder;
  });

  return result as unknown as TOrder;
};

const updateOrderStatusInDB = async (
  id: string,
  adminId: string,
  payload: { status: string; note?: string; paymentStatus?: string },
): Promise<TOrder | null> => {
  const order = await prisma.order.findUnique({
    where: { id },
    include: { items: true },
  });
  if (!order) throw new ApiError(httpStatus.NOT_FOUND, "Order not found.");

  const isNewlyConfirmed =
    payload.status === OrderStatus.confirmed &&
    order.status !== OrderStatus.confirmed;

  const result = await prisma.$transaction(async (tx) => {
    const updatedOrder = await tx.order.update({
      where: { id },
      data: {
        status: payload.status as any,
        paymentStatus: payload.paymentStatus
          ? (payload.paymentStatus as any)
          : undefined,
        statusHistories: {
          create: {
            status: payload.status as any,
            note: payload.note,
            changedById: adminId,
          },
        },
      },
      include: orderInclude,
    });

    // Increment soldCount for each product when order is confirmed
    if (isNewlyConfirmed) {
      for (const item of order.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { soldCount: { increment: item.quantity } },
        });
      }
    }

    return updatedOrder;
  });

  return result as unknown as TOrder;
};

const trackOrderPublicly = async (payload: {
  trackingNumber?: string;
  mobile?: string;
}): Promise<TPublicOrderTracking[]> => {
  const { trackingNumber, mobile } = payload;

  if (!trackingNumber && !mobile) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Either tracking number or mobile is required.",
    );
  }

  const whereClauses: Prisma.OrderWhereInput[] = [];
  if (trackingNumber) {
    whereClauses.push({ trackingNumber });
  }
  if (mobile) {
    whereClauses.push({ mobile });
  }

  const orders = await prisma.order.findMany({
    where: { OR: whereClauses },
    include: { items: true, statusHistories: true },
  });

  if (!orders.length)
    throw new ApiError(httpStatus.NOT_FOUND, "Order not found.");

  return orders.map((order) => ({
    id: order.id,
    trackingNumber: order.trackingNumber,
    customerName: order.customerName,
    status: order.status as any,
    paymentStatus: order.paymentStatus as any,
    statusHistories: order.statusHistories as any,
    createdAt: order.createdAt,
    items: order.items.map((item) => ({
      productId: item.productId,
      title: item.title,
      variantLabel: item.variantLabel,
      quantity: item.quantity,
      unitPrice: Number(item.unitPrice),
      image: item.image,
    })),
  }));
};

// --- Sales Report ---
export interface TSalesReportRow {
  orderId: string;
  trackingNumber: string;
  customerName: string;
  mobile: string;
  district: string;
  status: string;
  paymentMethod: string;
  paymentStatus: string;
  subtotal: number;
  shipping: number;
  discount: number;
  totalAmount: number;
  itemCount: number;
  createdAt: Date;
}

const getSalesReportFromDB = async (options: {
  startDate?: string;
  endDate?: string;
  status?: string;
  paymentStatus?: string;
  paymentMethod?: string;
}): Promise<TSalesReportRow[]> => {
  const andConditions: Prisma.OrderWhereInput[] = [];

  if (options.startDate) {
    andConditions.push({ createdAt: { gte: new Date(options.startDate) } });
  }
  if (options.endDate) {
    const end = new Date(options.endDate);
    end.setHours(23, 59, 59, 999);
    andConditions.push({ createdAt: { lte: end } });
  }
  if (options.status) {
    andConditions.push({ status: options.status as any });
  }
  if (options.paymentStatus) {
    andConditions.push({ paymentStatus: options.paymentStatus as any });
  }
  if (options.paymentMethod) {
    andConditions.push({ paymentMethod: options.paymentMethod as any });
  }

  const where: Prisma.OrderWhereInput =
    andConditions.length > 0 ? { AND: andConditions } : {};

  const orders = await prisma.order.findMany({
    where,
    include: { items: true },
    orderBy: { createdAt: "desc" },
  });

  return orders.map((order) => ({
    orderId: order.id,
    trackingNumber: order.trackingNumber,
    customerName: order.customerName,
    mobile: order.mobile,
    district: order.district,
    status: order.status,
    paymentMethod: order.paymentMethod,
    paymentStatus: order.paymentStatus,
    subtotal: Number(order.subtotal),
    shipping: Number(order.shipping),
    discount: Number(order.discountAmount),
    totalAmount: Number(order.totalAmount),
    itemCount: order.items.length,
    createdAt: order.createdAt,
  }));
};

export const OrderService = {
  createOrderIntoDB,
  getAllOrdersFromDB,
  getSingleOrderFromDB,
  updateOrderIntoDB,
  updateOrderStatusInDB,
  trackOrderPublicly,
  getSalesReportFromDB,
};
