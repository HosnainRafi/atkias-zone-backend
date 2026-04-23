// src/app/modules/Category/category.interface.ts

export type TCategoryType = "PRODUCT" | "SKIN_TYPE" | "CONCERN";

export type TCategory = {
  id?: string;
  name: string;
  slug: string;
  description?: string;
  image?: string;
  order?: number;
  sizeChart?: string;
  parentId?: string | null;
  type?: TCategoryType;
  isActive?: boolean;
  deleted?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
};
