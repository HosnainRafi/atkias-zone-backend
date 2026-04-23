// src/app/modules/Category/category.service.ts
import httpStatus from "http-status";
import ApiError from "../../../errors/ApiError";
import prisma from "../../../shared/prisma";
import { TCategory } from "./category.interface";

const createCategoryIntoDB = async (payload: TCategory): Promise<TCategory> => {
  const existingCategory = await prisma.category.findUnique({
    where: { slug: payload.slug },
  });
  if (existingCategory) {
    throw new ApiError(
      httpStatus.CONFLICT,
      `A category with slug '${payload.slug}' already exists.`,
    );
  }

  if (payload.parentId) {
    const parent = await prisma.category.findUnique({
      where: { id: payload.parentId },
    });
    if (!parent) {
      throw new ApiError(httpStatus.BAD_REQUEST, "Parent category not found.");
    }
  }

  const result = await prisma.category.create({
    data: {
      name: payload.name,
      slug: payload.slug,
      description: payload.description,
      image: payload.image,
      order: payload.order ?? 0,
      sizeChart: payload.sizeChart,
      parentId: payload.parentId,
      type: payload.type ?? "PRODUCT",
      isActive: payload.isActive ?? true,
    },
  });
  return result as unknown as TCategory;
};

type TCategoryNode = TCategory & { children?: TCategoryNode[] };

const buildCategoryTree = (categories: TCategory[]): TCategoryNode[] => {
  const map: Record<string, TCategoryNode> = {};
  const roots: TCategoryNode[] = [];

  categories.forEach((c) => {
    map[c.id!] = { ...c, children: [] };
    if (!c.parentId) roots.push(map[c.id!]);
  });

  categories.forEach((c) => {
    if (c.parentId && c.id && map[c.parentId]) {
      map[c.parentId].children!.push(map[c.id]);
    }
  });

  const prune = (nodes: TCategoryNode[]) =>
    nodes.forEach((n) => {
      if (n.children && n.children.length > 0) prune(n.children);
      else delete n.children;
    });
  prune(roots);

  return roots;
};

const getAllCategoriesFromDB = async (): Promise<TCategoryNode[]> => {
  const all = await prisma.category.findMany({
    where: { deleted: false },
    orderBy: [{ order: "asc" }, { name: "asc" }],
  });
  return buildCategoryTree(all as unknown as TCategory[]);
};

const getSingleCategoryFromDB = async (
  id: string,
): Promise<TCategory | null> => {
  const result = await prisma.category.findUnique({
    where: { id },
    include: { parent: true },
  });
  if (!result) throw new ApiError(httpStatus.NOT_FOUND, "Category not found.");
  return result as unknown as TCategory;
};

const updateCategoryInDB = async (
  id: string,
  payload: Partial<TCategory>,
): Promise<TCategory | null> => {
  const category = await prisma.category.findUnique({ where: { id } });
  if (!category)
    throw new ApiError(httpStatus.NOT_FOUND, "Category not found.");

  if (payload.parentId) {
    const parent = await prisma.category.findUnique({
      where: { id: payload.parentId },
    });
    if (!parent)
      throw new ApiError(httpStatus.BAD_REQUEST, "Parent category not found.");
  }

  const result = await prisma.category.update({
    where: { id },
    data: payload,
    include: { parent: true },
  });
  return result as unknown as TCategory;
};

const getAllSubcategoriesFromDB = async (): Promise<TCategory[]> => {
  const subcategories = await prisma.category.findMany({
    where: { parentId: { not: null }, deleted: false },
    include: { parent: { select: { name: true, slug: true } } },
    orderBy: [{ order: "asc" }, { name: "asc" }],
  });
  return subcategories as unknown as TCategory[];
};

const getSubcategoriesByParentId = async (
  parentId: string,
): Promise<TCategory[]> => {
  const subcategories = await prisma.category.findMany({
    where: { parentId, deleted: false },
    orderBy: [{ order: "asc" }, { name: "asc" }],
  });
  return subcategories as unknown as TCategory[];
};

const deleteCategoryFromDB = async (id: string): Promise<TCategory | null> => {
  const category = await prisma.category.findUnique({ where: { id } });
  if (!category)
    throw new ApiError(httpStatus.NOT_FOUND, "Category not found.");

  const productCount = await prisma.product.count({
    where: { categoryId: id },
  });
  if (productCount > 0) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      `Cannot delete: ${productCount} product(s) are associated with this category.`,
    );
  }

  const childCount = await prisma.category.count({ where: { parentId: id } });
  if (childCount > 0) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      `Cannot delete: It has ${childCount} sub-category(ies). Reassign them first.`,
    );
  }

  const result = await prisma.category.update({
    where: { id },
    data: { deleted: true, isActive: false },
  });
  return result as unknown as TCategory;
};
export const CategoryService = {
  createCategoryIntoDB,
  getAllCategoriesFromDB,
  getSingleCategoryFromDB,
  updateCategoryInDB,
  getSubcategoriesByParentId,
  deleteCategoryFromDB,
  getAllSubcategoriesFromDB,
};
