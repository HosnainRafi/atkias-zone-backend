export type TDeliveryChargeConfig = {
  id: string;
  key: string;
  insideDhaka: number;
  outsideDhaka: number;
  createdAt: Date;
  updatedAt: Date;
};

export type TUpdateDeliveryChargePayload = {
  insideDhaka: number;
  outsideDhaka: number;
};

export type TResolvedDeliveryCharge = {
  label: string;
  fee: number;
};
