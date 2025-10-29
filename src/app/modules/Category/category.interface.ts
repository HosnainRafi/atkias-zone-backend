import { Types } from "mongoose";

// src/app/modules/Category/category.interface.ts
export type TCategory = {
  name: string;
  slug: string;
  description?: string;
  image?: string;
  sizeChart?: {
    headers: string[];
    rows: string[][];
  };
  parentCategory?: Types.ObjectId | null;
};
