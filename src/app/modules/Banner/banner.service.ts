// src/app/modules/Banner/banner.service.ts
import httpStatus from "http-status";
import ApiError from "../../../errors/ApiError";
import prisma from "../../../shared/prisma";
import { TBanner, TBannerPosition } from "./banner.interface";

const createBannerIntoDB = async (
  payload: TBanner,
  adminId: string,
): Promise<TBanner> => {
  const result = await prisma.banner.create({
    data: { ...payload, createdById: adminId } as any,
  });
  return result as unknown as TBanner;
};

const getAllBannersFromDB = async (
  position?: TBannerPosition,
): Promise<TBanner[]> => {
  const now = new Date();
  const result = await prisma.banner.findMany({
    where: {
      deleted: false,
      ...(position ? { position } : {}),
      OR: [{ validFrom: null }, { validFrom: { lte: now } }],
      AND: [{ OR: [{ validUntil: null }, { validUntil: { gte: now } }] }],
    },
    orderBy: { order: "asc" },
  });
  return result as unknown as TBanner[];
};

const getAllBannersAdminFromDB = async (): Promise<TBanner[]> => {
  const result = await prisma.banner.findMany({
    where: { deleted: false },
    orderBy: [{ position: "asc" }, { order: "asc" }],
    include: { createdBy: { select: { id: true, name: true } } },
  });
  return result as unknown as TBanner[];
};

const getSingleBannerFromDB = async (id: string): Promise<TBanner> => {
  const result = await prisma.banner.findFirst({
    where: { id, deleted: false },
  });
  if (!result) throw new ApiError(httpStatus.NOT_FOUND, "Banner not found.");
  return result as unknown as TBanner;
};

const updateBannerInDB = async (
  id: string,
  payload: Partial<TBanner>,
): Promise<TBanner> => {
  const banner = await prisma.banner.findUnique({ where: { id } });
  if (!banner) throw new ApiError(httpStatus.NOT_FOUND, "Banner not found.");

  const result = await prisma.banner.update({
    where: { id },
    data: payload as any,
  });
  return result as unknown as TBanner;
};

const deleteBannerFromDB = async (id: string): Promise<TBanner> => {
  const banner = await prisma.banner.findUnique({ where: { id } });
  if (!banner) throw new ApiError(httpStatus.NOT_FOUND, "Banner not found.");

  const result = await prisma.banner.update({
    where: { id },
    data: { deleted: true, isActive: false },
  });
  return result as unknown as TBanner;
};

export const BannerService = {
  createBannerIntoDB,
  getAllBannersFromDB,
  getAllBannersAdminFromDB,
  getSingleBannerFromDB,
  updateBannerInDB,
  deleteBannerFromDB,
};
