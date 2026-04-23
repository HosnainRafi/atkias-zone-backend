// src/app/modules/Brand/brand.controller.ts
import { Request, Response } from "express";
import httpStatus from "http-status";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { TBrand } from "./brand.interface";
import { BrandService } from "./brand.service";

const createBrand = catchAsync(async (req: Request, res: Response) => {
  const result = await BrandService.createBrandIntoDB(req.body);
  sendResponse<TBrand>(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Brand created!",
    data: result,
  });
});

const getAllBrands = catchAsync(async (req: Request, res: Response) => {
  const result = await BrandService.getAllBrandsFromDB();
  sendResponse<TBrand[]>(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Brands retrieved!",
    data: result,
  });
});

const getSingleBrand = catchAsync(async (req: Request, res: Response) => {
  const result = await BrandService.getSingleBrandFromDB(req.params.id);
  sendResponse<TBrand>(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Brand retrieved!",
    data: result,
  });
});

const updateBrand = catchAsync(async (req: Request, res: Response) => {
  const result = await BrandService.updateBrandInDB(req.params.id, req.body);
  sendResponse<TBrand>(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Brand updated!",
    data: result,
  });
});

const deleteBrand = catchAsync(async (req: Request, res: Response) => {
  const result = await BrandService.deleteBrandFromDB(req.params.id);
  sendResponse<TBrand>(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Brand deleted!",
    data: result,
  });
});

export const BrandController = {
  createBrand,
  getAllBrands,
  getSingleBrand,
  updateBrand,
  deleteBrand,
};
