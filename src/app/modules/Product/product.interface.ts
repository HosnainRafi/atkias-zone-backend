// src/app/modules/Product/product.interface.ts
import { Decimal } from '@prisma/client/runtime/library';

export type TProductVariant = {
  id?: string;
  label: string; // e.g. "150ml", "50g", "Shade: Rose"
  stock: number;
  priceOverride?: Decimal | number | null;
  sku?: string | null;
  productId?: string;
};

export type TProduct = {
  id?: string;
  title: string;
  slug: string;
  description?: string | null;
  howToUse?: string | null;
  ingredients?: string | null;
  categoryId: string;
  brandId?: string | null;
  basePrice: Decimal | number;
  compareAtPrice?: Decimal | number | null;
  appPrice?: Decimal | number | null;
  images: string[];
  tagIds?: string[];
  variants?: TProductVariant[];
  sku?: string | null;
  isActive: boolean;
  averageRating: number;
  newArrival: boolean;
  isFeatured: boolean;
  isOnOffer: boolean;
  productOrder: number;
  deleted: boolean;
  createdAt?: Date;
  updatedAt?: Date;
};
