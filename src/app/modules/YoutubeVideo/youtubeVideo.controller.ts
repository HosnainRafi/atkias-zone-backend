// src/app/modules/YoutubeVideo/youtubeVideo.controller.ts
import { Request, Response } from "express";
import httpStatus from "http-status";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { YoutubeVideoService } from "./youtubeVideo.service";

const createVideo = catchAsync(async (req: Request, res: Response) => {
  const result = await YoutubeVideoService.createVideoIntoDB(req.body);
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Video added!",
    data: result,
  });
});

const getAllVideos = catchAsync(async (req: Request, res: Response) => {
  const result = await YoutubeVideoService.getAllVideosFromDB();
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Videos retrieved!",
    data: result,
  });
});

const getSingleVideo = catchAsync(async (req: Request, res: Response) => {
  const result = await YoutubeVideoService.getSingleVideoFromDB(req.params.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Video retrieved!",
    data: result,
  });
});

const updateVideo = catchAsync(async (req: Request, res: Response) => {
  const result = await YoutubeVideoService.updateVideoInDB(
    req.params.id,
    req.body,
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Video updated!",
    data: result,
  });
});

const deleteVideo = catchAsync(async (req: Request, res: Response) => {
  const result = await YoutubeVideoService.deleteVideoFromDB(req.params.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Video deleted!",
    data: result,
  });
});

export const YoutubeVideoController = {
  createVideo,
  getAllVideos,
  getSingleVideo,
  updateVideo,
  deleteVideo,
};
