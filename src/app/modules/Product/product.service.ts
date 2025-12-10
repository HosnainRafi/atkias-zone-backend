// src/app/modules/Product/product.service.ts
import httpStatus from "http-status";
import ApiError from "../../../errors/ApiError";
import { IGenericResponse } from "../../../interfaces/common";
import calculatePagination from "../../../shared/calculatePagination";
import prisma from "../../../shared/prisma";
import { TProduct } from "./product.interface";
import { TCategoryGender } from "../Category/category.interface";
import { Prisma } from "@prisma/client";

// --- Create Product ---
const createProductIntoDB = async (payload: TProduct): Promise<TProduct> => {
  const { sizes, ...rest } = payload;

  // Check slug uniqueness
  const existingProduct = await prisma.product.findUnique({
    where: { slug: payload.slug },
  });
  if (existingProduct) {
    throw new ApiError(
      httpStatus.CONFLICT,
      "Product with this slug already exists."
    );
  }

  const result = await prisma.product.create({
    data: {
      ...rest,
      sizes: {
        create: sizes?.map((size) => ({
          size: size.size,
          stock: size.stock,
          priceOverride: size.priceOverride,
          sku: size.sku,
        })),
      },
    },
    include: {
      sizes: true,
      category: true,
    },
  });
  return result as unknown as TProduct;
};

// --- Get All Products (with Pagination, Filtering, Sorting) ---
type TProductFilters = {
  searchTerm?: string;
  category?: string;
  size?: string;
  minPrice?: string;
  maxPrice?: string;
  isActive?: string;
  newArrival?: string;
  gender?: TCategoryGender;
};

const getAllProductsFromDB = async (
  filters: TProductFilters,
  options: {
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
  }
): Promise<IGenericResponse<TProduct[]>> => {
  const {
    searchTerm,
    category,
    size,
    minPrice,
    maxPrice,
    isActive,
    newArrival,
    gender,
  } = filters;
  const { page, limit, skip, sortBy, sortOrder } = calculatePagination(options);

  const andConditions: Prisma.ProductWhereInput[] = [];

  // --- Search Logic ---
  if (searchTerm) {
    andConditions.push({
      OR: [
        { title: { contains: searchTerm, mode: "insensitive" } },
        { sku: { contains: searchTerm, mode: "insensitive" } },
        {
          category: {
            name: { contains: searchTerm, mode: "insensitive" },
          },
        },
      ],
    });
  }

  // --- Category & Gender Filters ---
  if (category) {
    // Find category by slug to get ID
    const categoryDoc = await prisma.category.findUnique({
      where: { slug: category },
    });

    if (categoryDoc) {
      // Find subcategories
      const subcategories = await prisma.category.findMany({
        where: { parentId: categoryDoc.id },
      });
      const categoryIds = [categoryDoc.id, ...subcategories.map((c) => c.id)];
      andConditions.push({ categoryId: { in: categoryIds } });
    } else {
      // If category not found, return empty
      andConditions.push({ categoryId: "invalid_id" });
    }
  }

  if (gender) {
    // Find categories with this gender
    const genderCategories = await prisma.category.findMany({
      where: { gender: gender },
    });
    const genderCategoryIds = genderCategories.map((c) => c.id);
    andConditions.push({ categoryId: { in: genderCategoryIds } });
  }

  // Size filter
  if (size) {
    andConditions.push({
      sizes: {
        some: {
          size: size,
          stock: { gt: 0 },
        },
      },
    });
  }

  // Price filter
  if (minPrice) {
    andConditions.push({ basePrice: { gte: Number(minPrice) } });
  }
  if (maxPrice) {
    andConditions.push({ basePrice: { lte: Number(maxPrice) } });
  }

  // Activity filter
  if (isActive !== undefined) {
    andConditions.push({ isActive: isActive === "true" });
  }

  // Always hide deleted products
  andConditions.push({ deleted: false });

  if (newArrival === "true") {
    andConditions.push({ newArrival: true });
  }

  const whereConditions: Prisma.ProductWhereInput =
    andConditions.length > 0 ? { AND: andConditions } : {};

  const result = await prisma.product.findMany({
    where: whereConditions,
    include: {
      category: true,
      sizes: true,
    },
    orderBy: sortBy ? { [sortBy]: sortOrder || "asc" } : undefined,
    skip,
    take: limit,
  });

  const total = await prisma.product.count({ where: whereConditions });

  return {
    meta: { page, limit, total },
    data: result as unknown as TProduct[],
  };
};

const getSingleProductFromDB = async (
  idOrSlug: string
): Promise<TProduct | null> => {
  // Check if it's a valid UUID (Prisma uses UUIDs usually, or CUIDs)
  // Simple check: if it looks like a UUID or we try both
  let product = await prisma.product.findUnique({
    where: { id: idOrSlug },
    include: { category: true, sizes: true },
  });

  if (!product) {
    product = await prisma.product.findUnique({
      where: { slug: idOrSlug },
      include: { category: true, sizes: true },
    });
  }

  if (!product || product.deleted) {
    throw new ApiError(httpStatus.NOT_FOUND, "Product not found.");
  }

  return product as unknown as TProduct;
};

// --- Update Product ---
const updateProductInDB = async (
  id: string,
  payload: Partial<TProduct>
): Promise<TProduct | null> => {
  const { sizes, ...rest } = payload;

  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) {
    throw new ApiError(httpStatus.NOT_FOUND, "Product not found.");
  }

  // Handle sizes update: Delete all and recreate (simplest strategy for now)
  // Or update if IDs are provided. For simplicity, let's assume full replacement if sizes are provided.
  if (sizes) {
    await prisma.productSize.deleteMany({ where: { productId: id } });
  }

  const result = await prisma.product.update({
    where: { id },
    data: {
      ...rest,
      sizes: sizes
        ? {
            create: sizes.map((size) => ({
              size: size.size,
              stock: size.stock,
              priceOverride: size.priceOverride,
              sku: size.sku,
            })),
          }
        : undefined,
    },
    include: {
      category: true,
      sizes: true,
    },
  });

  return result as unknown as TProduct;
};

type TDiscountPayload = {
  categoryId: string;
  discountType: "percentage" | "fixed";
  discountValue: number;
};

const applyCategoryDiscountToDB = async (
  payload: TDiscountPayload
): Promise<{ modifiedCount: number }> => {
  const { categoryId, discountType, discountValue } = payload;

  // 1. Check if category exists
  const category = await prisma.category.findUnique({
    where: { id: categoryId },
  });
  if (!category) {
    throw new ApiError(httpStatus.NOT_FOUND, "Category not found.");
  }

  // 2. Find all active products in this category
  const products = await prisma.product.findMany({
    where: {
      categoryId: categoryId,
      isActive: true,
    },
  });

  if (products.length === 0) {
    throw new ApiError(
      httpStatus.NOT_FOUND,
      "No active products found in this category."
    );
  }

  // 3. Update products one by one (Prisma doesn't support calculated updates in updateMany)
  let modifiedCount = 0;

  await prisma.$transaction(
    products.map((product) => {
      const oldPrice = product.basePrice;
      let newPrice = 0;

      if (discountType === "percentage") {
        if (discountValue >= 100) {
          throw new Error("Percentage discount must be less than 100.");
        }
        newPrice = oldPrice * (1 - discountValue / 100);
      } else {
        newPrice = oldPrice - discountValue;
      }

      newPrice = Math.max(0, newPrice);
      newPrice = parseFloat(newPrice.toFixed(2));

      modifiedCount++;

      return prisma.product.update({
        where: { id: product.id },
        data: {
          basePrice: newPrice,
          compareAtPrice: oldPrice,
        },
      });
    })
  );

  return {
    modifiedCount,
  };
};

const deleteProductFromDB = async (id: string): Promise<TProduct | null> => {
  const result = await prisma.product.update({
    where: { id },
    data: { isActive: false },
  });

  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, "Product not found.");
  }
  return result as unknown as TProduct;
};

// --- MODIFIED HARD DELETE FUNCTION ---
const hardDeleteProductFromDB = async (
  id: string
): Promise<{
  deleted: boolean;
  message: string;
  product: TProduct | null;
}> => {
  // 1. Check if product exists
  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) {
    throw new ApiError(httpStatus.NOT_FOUND, "Product not found.");
  }

  // 2. Check if product exists in any Orders
  // Note: OrderItem table links to Product
  const orderCount = await prisma.orderItem.count({
    where: { productId: id },
  });

  // 3. DECISION: Hard delete or Soft delete with 'deleted' flag?
  if (orderCount > 0) {
    // --- Perform SOFT DELETE with DELETED flag ---
    if (!product.isActive && product.deleted) {
      return {
        deleted: true,
        message:
          "Product is associated with orders and was already marked as deleted (inactive). No action taken.",
        product: product as unknown as TProduct,
      };
    }
    // Set inactive AND deleted: true
    const softDeletedProduct = await prisma.product.update({
      where: { id },
      data: { isActive: false, deleted: true },
    });
    return {
      deleted: true,
      message:
        "Product is associated with orders. Marked as deleted (set inactive and deleted flag) instead of permanent deletion.",
      product: softDeletedProduct as unknown as TProduct,
    };
  } else {
    // --- Proceed with HARD DELETE ---
    // a. Delete associated reviews
    await prisma.review.deleteMany({ where: { productId: id } });

    // b. Delete associated sizes
    await prisma.productSize.deleteMany({ where: { productId: id } });

    // c. Perform hard delete
    const hardDeletedProduct = await prisma.product.delete({
      where: { id },
    });

    return {
      deleted: true,
      message:
        "Product permanently deleted successfully (including associated reviews).",
      product: hardDeletedProduct as unknown as TProduct,
    };
  }
};

export const ProductService = {
  createProductIntoDB,
  getAllProductsFromDB,
  getSingleProductFromDB,
  updateProductInDB,
  deleteProductFromDB,
  applyCategoryDiscountToDB,
  hardDeleteProductFromDB,
};
