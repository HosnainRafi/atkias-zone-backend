// src/app/modules/Product/product.interface.ts

// Interface for the embedded size object
export type TProductSize = {
  id?: string;
  size: string;
  stock: number;
  priceOverride?: number | null;
  sku?: string | null;
  productId?: string;
};

// Interface for the main Product
export type TProduct = {
  id?: string;
  title: string;
  slug: string;
  description?: string | null;
  categoryId: string;
  basePrice: number;
  compareAtPrice?: number | null;
  images: string[];
  sizes?: TProductSize[];
  sku?: string | null;
  isActive: boolean;
  averageRating: number;
  newArrival: boolean;
  productOrder: number;
  deleted: boolean;
  createdAt?: Date;
  updatedAt?: Date;
};
