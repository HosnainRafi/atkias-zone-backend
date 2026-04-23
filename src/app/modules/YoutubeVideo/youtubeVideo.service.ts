// src/app/modules/YoutubeVideo/youtubeVideo.service.ts
import httpStatus from "http-status";
import ApiError from "../../../errors/ApiError";
import prisma from "../../../shared/prisma";
import { TYoutubeVideo } from "./youtubeVideo.interface";

const createVideoIntoDB = async (
  payload: TYoutubeVideo,
): Promise<TYoutubeVideo> => {
  const result = await prisma.youtubeVideo.create({ data: payload as any });
  return result as unknown as TYoutubeVideo;
};

const getAllVideosFromDB = async (): Promise<TYoutubeVideo[]> => {
  const result = await prisma.youtubeVideo.findMany({
    where: { deleted: false },
    orderBy: { order: "asc" },
  });
  return result as unknown as TYoutubeVideo[];
};

const getSingleVideoFromDB = async (id: string): Promise<TYoutubeVideo> => {
  const result = await prisma.youtubeVideo.findFirst({
    where: { id, deleted: false },
  });
  if (!result)
    throw new ApiError(httpStatus.NOT_FOUND, "YouTube video not found.");
  return result as unknown as TYoutubeVideo;
};

const updateVideoInDB = async (
  id: string,
  payload: Partial<TYoutubeVideo>,
): Promise<TYoutubeVideo> => {
  const video = await prisma.youtubeVideo.findUnique({ where: { id } });
  if (!video)
    throw new ApiError(httpStatus.NOT_FOUND, "YouTube video not found.");

  const result = await prisma.youtubeVideo.update({
    where: { id },
    data: payload as any,
  });
  return result as unknown as TYoutubeVideo;
};

const deleteVideoFromDB = async (id: string): Promise<TYoutubeVideo> => {
  const video = await prisma.youtubeVideo.findUnique({ where: { id } });
  if (!video)
    throw new ApiError(httpStatus.NOT_FOUND, "YouTube video not found.");

  const result = await prisma.youtubeVideo.update({
    where: { id },
    data: { deleted: true, isActive: false },
  });
  return result as unknown as TYoutubeVideo;
};

export const YoutubeVideoService = {
  createVideoIntoDB,
  getAllVideosFromDB,
  getSingleVideoFromDB,
  updateVideoInDB,
  deleteVideoFromDB,
};
