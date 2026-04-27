// src/app/modules/Product/product.service.ts
import { Prisma } from '@prisma/client';
import httpStatus from 'http-status';
import ApiError from '../../../errors/ApiError';
import { IGenericResponse } from '../../../interfaces/common';
import calculatePagination from '../../../shared/calculatePagination';
import prisma from '../../../shared/prisma';
import { TProduct } from './product.interface';

// --- Create Product ---
const createProductIntoDB = async (payload: TProduct): Promise<TProduct> => {
  const { variants, tagIds, ...rest } = payload;

  const existingProduct = await prisma.product.findUnique({
    where: { slug: payload.slug },
  });
  if (existingProduct) {
    throw new ApiError(
      httpStatus.CONFLICT,
      'Product with this slug already exists.',
    );
  }

  if (rest.brandId) {
    const brand = await prisma.brand.findUnique({
      where: { id: rest.brandId },
    });
    if (!brand) throw new ApiError(httpStatus.BAD_REQUEST, 'Brand not found.');
  }

  if (tagIds?.length) {
    const existingTags = await prisma.tag.findMany({
      where: { id: { in: tagIds } },
      select: { id: true },
    });
    if (existingTags.length !== new Set(tagIds).size) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        'One or more tags are invalid.',
      );
    }
  }

  const result = await prisma.product.create({
    data: {
      ...rest,
      tags: tagIds?.length
        ? {
            create: tagIds.map(tagId => ({ tagId })),
          }
        : undefined,
      variants: {
        create: variants?.map(v => ({
          label: v.label,
          stock: v.stock,
          priceOverride: v.priceOverride as any,
          sku: v.sku,
        })),
      },
    },
    include: {
      variants: true,
      category: true,
      brand: true,
      tags: { include: { tag: true } },
    },
  });
  return result as unknown as TProduct;
};

// --- Get All Products ---
type TProductFilters = {
  searchTerm?: string;
  category?: string;
  brand?: string;
  minPrice?: string;
  maxPrice?: string;
  isActive?: string;
  newArrival?: string;
  isFeatured?: string;
  isOnOffer?: string;
};

const getAllProductsFromDB = async (
  filters: TProductFilters,
  options: {
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  },
): Promise<IGenericResponse<TProduct[]>> => {
  const {
    searchTerm,
    category,
    brand,
    minPrice,
    maxPrice,
    isActive,
    newArrival,
    isFeatured,
    isOnOffer,
  } = filters;
  const { page, limit, skip, sortBy, sortOrder } = calculatePagination(options);

  const andConditions: Prisma.ProductWhereInput[] = [{ deleted: false }];

  if (searchTerm) {
    andConditions.push({
      OR: [
        { title: { contains: searchTerm, mode: 'insensitive' } },
        { sku: { contains: searchTerm, mode: 'insensitive' } },
        { category: { name: { contains: searchTerm, mode: 'insensitive' } } },
        { brand: { name: { contains: searchTerm, mode: 'insensitive' } } },
      ],
    });
  }

  if (category) {
    const categoryDoc = await prisma.category.findUnique({
      where: { slug: category },
    });
    if (categoryDoc) {
      const subs = await prisma.category.findMany({
        where: { parentId: categoryDoc.id },
      });
      const ids = [categoryDoc.id, ...subs.map(c => c.id)];
      andConditions.push({ categoryId: { in: ids } });
    } else {
      andConditions.push({ id: 'non-existent' });
    }
  }

  if (brand) {
    const brandDoc = await prisma.brand.findFirst({
      where: { OR: [{ slug: brand }, { id: brand }] },
    });
    if (brandDoc) andConditions.push({ brandId: brandDoc.id });
    else andConditions.push({ id: 'non-existent' });
  }

  if (minPrice)
    andConditions.push({ basePrice: { gte: Number(minPrice) as any } });
  if (maxPrice)
    andConditions.push({ basePrice: { lte: Number(maxPrice) as any } });
  if (isActive !== undefined)
    andConditions.push({ isActive: isActive === 'true' });
  if (newArrival !== undefined)
    andConditions.push({ newArrival: newArrival === 'true' });
  if (isFeatured !== undefined)
    andConditions.push({ isFeatured: isFeatured === 'true' });
  if (isOnOffer !== undefined)
    andConditions.push({ isOnOffer: isOnOffer === 'true' });

  const whereCondition: Prisma.ProductWhereInput = { AND: andConditions };

  const [result, total] = await Promise.all([
    prisma.product.findMany({
      where: whereCondition,
      include: {
        variants: true,
        category: true,
        brand: true,
        tags: { include: { tag: true } },
      },
      orderBy: sortBy
        ? { [sortBy]: sortOrder || 'asc' }
        : { productOrder: 'asc' },
      skip,
      take: limit,
    }),
    prisma.product.count({ where: whereCondition }),
  ]);

  return {
    meta: { page, limit, total },
    data: result as unknown as TProduct[],
  };
};

const getSingleProductFromDB = async (
  idOrSlug: string,
): Promise<TProduct | null> => {
  const result = await prisma.product.findFirst({
    where: { OR: [{ id: idOrSlug }, { slug: idOrSlug }], deleted: false },
    include: {
      variants: true,
      category: true,
      brand: true,
      tags: { include: { tag: true } },
      reviews: { where: { isApproved: true } },
    },
  });
  if (!result) throw new ApiError(httpStatus.NOT_FOUND, 'Product not found.');
  return result as unknown as TProduct;
};

const updateProductInDB = async (
  id: string,
  payload: Partial<TProduct>,
): Promise<TProduct | null> => {
  const { variants, tagIds, ...rest } = payload;

  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) throw new ApiError(httpStatus.NOT_FOUND, 'Product not found.');

  if (tagIds) {
    const existingTags = await prisma.tag.findMany({
      where: { id: { in: tagIds } },
      select: { id: true },
    });
    if (existingTags.length !== new Set(tagIds).size) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        'One or more tags are invalid.',
      );
    }
  }

  if (variants) {
    await prisma.productVariant.deleteMany({ where: { productId: id } });
  }

  if (tagIds) {
    await prisma.productTag.deleteMany({ where: { productId: id } });
  }

  const result = await prisma.product.update({
    where: { id },
    data: {
      ...rest,
      tags: tagIds
        ? {
            create: tagIds.map(tagId => ({ tagId })),
          }
        : undefined,
      variants: variants
        ? {
            create: variants.map(v => ({
              label: v.label,
              stock: v.stock,
              priceOverride: v.priceOverride as any,
              sku: v.sku,
            })),
          }
        : undefined,
    },
    include: {
      category: true,
      brand: true,
      variants: true,
      tags: { include: { tag: true } },
    },
  });
  return result as unknown as TProduct;
};

type TDiscountPayload = {
  categoryId: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
};

const applyCategoryDiscountToDB = async (
  payload: TDiscountPayload,
): Promise<{ modifiedCount: number }> => {
  const { categoryId, discountType, discountValue } = payload;

  const category = await prisma.category.findUnique({
    where: { id: categoryId },
  });
  if (!category)
    throw new ApiError(httpStatus.NOT_FOUND, 'Category not found.');

  const products = await prisma.product.findMany({
    where: { categoryId, isActive: true },
  });
  if (products.length === 0)
    throw new ApiError(
      httpStatus.NOT_FOUND,
      'No active products in this category.',
    );

  let modifiedCount = 0;
  await prisma.$transaction(
    products.map(product => {
      const old = Number(product.basePrice);
      let newPrice =
        discountType === 'percentage'
          ? old * (1 - discountValue / 100)
          : old - discountValue;
      newPrice = Math.max(0, parseFloat(newPrice.toFixed(2)));
      modifiedCount++;
      return prisma.product.update({
        where: { id: product.id },
        data: { basePrice: newPrice, compareAtPrice: old },
      });
    }),
  );

  return { modifiedCount };
};

const deleteProductFromDB = async (id: string): Promise<TProduct | null> => {
  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) throw new ApiError(httpStatus.NOT_FOUND, 'Product not found.');
  const result = await prisma.product.update({
    where: { id },
    data: { isActive: false, deleted: true },
  });
  return result as unknown as TProduct;
};

const hardDeleteProductFromDB = async (id: string) => {
  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) throw new ApiError(httpStatus.NOT_FOUND, 'Product not found.');

  const orderCount = await prisma.orderItem.count({ where: { productId: id } });
  if (orderCount > 0) {
    const soft = await prisma.product.update({
      where: { id },
      data: { isActive: false, deleted: true },
    });
    return {
      deleted: false,
      message: 'Product has orders; soft-deleted instead.',
      product: soft as unknown as TProduct,
    };
  }

  await prisma.review.deleteMany({ where: { productId: id } });
  await prisma.productVariant.deleteMany({ where: { productId: id } });
  const result = await prisma.product.delete({ where: { id } });

  return {
    deleted: true,
    message: 'Product permanently deleted.',
    product: result as unknown as TProduct,
  };
};

export const ProductService = {
  createProductIntoDB,
  getAllProductsFromDB,
  getSingleProductFromDB,
  updateProductInDB,
  deleteProductFromDB,
  hardDeleteProductFromDB,
  applyCategoryDiscountToDB,
};
