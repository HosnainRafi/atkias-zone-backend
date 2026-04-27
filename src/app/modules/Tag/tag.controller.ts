import { Request, Response } from 'express';
import httpStatus from 'http-status';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { TTag } from './tag.interface';
import { TagService } from './tag.service';

const createTag = catchAsync(async (req: Request, res: Response) => {
  const result = await TagService.createTagIntoDB(req.body);
  sendResponse<TTag>(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Tag created successfully!',
    data: result,
  });
});

const getAllTags = catchAsync(async (_req: Request, res: Response) => {
  const result = await TagService.getAllTagsFromDB();
  sendResponse<TTag[]>(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Tags retrieved successfully!',
    data: result,
  });
});

const getSingleTag = catchAsync(async (req: Request, res: Response) => {
  const id = String(req.params.id);
  const result = await TagService.getSingleTagFromDB(id);
  sendResponse<TTag>(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Tag retrieved successfully!',
    data: result,
  });
});

const updateTag = catchAsync(async (req: Request, res: Response) => {
  const id = String(req.params.id);
  const result = await TagService.updateTagInDB(id, req.body);
  sendResponse<TTag>(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Tag updated successfully!',
    data: result,
  });
});

const deleteTag = catchAsync(async (req: Request, res: Response) => {
  const id = String(req.params.id);
  const result = await TagService.deleteTagFromDB(id);
  sendResponse<TTag>(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Tag deleted successfully!',
    data: result,
  });
});

export const TagController = {
  createTag,
  getAllTags,
  getSingleTag,
  updateTag,
  deleteTag,
};
