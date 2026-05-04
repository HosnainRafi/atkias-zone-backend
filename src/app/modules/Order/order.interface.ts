// src/app/modules/Order/order.interface.ts
import { OrderStatus, PaymentStatus, PaymentMethod } from './order.constants';

export type TShippingAddress = {
  customerName: string;
  mobile: string;
  email?: string | null;
  district: string;
  upazila: string;
  addressLine: string;
  postalCode?: string | null;
  deliveryChargeZone?: string | null;
};

export type TOrderItem = {
  id?: string;
  productId: string;
  productVariantId?: string | null;
  title: string;
  variantLabel?: string | null;
  image: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
};

export type TOrderStatusHistory = {
  id?: string;
  status: (typeof OrderStatus)[number];
  note?: string | null;
  changedById?: string | null;
  changedAt: Date;
};

export type TOrder = {
  id?: string;
  trackingNumber: string;
  customerName: string;
  email?: string | null;
  mobile: string;
  district: string;
  upazila: string;
  addressLine: string;
  postalCode?: string | null;
  deliveryChargeZone?: string | null;
  orderNote?: string | null;
  isGuestOrder?: boolean;
  items: TOrderItem[];
  subtotal: number;
  shipping: number;
  couponId?: string | null;
  discountAmount: number;
  totalAmount: number;
  paymentMethod?: (typeof PaymentMethod)[number];
  paymentStatus: (typeof PaymentStatus)[number];
  transactionId?: string | null;
  steadfastConsignmentId?: number | null;
  steadfastTrackingCode?: string | null;
  steadfastStatus?: string | null;
  steadfastRequestedAt?: Date | null;
  steadfastResponse?: unknown;
  status: (typeof OrderStatus)[number];
  statusHistories: TOrderStatusHistory[];
  createdAt?: Date;
  updatedAt?: Date;
};

export type TOrderInputItem = {
  productId: string;
  productVariantId?: string | null;
  quantity: number;
};

export type TCreateOrderPayload = {
  shippingAddress: TShippingAddress;
  items: TOrderInputItem[];
  orderNote?: string;
  shipping?: number;
  couponCode?: string;
  paymentMethod?: (typeof PaymentMethod)[number];
};

export type TUpdateOrderPayload = {
  shippingAddress?: Partial<TShippingAddress>;
  items?: TOrderInputItem[];
  orderNote?: string;
  shipping?: number;
  paymentMethod?: (typeof PaymentMethod)[number];
  paymentStatus?: (typeof PaymentStatus)[number];
};

export type TPublicOrderTracking = {
  id: string;
  trackingNumber: string;
  customerName: string;
  status: (typeof OrderStatus)[number];
  paymentStatus: (typeof PaymentStatus)[number];
  statusHistories: TOrderStatusHistory[];
  createdAt: Date;
  items: {
    productId: string;
    title: string;
    variantLabel?: string | null;
    quantity: number;
    unitPrice: number;
    image: string;
  }[];
};
