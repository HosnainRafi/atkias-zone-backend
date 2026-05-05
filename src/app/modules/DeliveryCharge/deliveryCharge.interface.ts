export type TDeliveryChargeConfig = {
  id: string;
  key: string;
  insideDhaka: number;
  outsideDhaka: number;
  createdAt: Date;
  updatedAt: Date;
};

export type TDeliveryChargeZone = 'inside' | 'outside';
export type TDeliveryChargeScope =
  | 'all'
  | 'category'
  | 'subcategory'
  | 'product';

export type TDeliveryChargeRule = {
  id: string;
  zone: TDeliveryChargeZone;
  scope: TDeliveryChargeScope;
  charge: number;
  minOrderAmount: number;
  isActive: boolean;
  categories?: Array<{
    categoryId: string;
    category?: {
      id: string;
      name: string;
      parentId?: string | null;
      parent?: { id: string; name: string } | null;
    };
  }>;
  products?: Array<{
    productId: string;
    product?: { id: string; title: string };
  }>;
  createdAt: Date;
  updatedAt: Date;
};

export type TUpdateDeliveryChargePayload = {
  insideDhaka: number;
  outsideDhaka: number;
};

export type TDeliveryChargeRulePayload = {
  zone: TDeliveryChargeZone;
  scope: TDeliveryChargeScope;
  charge: number;
  minOrderAmount?: number;
  isActive?: boolean;
  appliesToCategories?: string[];
  appliesToProducts?: string[];
};

export type TResolvedDeliveryCharge = {
  label: string;
  fee: number;
};
