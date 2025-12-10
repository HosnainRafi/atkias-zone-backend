// src/app/modules/Order/order.interface.ts
import { OrderStatus, PaymentStatus } from "./order.constants";

// --- Embedded Documents ---

// Customer shipping/billing info (embedded in the order)
export type TShippingAddress = {
  customerName: string;
  mobile: string;
  district: string;
  upazila: string;
  addressLine: string;
  postalCode?: string | null;
};

// Snapshot of the item ordered (embedded in the order)
export type TOrderItem = {
  id?: string;
  productId: string;
  productSizeId: string; // ID of the specific size from product.sizes array
  title: string; // Snapshot of product title
  size: string; // Snapshot of product size
  image: string; // Snapshot of product image
  quantity: number;
  unitPrice: number; // The price at the time of order
  totalPrice: number;
};

// For tracking order status changes (embedded in the order)
export type TOrderStatusHistory = {
  id?: string;
  status: (typeof OrderStatus)[number];
  note?: string | null;
  changedById?: string | null; // Ref to Admin
  changedAt: Date;
};

// --- Main Order Interface ---
export type TOrder = {
  id?: string;
  trackingNumber: string;
  // Flattened Shipping Address
  customerName: string;
  mobile: string;
  district: string;
  upazila: string;
  addressLine: string;
  postalCode?: string | null;

  items: TOrderItem[];
  orderNote?: string | null;
  subtotal: number;
  shipping: number; // Shipping cost (can be 0)
  couponId?: string | null; // Ref to Coupon
  discountAmount: number;
  totalAmount: number; // subtotal + shipping - discount
  paymentStatus: (typeof PaymentStatus)[number];
  status: (typeof OrderStatus)[number];
  statusHistory: TOrderStatusHistory[];
  createdAt?: Date;
  updatedAt?: Date;
};

// --- For Zod Validation ---
export type TOrderInputItem = {
  productId: string;
  productSizeId: string; // The _id of the size sub-document
  quantity: number;
};

export type TPublicOrderTracking = {
  trackingNumber: string;
  status: (typeof OrderStatus)[number];
  paymentStatus: (typeof PaymentStatus)[number];
  statusHistory: TOrderStatusHistory[];
  createdAt: Date;
  items: {
    title: string;
    size: string;
    quantity: number;
    image: string;
  }[];
};

export type TCreateOrderPayload = {
  shippingAddress: TShippingAddress;
  items: TOrderInputItem[];
  orderNote?: string;
  shipping?: number;
  couponCode?: string;
};
