// src/app/modules/Announcement/announcement.controller.ts
import { Request, Response } from "express";
import httpStatus from "http-status";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { AnnouncementService } from "./announcement.service";

const createAnnouncement = catchAsync(async (req: Request, res: Response) => {
  const result = await AnnouncementService.createAnnouncementIntoDB(req.body);
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Announcement created!",
    data: result,
  });
});

const getAllAnnouncements = catchAsync(async (req: Request, res: Response) => {
  const activeOnly = req.query.activeOnly === "true";
  const result =
    await AnnouncementService.getAllAnnouncementsFromDB(activeOnly);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Announcements retrieved!",
    data: result,
  });
});

const getSingleAnnouncement = catchAsync(
  async (req: Request, res: Response) => {
    const result = await AnnouncementService.getSingleAnnouncementFromDB(
      req.params.id as string,
    );
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Announcement retrieved!",
      data: result,
    });
  },
);

const updateAnnouncement = catchAsync(async (req: Request, res: Response) => {
  const result = await AnnouncementService.updateAnnouncementInDB(
    req.params.id as string,
    req.body,
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Announcement updated!",
    data: result,
  });
});

const deleteAnnouncement = catchAsync(async (req: Request, res: Response) => {
  const result = await AnnouncementService.deleteAnnouncementFromDB(
    req.params.id as string,
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Announcement deleted!",
    data: result,
  });
});

export const AnnouncementController = {
  createAnnouncement,
  getAllAnnouncements,
  getSingleAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
};
