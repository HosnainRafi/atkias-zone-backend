// src/app/modules/Order/order.service.ts
import type { Prisma } from '@prisma/client';
import { OrderStatus, PaymentMethod, PaymentStatus } from '@prisma/client';
import httpStatus from 'http-status';
import ApiError from '../../../errors/ApiError';
import { IGenericResponse } from '../../../interfaces/common';
import calculatePagination from '../../../shared/calculatePagination';
import prisma from '../../../shared/prisma';
import {
  CouponService,
  TCouponValidationResponse,
} from '../Coupon/coupon.service';
import { DeliveryChargeService } from '../DeliveryCharge/deliveryCharge.service';
import {
  SteadfastService,
  type TSteadfastCreateParcelPayload,
  type TSteadfastTrackingSnapshot,
  type TSteadfastReturnRequestPayload,
} from '../Steadfast/steadfast.service';
import {
  TCreateOrderPayload,
  TOrder,
  TOrderItem,
  TPublicOrderTracking,
  TUpdateOrderPayload,
} from './order.interface';
import { generateTrackingNumber } from './order.utils';

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

  const productIds = items.map(i => i.productId);
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
    const product = productsFromDB.find(p => p.id === item.productId);
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
      variant = product.variants.find(v => v.id === item.productVariantId);
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
        items.map(i => ({
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
    await DeliveryChargeService.resolveDeliveryCharge(shippingAddress, items);
  const shipping = resolvedDeliveryCharge.fee;
  const totalAmount = subtotal + shipping - discountAmount;
  const trackingNumber = generateTrackingNumber();

  const result = await prisma.$transaction(async tx => {
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
          create: processedItems.map(item => ({
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
          create: { status: OrderStatus.pending, note: 'Order placed' },
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
  sortOrder?: 'asc' | 'desc';
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
          trackingNumber: { contains: options.searchTerm, mode: 'insensitive' },
        },
        { customerName: { contains: options.searchTerm, mode: 'insensitive' } },
        { mobile: { contains: options.searchTerm, mode: 'insensitive' } },
        { email: { contains: options.searchTerm, mode: 'insensitive' } },
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
        ? { [sortBy]: sortOrder || 'desc' }
        : { createdAt: 'desc' },
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
  if (!result) throw new ApiError(httpStatus.NOT_FOUND, 'Order not found.');
  return result as unknown as TOrder;
};

function buildSteadfastAddress(order: TOrder): string {
  return [order.addressLine, order.upazila, order.district, order.postalCode]
    .filter(Boolean)
    .join(', ')
    .slice(0, 250);
}

function buildSteadfastItemDescription(order: TOrder): string {
  return order.items
    .map(item =>
      item.variantLabel ? `${item.title} (${item.variantLabel})` : item.title,
    )
    .join(', ')
    .slice(0, 250);
}

function trimOptional(
  value?: string | null,
  maxLength?: number,
): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  return maxLength ? trimmed.slice(0, maxLength) : trimmed;
}

function getDefaultSteadfastPayload(
  order: TOrder,
): TSteadfastCreateParcelPayload {
  return {
    invoice: order.trackingNumber,
    recipient_name: order.customerName.slice(0, 100),
    recipient_phone: order.mobile.trim(),
    recipient_address: buildSteadfastAddress(order),
    cod_amount:
      order.paymentMethod === PaymentMethod.COD ? Number(order.totalAmount) : 0,
    delivery_type: 0,
    recipient_email: order.email || undefined,
    note: order.orderNote?.slice(0, 250) || undefined,
    item_description: buildSteadfastItemDescription(order),
    total_lot: order.items.reduce((sum, item) => sum + item.quantity, 0),
  };
}

function getSteadfastPayload(
  order: TOrder,
  overrides?: Partial<TSteadfastCreateParcelPayload>,
): TSteadfastCreateParcelPayload {
  const defaults = getDefaultSteadfastPayload(order);

  return {
    invoice: trimOptional(overrides?.invoice, 100) || defaults.invoice,
    recipient_name:
      trimOptional(overrides?.recipient_name, 100) || defaults.recipient_name,
    recipient_phone:
      trimOptional(overrides?.recipient_phone, 20) || defaults.recipient_phone,
    recipient_address:
      trimOptional(overrides?.recipient_address, 250) ||
      defaults.recipient_address,
    cod_amount: overrides?.cod_amount ?? defaults.cod_amount,
    delivery_type: overrides?.delivery_type ?? defaults.delivery_type,
    alternative_phone: trimOptional(overrides?.alternative_phone, 20),
    recipient_email:
      trimOptional(overrides?.recipient_email, 120) || defaults.recipient_email,
    note: trimOptional(overrides?.note, 250) || defaults.note,
    item_description:
      trimOptional(overrides?.item_description, 250) ||
      defaults.item_description,
    total_lot: overrides?.total_lot ?? defaults.total_lot,
  };
}

function toCleanString(value: unknown): string | undefined {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed || undefined;
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }

  return undefined;
}

function toOptionalNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;

  if (typeof value === 'string' && value.trim()) {
    const numeric = Number(value);
    if (Number.isFinite(numeric)) return numeric;
  }

  return undefined;
}

function asRecord(payload: unknown): Record<string, unknown> | null {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return null;
  }

  return payload as Record<string, unknown>;
}

const createSteadfastParcelInDB = async (
  id: string,
  overrides?: Partial<TSteadfastCreateParcelPayload>,
): Promise<TOrder> => {
  const order = await prisma.order.findUnique({
    where: { id },
    include: orderInclude,
  });

  if (!order) throw new ApiError(httpStatus.NOT_FOUND, 'Order not found.');

  if (order.steadfastConsignmentId || order.steadfastTrackingCode) {
    throw new ApiError(
      httpStatus.CONFLICT,
      'This order has already been sent to Steadfast.',
    );
  }

  if (
    order.status === OrderStatus.delivered ||
    order.status === OrderStatus.cancelled ||
    order.status === OrderStatus.refunded
  ) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      'Delivered, cancelled, or refunded orders cannot be sent to Steadfast.',
    );
  }

  const requestPayload = getSteadfastPayload(
    order as unknown as TOrder,
    overrides,
  );
  const parcel = await SteadfastService.createParcel(requestPayload);

  const updatedOrder = await prisma.order.update({
    where: { id },
    data: {
      steadfastConsignmentId: parcel.consignmentId,
      steadfastTrackingCode: parcel.trackingCode,
      steadfastStatus: parcel.status,
      steadfastRequestedAt: new Date(),
      steadfastResponse: {
        createParcelRequest: requestPayload,
        createParcelResponse: parcel.rawResponse,
      } as Prisma.InputJsonValue,
    },
    include: orderInclude,
  });

  return updatedOrder as unknown as TOrder;
};

const syncSteadfastParcelStatusInDB = async (id: string): Promise<TOrder> => {
  const order = await prisma.order.findUnique({
    where: { id },
    include: orderInclude,
  });

  if (!order) throw new ApiError(httpStatus.NOT_FOUND, 'Order not found.');

  if (!order.steadfastConsignmentId) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      'This order has not been sent to Steadfast yet.',
    );
  }

  const trackingSnapshot: TSteadfastTrackingSnapshot =
    await SteadfastService.getTrackingSnapshot({
      consignmentId: order.steadfastConsignmentId,
      invoice: order.trackingNumber,
      trackingCode: order.steadfastTrackingCode || undefined,
    });

  const statusResult = trackingSnapshot.statuses.consignmentId;
  const existingSteadfastResponse =
    order.steadfastResponse && typeof order.steadfastResponse === 'object'
      ? (order.steadfastResponse as Record<string, unknown>)
      : {};

  const updatedOrder = await prisma.order.update({
    where: { id },
    data: {
      steadfastStatus: statusResult.status,
      steadfastResponse: {
        ...existingSteadfastResponse,
        latestStatusResponse: statusResult.rawResponse,
        latestSync: trackingSnapshot,
      } as Prisma.InputJsonValue,
    },
    include: orderInclude,
  });

  return updatedOrder as unknown as TOrder;
};

const createSteadfastBulkParcelsInDB = async (
  orderIds: string[],
): Promise<{ results: unknown[]; updatedOrders: TOrder[] }> => {
  const orders = await prisma.order.findMany({
    where: { id: { in: orderIds } },
    include: orderInclude,
  });

  if (!orders.length) {
    throw new ApiError(httpStatus.NOT_FOUND, 'No orders found.');
  }

  const results: unknown[] = [];
  const eligibleOrders: TOrder[] = [];

  for (const order of orders as unknown as TOrder[]) {
    if (order.steadfastConsignmentId || order.steadfastTrackingCode) {
      results.push({
        orderId: order.id,
        invoice: order.trackingNumber,
        error: 'Parcel already sent to Steadfast.',
      });
      continue;
    }

    if (
      order.status === OrderStatus.delivered ||
      order.status === OrderStatus.cancelled ||
      order.status === OrderStatus.refunded
    ) {
      results.push({
        orderId: order.id,
        invoice: order.trackingNumber,
        error: 'Delivered, cancelled, or refunded orders cannot be sent.',
      });
      continue;
    }

    eligibleOrders.push(order);
  }

  if (!eligibleOrders.length) {
    return { results, updatedOrders: [] };
  }

  const payloads = eligibleOrders.map(order =>
    getSteadfastPayload(order as TOrder),
  );

  const bulkResponse = await SteadfastService.createBulkParcels(payloads);
  const responseItems = bulkResponse.items;

  const updates: Prisma.PrismaPromise<unknown>[] = [];
  const updatedOrders: TOrder[] = [];
  const orderByInvoice = new Map(
    eligibleOrders.map(order => [order.trackingNumber, order]),
  );
  const payloadByInvoice = new Map(
    payloads.map(payload => [payload.invoice, payload]),
  );

  for (const item of responseItems) {
    const record = asRecord(item) || {};
    const invoice = toCleanString(record.invoice);
    const consignmentId = toOptionalNumber(record.consignment_id);
    const trackingCode = toCleanString(record.tracking_code);
    const status =
      toCleanString(record.status) ||
      toCleanString(record.delivery_status) ||
      'pending';
    const error = toCleanString(record.error);

    results.push({
      invoice,
      consignmentId,
      trackingCode,
      status,
      error,
      rawResponse: item,
    });

    if (!invoice || !consignmentId || !trackingCode) continue;
    const order = orderByInvoice.get(invoice);
    if (!order) continue;

    const existingSteadfastResponse =
      order.steadfastResponse && typeof order.steadfastResponse === 'object'
        ? (order.steadfastResponse as Record<string, unknown>)
        : {};

    updates.push(
      prisma.order.update({
        where: { id: order.id },
        data: {
          steadfastConsignmentId: consignmentId,
          steadfastTrackingCode: trackingCode,
          steadfastStatus: status,
          steadfastRequestedAt: new Date(),
          steadfastResponse: {
            ...existingSteadfastResponse,
            bulkCreateRequest: payloadByInvoice.get(invoice),
            bulkCreateResponse: item,
            bulkCreateRaw: bulkResponse.rawResponse,
          } as Prisma.InputJsonValue,
        },
        include: orderInclude,
      }) as unknown as Prisma.PrismaPromise<TOrder>,
    );
  }

  if (updates.length) {
    const updated = (await prisma.$transaction(updates)) as TOrder[];
    updatedOrders.push(...updated);
  }

  return { results, updatedOrders };
};

const createSteadfastReturnRequestInDB = async (
  id: string,
  payload: {
    reason: string;
    consignmentId?: number;
    invoice?: string;
    trackingCode?: string;
  },
): Promise<TOrder> => {
  const order = await prisma.order.findUnique({
    where: { id },
    include: orderInclude,
  });

  if (!order) throw new ApiError(httpStatus.NOT_FOUND, 'Order not found.');

  const requestPayload: TSteadfastReturnRequestPayload = {
    reason: payload.reason.trim(),
  };

  if (payload.consignmentId) {
    requestPayload.consignment_id = String(payload.consignmentId);
  }

  if (payload.invoice) {
    requestPayload.invoice = payload.invoice.trim();
  }

  if (payload.trackingCode) {
    requestPayload.tracking_code = payload.trackingCode.trim();
  }

  if (!requestPayload.consignment_id) {
    if (order.steadfastConsignmentId) {
      requestPayload.consignment_id = String(order.steadfastConsignmentId);
    } else if (order.steadfastTrackingCode) {
      requestPayload.tracking_code = order.steadfastTrackingCode;
    } else if (order.trackingNumber) {
      requestPayload.invoice = order.trackingNumber;
    }
  }

  if (
    !requestPayload.consignment_id &&
    !requestPayload.tracking_code &&
    !requestPayload.invoice
  ) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      'No Steadfast identifier found for this order.',
    );
  }

  const response = await SteadfastService.createReturnRequest(requestPayload);
  const existingSteadfastResponse =
    order.steadfastResponse && typeof order.steadfastResponse === 'object'
      ? (order.steadfastResponse as Record<string, unknown>)
      : {};

  const updatedOrder = await prisma.order.update({
    where: { id },
    data: {
      steadfastResponse: {
        ...existingSteadfastResponse,
        returnRequest: {
          request: requestPayload,
          response,
        },
      } as Prisma.InputJsonValue,
    },
    include: orderInclude,
  });

  return updatedOrder as unknown as TOrder;
};

const getSteadfastReturnRequestsFromAPI = async (): Promise<unknown> => {
  return SteadfastService.getReturnRequests();
};

const getSteadfastReturnRequestByIdFromAPI = async (
  returnId: string,
): Promise<unknown> => {
  return SteadfastService.getReturnRequestById(returnId);
};

const getSteadfastBalanceFromAPI = async (): Promise<unknown> => {
  return SteadfastService.getBalance();
};

const getSteadfastStatusByConsignmentIdFromAPI = async (
  consignmentId: number,
): Promise<unknown> => {
  return SteadfastService.getParcelStatusByConsignmentId(consignmentId);
};

const getSteadfastTrackingsByInvoiceFromAPI = async (
  invoice: string,
): Promise<unknown> => {
  return SteadfastService.getTrackingsByInvoice(invoice);
};

const checkSteadfastFraudFromAPI = async (phone: string): Promise<unknown> => {
  return SteadfastService.fraudCheck(phone);
};

const updateOrderIntoDB = async (
  id: string,
  payload: TUpdateOrderPayload,
): Promise<TOrder | null> => {
  const order = await prisma.order.findUnique({
    where: { id },
    include: orderInclude,
  });

  if (!order) throw new ApiError(httpStatus.NOT_FOUND, 'Order not found.');

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
    const productIds = payload.items.map(item => item.productId);
    const productsFromDB = await prisma.product.findMany({
      where: { id: { in: productIds } },
      include: { variants: true },
    });

    let subtotal = 0;
    processedItems = [];

    for (const item of payload.items) {
      const product = productsFromDB.find(p => p.id === item.productId);
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
        variant = product.variants.find(v => v.id === item.productVariantId);
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
      create: processedItems.map(item => ({
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

  const result = await prisma.$transaction(async tx => {
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
  if (!order) throw new ApiError(httpStatus.NOT_FOUND, 'Order not found.');

  const isNewlyConfirmed =
    payload.status === OrderStatus.confirmed &&
    order.status !== OrderStatus.confirmed;

  const result = await prisma.$transaction(async tx => {
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
      'Either tracking number or mobile is required.',
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
    throw new ApiError(httpStatus.NOT_FOUND, 'Order not found.');

  return orders.map(order => ({
    id: order.id,
    trackingNumber: order.trackingNumber,
    customerName: order.customerName,
    status: order.status as any,
    paymentStatus: order.paymentStatus as any,
    statusHistories: order.statusHistories as any,
    createdAt: order.createdAt,
    items: order.items.map(item => ({
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
    orderBy: { createdAt: 'desc' },
  });

  return orders.map(order => ({
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
  createSteadfastParcelInDB,
  createSteadfastBulkParcelsInDB,
  createSteadfastReturnRequestInDB,
  getSteadfastReturnRequestsFromAPI,
  getSteadfastReturnRequestByIdFromAPI,
  getSteadfastBalanceFromAPI,
  getSteadfastStatusByConsignmentIdFromAPI,
  getSteadfastTrackingsByInvoiceFromAPI,
  checkSteadfastFraudFromAPI,
  syncSteadfastParcelStatusInDB,
  updateOrderIntoDB,
  updateOrderStatusInDB,
  trackOrderPublicly,
  getSalesReportFromDB,
};
