// src/app/modules/Brand/brand.interface.ts

export type TBrand = {
  id?: string;
  name: string;
  slug: string;
  logo?: string | null;
  description?: string | null;
  country?: string | null;
  isActive?: boolean;
  deleted?: boolean;
  order?: number;
  createdAt?: Date;
  updatedAt?: Date;
};
