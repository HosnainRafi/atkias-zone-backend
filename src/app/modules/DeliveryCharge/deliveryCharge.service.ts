import prisma from "../../../shared/prisma";
import { TShippingAddress } from "../Order/order.interface";
import {
  TDeliveryChargeConfig,
  TResolvedDeliveryCharge,
  TUpdateDeliveryChargePayload,
} from "./deliveryCharge.interface";

const DEFAULT_CONFIG_KEY = "default";
const INSIDE_DHAKA_LABEL = "Dhaka - City Corporation";
const OUTSIDE_DHAKA_LABEL = "Outside Dhaka";

const INSIDE_DHAKA_ZONE_NAMES = new Set([
  "dhaka - city corporation",
  "dhaka city corporation",
]);

function mapConfig(
  config: Awaited<ReturnType<typeof prisma.deliveryChargeConfig.upsert>>,
): TDeliveryChargeConfig {
  return {
    ...config,
    insideDhaka: Number(config.insideDhaka),
    outsideDhaka: Number(config.outsideDhaka),
  };
}

function normalizeZoneValue(value?: string | null): string {
  return value?.trim().toLowerCase() ?? "";
}

function isInsideDhakaAddress(shippingAddress: TShippingAddress): boolean {
  return [
    shippingAddress.deliveryChargeZone,
    shippingAddress.district,
    shippingAddress.upazila,
  ].some((value) => INSIDE_DHAKA_ZONE_NAMES.has(normalizeZoneValue(value)));
}

const ensureDeliveryChargeConfig = async (): Promise<TDeliveryChargeConfig> => {
  const config = await prisma.deliveryChargeConfig.upsert({
    where: { key: DEFAULT_CONFIG_KEY },
    update: {},
    create: {
      key: DEFAULT_CONFIG_KEY,
      insideDhaka: 60,
      outsideDhaka: 120,
    },
  });

  return mapConfig(config);
};

const getDeliveryChargeConfigFromDB =
  async (): Promise<TDeliveryChargeConfig> => ensureDeliveryChargeConfig();

const updateDeliveryChargeConfigInDB = async (
  payload: TUpdateDeliveryChargePayload,
): Promise<TDeliveryChargeConfig> => {
  const config = await prisma.deliveryChargeConfig.upsert({
    where: { key: DEFAULT_CONFIG_KEY },
    update: {
      insideDhaka: payload.insideDhaka,
      outsideDhaka: payload.outsideDhaka,
    },
    create: {
      key: DEFAULT_CONFIG_KEY,
      insideDhaka: payload.insideDhaka,
      outsideDhaka: payload.outsideDhaka,
    },
  });

  return mapConfig(config);
};

const resolveDeliveryCharge = async (
  shippingAddress: TShippingAddress,
): Promise<TResolvedDeliveryCharge> => {
  const config = await ensureDeliveryChargeConfig();
  const insideDhaka = isInsideDhakaAddress(shippingAddress);

  return insideDhaka
    ? {
        label: INSIDE_DHAKA_LABEL,
        fee: config.insideDhaka,
      }
    : {
        label: OUTSIDE_DHAKA_LABEL,
        fee: config.outsideDhaka,
      };
};

export const DeliveryChargeService = {
  getDeliveryChargeConfigFromDB,
  updateDeliveryChargeConfigInDB,
  resolveDeliveryCharge,
};
