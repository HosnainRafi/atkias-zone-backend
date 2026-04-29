// src/app/modules/Banner/banner.interface.ts

export type TBannerPosition = 'HERO' | 'PROMO' | 'POPUP';

export type THeroSlide = {
  image: string;
  mobileImage?: string | null;
  title?: string | null;
  subtitle?: string | null;
  buttonText?: string | null;
  buttonLink?: string | null;
};

export type TBanner = {
  id?: string;
  title?: string | null;
  subtitle?: string | null;
  description?: string | null;
  image?: string | null;
  mobileImage?: string | null;
  linkUrl?: string | null;
  buttonText?: string | null;
  buttonLink?: string | null;
  slides?: THeroSlide[] | null;
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
