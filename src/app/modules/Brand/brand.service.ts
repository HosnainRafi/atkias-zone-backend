// src/app/modules/Brand/brand.service.ts
import httpStatus from "http-status";
import ApiError from "../../../errors/ApiError";
import prisma from "../../../shared/prisma";
import { TBrand } from "./brand.interface";

const createBrandIntoDB = async (payload: TBrand): Promise<TBrand> => {
  const existing = await prisma.brand.findUnique({
    where: { slug: payload.slug },
  });
  if (existing)
    throw new ApiError(
      httpStatus.CONFLICT,
      `Brand with slug "${payload.slug}" already exists.`,
    );

  const result = await prisma.brand.create({ data: payload });
  return result as unknown as TBrand;
};

const getAllBrandsFromDB = async (): Promise<TBrand[]> => {
  const result = await prisma.brand.findMany({
    where: { deleted: false },
    orderBy: [{ order: "asc" }, { name: "asc" }],
  });
  return result as unknown as TBrand[];
};

const getSingleBrandFromDB = async (
  idOrSlug: string,
): Promise<TBrand | null> => {
  const result = await prisma.brand.findFirst({
    where: { OR: [{ id: idOrSlug }, { slug: idOrSlug }], deleted: false },
    include: { products: { where: { deleted: false }, take: 20 } },
  });
  if (!result) throw new ApiError(httpStatus.NOT_FOUND, "Brand not found.");
  return result as unknown as TBrand;
};

const updateBrandInDB = async (
  id: string,
  payload: Partial<TBrand>,
): Promise<TBrand> => {
  const brand = await prisma.brand.findUnique({ where: { id } });
  if (!brand) throw new ApiError(httpStatus.NOT_FOUND, "Brand not found.");

  const result = await prisma.brand.update({ where: { id }, data: payload });
  return result as unknown as TBrand;
};

const deleteBrandFromDB = async (id: string): Promise<TBrand> => {
  const brand = await prisma.brand.findUnique({ where: { id } });
  if (!brand) throw new ApiError(httpStatus.NOT_FOUND, "Brand not found.");

  const productCount = await prisma.product.count({ where: { brandId: id } });
  if (productCount > 0) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      `Cannot delete: ${productCount} product(s) are linked to this brand.`,
    );
  }

  const result = await prisma.brand.update({
    where: { id },
    data: { deleted: true, isActive: false },
  });
  return result as unknown as TBrand;
};

export const BrandService = {
  createBrandIntoDB,
  getAllBrandsFromDB,
  getSingleBrandFromDB,
  updateBrandInDB,
  deleteBrandFromDB,
};
