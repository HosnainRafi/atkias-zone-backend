// src/app/modules/HomepageSection/homepageSection.controller.ts
import { Request, Response } from "express";
import httpStatus from "http-status";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { HomepageSectionService } from "./homepageSection.service";

const createSection = catchAsync(async (req: Request, res: Response) => {
  const result = await HomepageSectionService.createSectionIntoDB(req.body);
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Homepage section created!",
    data: result,
  });
});

const getAllSections = catchAsync(async (req: Request, res: Response) => {
  const activeOnly = req.query.activeOnly === "true";
  const result = await HomepageSectionService.getAllSectionsFromDB(activeOnly);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Sections retrieved!",
    data: result,
  });
});

const getSingleSection = catchAsync(async (req: Request, res: Response) => {
  const result = await HomepageSectionService.getSingleSectionFromDB(
    req.params.id,
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Section retrieved!",
    data: result,
  });
});

const updateSection = catchAsync(async (req: Request, res: Response) => {
  const result = await HomepageSectionService.updateSectionInDB(
    req.params.id,
    req.body,
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Section updated!",
    data: result,
  });
});

const deleteSection = catchAsync(async (req: Request, res: Response) => {
  const result = await HomepageSectionService.deleteSectionFromDB(
    req.params.id,
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Section deleted!",
    data: result,
  });
});

const addItem = catchAsync(async (req: Request, res: Response) => {
  const result = await HomepageSectionService.addItemToSectionInDB(
    req.params.sectionId,
    req.body,
  );
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Item added to section!",
    data: result,
  });
});

const updateItem = catchAsync(async (req: Request, res: Response) => {
  const result = await HomepageSectionService.updateItemInDB(
    req.params.itemId,
    req.body,
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Item updated!",
    data: result,
  });
});

const deleteItem = catchAsync(async (req: Request, res: Response) => {
  const result = await HomepageSectionService.deleteItemFromDB(
    req.params.itemId,
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Item deleted!",
    data: result,
  });
});

export const HomepageSectionController = {
  createSection,
  getAllSections,
  getSingleSection,
  updateSection,
  deleteSection,
  addItem,
  updateItem,
  deleteItem,
};
