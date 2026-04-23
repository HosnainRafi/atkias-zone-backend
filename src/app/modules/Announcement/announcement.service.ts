// src/app/modules/Announcement/announcement.service.ts
import httpStatus from "http-status";
import ApiError from "../../../errors/ApiError";
import prisma from "../../../shared/prisma";
import { TAnnouncement } from "./announcement.interface";

const createAnnouncementIntoDB = async (
  payload: TAnnouncement,
): Promise<TAnnouncement> => {
  const result = await prisma.announcement.create({ data: payload as any });
  return result as unknown as TAnnouncement;
};

const getAllAnnouncementsFromDB = async (
  activeOnly = false,
): Promise<TAnnouncement[]> => {
  const result = await prisma.announcement.findMany({
    where: { deleted: false, ...(activeOnly ? { isActive: true } : {}) },
    orderBy: { order: "asc" },
  });
  return result as unknown as TAnnouncement[];
};

const getSingleAnnouncementFromDB = async (
  id: string,
): Promise<TAnnouncement> => {
  const result = await prisma.announcement.findFirst({
    where: { id, deleted: false },
  });
  if (!result)
    throw new ApiError(httpStatus.NOT_FOUND, "Announcement not found.");
  return result as unknown as TAnnouncement;
};

const updateAnnouncementInDB = async (
  id: string,
  payload: Partial<TAnnouncement>,
): Promise<TAnnouncement> => {
  const announcement = await prisma.announcement.findUnique({ where: { id } });
  if (!announcement)
    throw new ApiError(httpStatus.NOT_FOUND, "Announcement not found.");

  const result = await prisma.announcement.update({
    where: { id },
    data: payload as any,
  });
  return result as unknown as TAnnouncement;
};

const deleteAnnouncementFromDB = async (id: string): Promise<TAnnouncement> => {
  const announcement = await prisma.announcement.findUnique({ where: { id } });
  if (!announcement)
    throw new ApiError(httpStatus.NOT_FOUND, "Announcement not found.");

  const result = await prisma.announcement.update({
    where: { id },
    data: { deleted: true, isActive: false },
  });
  return result as unknown as TAnnouncement;
};

export const AnnouncementService = {
  createAnnouncementIntoDB,
  getAllAnnouncementsFromDB,
  getSingleAnnouncementFromDB,
  updateAnnouncementInDB,
  deleteAnnouncementFromDB,
};
