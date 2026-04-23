// src/app/modules/Banner/banner.controller.ts
import { Request, Response } from "express";
import httpStatus from "http-status";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { TBanner, TBannerPosition } from "./banner.interface";
import { BannerService } from "./banner.service";

const createBanner = catchAsync(async (req: Request, res: Response) => {
  const result = await BannerService.createBannerIntoDB(
    req.body,
    req.user!.userId,
  );
  sendResponse<TBanner>(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Banner created!",
    data: result,
  });
});

const getAllBanners = catchAsync(async (req: Request, res: Response) => {
  const position = req.query.position as TBannerPosition | undefined;
  const result = await BannerService.getAllBannersFromDB(position);
  sendResponse<TBanner[]>(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Banners retrieved!",
    data: result,
  });
});

const getAllBannersAdmin = catchAsync(async (req: Request, res: Response) => {
  const result = await BannerService.getAllBannersAdminFromDB();
  sendResponse<TBanner[]>(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "All banners retrieved!",
    data: result,
  });
});

const getSingleBanner = catchAsync(async (req: Request, res: Response) => {
  const result = await BannerService.getSingleBannerFromDB(req.params.id);
  sendResponse<TBanner>(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Banner retrieved!",
    data: result,
  });
});

const updateBanner = catchAsync(async (req: Request, res: Response) => {
  const result = await BannerService.updateBannerInDB(req.params.id, req.body);
  sendResponse<TBanner>(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Banner updated!",
    data: result,
  });
});

const deleteBanner = catchAsync(async (req: Request, res: Response) => {
  const result = await BannerService.deleteBannerFromDB(req.params.id);
  sendResponse<TBanner>(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Banner deleted!",
    data: result,
  });
});

export const BannerController = {
  createBanner,
  getAllBanners,
  getAllBannersAdmin,
  getSingleBanner,
  updateBanner,
  deleteBanner,
};
