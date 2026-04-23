// src/app/modules/Order/order.constants.ts
export const ADMIN_ROLE_ORDER = {
  ADMIN: "ADMIN",
  EDITOR: "EDITOR",
} as const;

export const ORDER_STATUS = {
  pending: "pending",
  confirmed: "confirmed",
  processing: "processing",
  shipped: "shipped",
  delivered: "delivered",
  cancelled: "cancelled",
  refunded: "refunded",
} as const;

export const OrderStatus = [
  "pending",
  "confirmed",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
  "refunded",
] as const;

export const PAYMENT_STATUS = {
  pending: "pending",
  paid: "paid",
  failed: "failed",
  refunded: "refunded",
} as const;

export const PaymentStatus = ["pending", "paid", "failed", "refunded"] as const;

export const PAYMENT_METHOD = {
  COD: "COD",
  BKASH: "BKASH",
  NAGAD: "NAGAD",
  CARD: "CARD",
} as const;

export const PaymentMethod = ["COD", "BKASH", "NAGAD", "CARD"] as const;
