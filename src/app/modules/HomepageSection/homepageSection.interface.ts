// src/app/modules/HomepageSection/homepageSection.interface.ts

export type THomepageSectionType =
  | "FEATURED_PRODUCTS"
  | "CATEGORY_SHOWCASE"
  | "BRAND_SHOWCASE"
  | "CUSTOM";
export type TSectionItemType = "PRODUCT" | "CATEGORY" | "BRAND" | "CUSTOM";

export type THomepageSectionItem = {
  id?: string;
  sectionId: string;
  type: TSectionItemType;
  referenceId?: string | null;
  title?: string | null;
  image?: string | null;
  linkUrl?: string | null;
  order?: number;
  createdAt?: Date;
  updatedAt?: Date;
};

export type THomepageSection = {
  id?: string;
  title: string;
  type: THomepageSectionType;
  isActive?: boolean;
  deleted?: boolean;
  order?: number;
  items?: THomepageSectionItem[];
  createdAt?: Date;
  updatedAt?: Date;
};
