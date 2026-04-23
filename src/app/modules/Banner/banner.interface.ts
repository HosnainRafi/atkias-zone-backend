// src/app/modules/Banner/banner.interface.ts

export type TBannerPosition = "HERO" | "PROMO" | "POPUP";

export type TBanner = {
  id?: string;
  title?: string | null;
  image: string;
  mobileImage?: string | null;
  linkUrl?: string | null;
  position?: TBannerPosition;
  isActive?: boolean;
  deleted?: boolean;
  order?: number;
  validFrom?: Date | null;
  validUntil?: Date | null;
  createdById?: string;
  createdAt?: Date;
  updatedAt?: Date;
};
