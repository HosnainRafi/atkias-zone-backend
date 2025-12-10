// src/app/modules/Category/category.interface.ts

export type TCategoryGender = "Men" | "Women" | "Unisex";

export type TCategory = {
  id?: string;
  name: string;
  slug: string;
  description?: string;
  image?: string;
  order?: number;
  sizeChart?: string;
  parentId?: string | null;
  parentCategory?: string | null;
  gender?: TCategoryGender;
};
