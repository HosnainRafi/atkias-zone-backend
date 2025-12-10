// src/app/modules/Category/category.service.ts
import httpStatus from "http-status";
import ApiError from "../../../errors/ApiError";
import prisma from "../../../shared/prisma";
import { TCategory } from "./category.interface";

const createCategoryIntoDB = async (payload: TCategory): Promise<TCategory> => {
  // Slug check
  const existingCategory = await prisma.category.findUnique({
    where: { slug: payload.slug },
  });
  if (existingCategory) {
    throw new ApiError(
      httpStatus.CONFLICT,
      `A category with the name '${payload.name}' (slug: '${payload.slug}') already exists.`
    );
  }

  // Parent check
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
      order: payload.order,
      sizeChart: payload.sizeChart,
      parentId: payload.parentId,
      gender: payload.gender,
    },
  });
  return result as unknown as TCategory;
};

type TCategoryNode = TCategory & {
  children?: TCategoryNode[];
};

const buildCategoryTree = (categories: TCategory[]): TCategoryNode[] => {
  const categoryMap: { [key: string]: TCategoryNode } = {};
  const rootCategories: TCategoryNode[] = [];

  // First pass: Create map and identify root categories
  categories.forEach((category) => {
    const catWithChildren: TCategoryNode = { ...category, children: [] };
    if (category.id) {
      categoryMap[category.id] = catWithChildren;
    }

    if (!category.parentId) {
      rootCategories.push(catWithChildren);
    }
  });

  // Second pass: Link children to their parents
  categories.forEach((category) => {
    if (category.parentId && category.id) {
      const parent = categoryMap[category.parentId];
      if (parent) {
        parent.children = parent.children || [];
        const currentCategoryMapped = categoryMap[category.id];
        if (currentCategoryMapped) {
          parent.children.push(currentCategoryMapped);
        }
      }
    }
  });

  const pruneEmptyChildren = (nodes: TCategoryNode[]) => {
    nodes.forEach((node) => {
      if (node.children && node.children.length > 0) {
        pruneEmptyChildren(node.children);
      } else {
        delete node.children;
      }
    });
  };

  pruneEmptyChildren(rootCategories);

  return rootCategories;
};

const getAllCategoriesFromDB = async (): Promise<TCategoryNode[]> => {
  const allCategories = await prisma.category.findMany({
    orderBy: [{ order: "asc" }, { name: "asc" }],
  });
  const categoryTree = buildCategoryTree(
    allCategories as unknown as TCategory[]
  );
  return categoryTree;
};

const getSingleCategoryFromDB = async (
  id: string
): Promise<TCategory | null> => {
  const result = await prisma.category.findUnique({
    where: { id },
    include: { parent: true },
  });
  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, "Category not found.");
  }
  return result as unknown as TCategory;
};

const updateCategoryInDB = async (
  id: string,
  payload: Partial<TCategory>
): Promise<TCategory | null> => {
  const category = await prisma.category.findUnique({ where: { id } });
  if (!category) {
    throw new ApiError(httpStatus.NOT_FOUND, "Category not found.");
  }

  // Parent validation
  if (payload.parentId) {
    const parent = await prisma.category.findUnique({
      where: { id: payload.parentId },
    });
    if (!parent) {
      throw new ApiError(httpStatus.BAD_REQUEST, "Parent category not found.");
    }
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
    where: {
      parentId: { not: null },
    },
    include: {
      parent: {
        select: {
          name: true,
          slug: true,
        },
      },
    },
    orderBy: [{ order: "asc" }, { name: "asc" }],
  });

  return subcategories as unknown as TCategory[];
};

const getSubcategoriesByParentId = async (
  parentId: string
): Promise<TCategory[]> => {
  const subcategories = await prisma.category.findMany({
    where: { parentId },
    orderBy: [{ order: "asc" }, { name: "asc" }],
  });

  return subcategories as unknown as TCategory[];
};

const deleteCategoryFromDB = async (id: string): Promise<TCategory | null> => {
  const category = await prisma.category.findUnique({ where: { id } });
  if (!category) {
    throw new ApiError(httpStatus.NOT_FOUND, "Category not found.");
  }

  // 1. Check if any products use this category
  const productCount = await prisma.product.count({
    where: { categoryId: id },
  });
  if (productCount > 0) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      `Cannot delete category: ${productCount} product(s) are associated with it.`
    );
  }

  // 2. Check if this category is a parent to any other categories
  const childCount = await prisma.category.count({
    where: { parentId: id },
  });
  if (childCount > 0) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      `Cannot delete category: It has ${childCount} sub-category(ies). Please delete or reassign them first.`
    );
  }

  // If checks pass, proceed with deletion
  const result = await prisma.category.delete({
    where: { id },
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
