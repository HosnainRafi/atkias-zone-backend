import httpStatus from 'http-status';
import ApiError from '../../../errors/ApiError';
import prisma from '../../../shared/prisma';
import { TTag } from './tag.interface';

const createTagIntoDB = async (payload: TTag): Promise<TTag> => {
  const existingTag = await prisma.tag.findFirst({
    where: {
      OR: [{ name: payload.name }, { slug: payload.slug }],
    },
  });

  if (existingTag) {
    throw new ApiError(
      httpStatus.CONFLICT,
      `A tag with this name already exists.`,
    );
  }

  const result = await prisma.tag.create({
    data: {
      name: payload.name,
      slug: payload.slug,
      type: payload.type,
    },
  });

  return result as unknown as TTag;
};

const getAllTagsFromDB = async (): Promise<TTag[]> => {
  const result = await prisma.tag.findMany({
    orderBy: [{ name: 'asc' }],
  });

  return result as unknown as TTag[];
};

const getSingleTagFromDB = async (id: string): Promise<TTag | null> => {
  const result = await prisma.tag.findUnique({
    where: { id },
  });

  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Tag not found.');
  }

  return result as unknown as TTag;
};

const updateTagInDB = async (
  id: string,
  payload: Partial<TTag>,
): Promise<TTag | null> => {
  const existing = await prisma.tag.findUnique({ where: { id } });

  if (!existing) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Tag not found.');
  }

  if (payload.name || payload.slug) {
    const duplicate = await prisma.tag.findFirst({
      where: {
        id: { not: id },
        OR: [
          payload.name ? { name: payload.name } : undefined,
          payload.slug ? { slug: payload.slug } : undefined,
        ].filter(Boolean) as Array<{ name?: string; slug?: string }>,
      },
    });

    if (duplicate) {
      throw new ApiError(
        httpStatus.CONFLICT,
        'A tag with this name already exists.',
      );
    }
  }

  const result = await prisma.tag.update({
    where: { id },
    data: payload,
  });

  return result as unknown as TTag;
};

const deleteTagFromDB = async (id: string): Promise<TTag | null> => {
  const existing = await prisma.tag.findUnique({ where: { id } });

  if (!existing) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Tag not found.');
  }

  const usageCount = await prisma.productTag.count({
    where: { tagId: id },
  });

  if (usageCount > 0) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      `Cannot delete: ${usageCount} product(s) are associated with this tag.`,
    );
  }

  const result = await prisma.tag.delete({
    where: { id },
  });

  return result as unknown as TTag;
};

export const TagService = {
  createTagIntoDB,
  getAllTagsFromDB,
  getSingleTagFromDB,
  updateTagInDB,
  deleteTagFromDB,
};
