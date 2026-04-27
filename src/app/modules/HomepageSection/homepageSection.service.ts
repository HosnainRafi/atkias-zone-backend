// src/app/modules/HomepageSection/homepageSection.service.ts
import httpStatus from 'http-status';
import ApiError from '../../../errors/ApiError';
import prisma from '../../../shared/prisma';
import {
  THomepageSection,
  THomepageSectionItem,
} from './homepageSection.interface';

const createSectionIntoDB = async (
  payload: THomepageSection,
): Promise<THomepageSection> => {
  const { items, ...sectionData } = payload;

  const result = await prisma.homepageSection.create({
    data: {
      ...sectionData,
      items: items && items.length > 0 ? { create: items } : undefined,
    } as any,
    include: { items: { orderBy: { order: 'asc' } } },
  });
  return result as unknown as THomepageSection;
};

const getAllSectionsFromDB = async (
  activeOnly = false,
): Promise<THomepageSection[]> => {
  const result = await prisma.homepageSection.findMany({
    where: { deleted: false, ...(activeOnly ? { isActive: true } : {}) },
    orderBy: { order: 'asc' },
    include: { items: { orderBy: { order: 'asc' } } },
  });
  return result as unknown as THomepageSection[];
};

const getSingleSectionFromDB = async (
  id: string,
): Promise<THomepageSection> => {
  const result = await prisma.homepageSection.findFirst({
    where: { id, deleted: false },
    include: { items: { orderBy: { order: 'asc' } } },
  });
  if (!result)
    throw new ApiError(httpStatus.NOT_FOUND, 'Homepage section not found.');
  return result as unknown as THomepageSection;
};

const updateSectionInDB = async (
  id: string,
  payload: Partial<THomepageSection>,
): Promise<THomepageSection> => {
  const section = await prisma.homepageSection.findUnique({ where: { id } });
  if (!section)
    throw new ApiError(httpStatus.NOT_FOUND, 'Homepage section not found.');

  const result = await prisma.homepageSection.update({
    where: { id },
    data: payload as any,
    include: { items: { orderBy: { order: 'asc' } } },
  });
  return result as unknown as THomepageSection;
};

const deleteSectionFromDB = async (id: string): Promise<THomepageSection> => {
  const section = await prisma.homepageSection.findUnique({ where: { id } });
  if (!section)
    throw new ApiError(httpStatus.NOT_FOUND, 'Homepage section not found.');

  const result = await prisma.homepageSection.update({
    where: { id },
    data: { deleted: true, isActive: false },
    include: { items: true },
  });
  return result as unknown as THomepageSection;
};

const addItemToSectionInDB = async (
  sectionId: string,
  payload: Record<string, unknown>,
): Promise<THomepageSectionItem> => {
  const section = await prisma.homepageSection.findFirst({
    where: { id: sectionId, deleted: false },
  });
  if (!section)
    throw new ApiError(httpStatus.NOT_FOUND, 'Homepage section not found.');

  const result = await prisma.homepageSectionItem.create({
    data: { ...payload, sectionId } as any,
  });
  return result as unknown as THomepageSectionItem;
};

const updateItemInDB = async (
  itemId: string,
  payload: Record<string, unknown>,
): Promise<THomepageSectionItem> => {
  const item = await prisma.homepageSectionItem.findUnique({
    where: { id: itemId },
  });
  if (!item)
    throw new ApiError(httpStatus.NOT_FOUND, 'Section item not found.');

  const result = await prisma.homepageSectionItem.update({
    where: { id: itemId },
    data: payload as any,
  });
  return result as unknown as THomepageSectionItem;
};

const deleteItemFromDB = async (
  itemId: string,
): Promise<THomepageSectionItem> => {
  const item = await prisma.homepageSectionItem.findUnique({
    where: { id: itemId },
  });
  if (!item)
    throw new ApiError(httpStatus.NOT_FOUND, 'Section item not found.');

  const result = await prisma.homepageSectionItem.delete({
    where: { id: itemId },
  });
  return result as unknown as THomepageSectionItem;
};

export const HomepageSectionService = {
  createSectionIntoDB,
  getAllSectionsFromDB,
  getSingleSectionFromDB,
  updateSectionInDB,
  deleteSectionFromDB,
  addItemToSectionInDB,
  updateItemInDB,
  deleteItemFromDB,
};
