// src/app/modules/HomepageSection/homepageSection.interface.ts

export type THomepageSectionType =
  | 'BANNER'
  | 'PRODUCT_GRID'
  | 'CATEGORY_GRID'
  | 'BRAND_GRID'
  | 'YOUTUBE_VIDEOS'
  | 'ANNOUNCEMENT_BAR'
  | 'CUSTOM_HTML';
export type TSectionItemType =
  | 'PRODUCT'
  | 'CATEGORY'
  | 'BRAND'
  | 'BANNER'
  | 'VIDEO';

export type THomepageSectionItem = {
  id?: string;
  sectionId: string;
  refType: TSectionItemType;
  refId?: string | null;
  title?: string | null;
  image?: string | null;
  linkUrl?: string | null;
  order?: number;
  createdAt?: Date;
};

export type THomepageSection = {
  id?: string;
  title?: string | null;
  subtitle?: string | null;
  type: THomepageSectionType;
  isActive?: boolean;
  deleted?: boolean;
  order?: number;
  config?: string | null;
  items?: THomepageSectionItem[];
  createdAt?: Date;
  updatedAt?: Date;
};
