import prisma from '../../../shared/prisma';
import { TShippingAddress } from '../Order/order.interface';
import {
  TDeliveryChargeConfig,
  TResolvedDeliveryCharge,
  TUpdateDeliveryChargePayload,
  TDeliveryChargeRule,
  TDeliveryChargeRulePayload,
} from './deliveryCharge.interface';

const DEFAULT_CONFIG_KEY = 'default';
const INSIDE_DHAKA_LABEL = 'Dhaka - City Corporation';
const OUTSIDE_DHAKA_LABEL = 'Outside Dhaka';

const INSIDE_DHAKA_ZONE_NAMES = new Set([
  'dhaka - city corporation',
  'dhaka city corporation',
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

const deliveryChargeRuleInclude = {
  categories: {
    select: {
      categoryId: true,
      category: {
        select: {
          id: true,
          name: true,
          parentId: true,
          parent: { select: { id: true, name: true } },
        },
      },
    },
  },
  products: {
    select: {
      productId: true,
      product: { select: { id: true, title: true } },
    },
  },
};

function mapRule(
  rule: Awaited<ReturnType<typeof prisma.deliveryChargeRule.create>>,
): TDeliveryChargeRule {
  return {
    ...rule,
    charge: Number(rule.charge),
  };
}

function normalizeZoneValue(value?: string | null): string {
  return value?.trim().toLowerCase() ?? '';
}

function isInsideDhakaAddress(shippingAddress: TShippingAddress): boolean {
  return [
    shippingAddress.deliveryChargeZone,
    shippingAddress.district,
    shippingAddress.upazila,
  ].some(value => INSIDE_DHAKA_ZONE_NAMES.has(normalizeZoneValue(value)));
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

const createDeliveryChargeRuleIntoDB = async (
  payload: TDeliveryChargeRulePayload,
): Promise<TDeliveryChargeRule> => {
  const { appliesToCategories, appliesToProducts, ...rest } = payload;

  const result = await prisma.deliveryChargeRule.create({
    data: {
      ...rest,
      categories:
        appliesToCategories && appliesToCategories.length > 0
          ? { create: appliesToCategories.map(id => ({ categoryId: id })) }
          : undefined,
      products:
        appliesToProducts && appliesToProducts.length > 0
          ? { create: appliesToProducts.map(id => ({ productId: id })) }
          : undefined,
    },
    include: deliveryChargeRuleInclude,
  });

  return mapRule(result);
};

const getAllDeliveryChargeRulesFromDB = async (): Promise<
  TDeliveryChargeRule[]
> => {
  const rules = await prisma.deliveryChargeRule.findMany({
    include: deliveryChargeRuleInclude,
    orderBy: [{ zone: 'asc' }, { scope: 'asc' }, { createdAt: 'desc' }],
  });
  return rules.map(mapRule);
};

const updateDeliveryChargeRuleInDB = async (
  id: string,
  payload: Partial<TDeliveryChargeRulePayload>,
): Promise<TDeliveryChargeRule> => {
  const { appliesToCategories, appliesToProducts, ...rest } = payload;

  if (appliesToCategories !== undefined) {
    await prisma.deliveryChargeCategory.deleteMany({ where: { ruleId: id } });
  }
  if (appliesToProducts !== undefined) {
    await prisma.deliveryChargeProduct.deleteMany({ where: { ruleId: id } });
  }

  const result = await prisma.deliveryChargeRule.update({
    where: { id },
    data: {
      ...rest,
      categories:
        appliesToCategories && appliesToCategories.length > 0
          ? { create: appliesToCategories.map(cid => ({ categoryId: cid })) }
          : undefined,
      products:
        appliesToProducts && appliesToProducts.length > 0
          ? { create: appliesToProducts.map(pid => ({ productId: pid })) }
          : undefined,
    },
    include: deliveryChargeRuleInclude,
  });

  return mapRule(result);
};

const deleteDeliveryChargeRuleFromDB = async (
  id: string,
): Promise<TDeliveryChargeRule> => {
  const result = await prisma.deliveryChargeRule.delete({
    where: { id },
    include: deliveryChargeRuleInclude,
  });
  return mapRule(result);
};

function pickHighestRule(rules: TDeliveryChargeRule[]): TDeliveryChargeRule {
  return rules.reduce((best, rule) =>
    rule.charge > best.charge ? rule : best,
  );
}

const resolveDeliveryChargeByZone = async (
  zone: 'inside' | 'outside',
  productIds: string[],
): Promise<TResolvedDeliveryCharge> => {
  const config = await ensureDeliveryChargeConfig();
  const insideDhaka = zone === 'inside';

  if (productIds.length > 0) {
    const [rules, products] = await Promise.all([
      prisma.deliveryChargeRule.findMany({
        where: { zone, isActive: true },
        include: deliveryChargeRuleInclude,
      }),
      prisma.product.findMany({
        where: { id: { in: productIds } },
        select: {
          id: true,
          categoryId: true,
          category: { select: { id: true, parentId: true } },
        },
      }),
    ]);

    const productIdSet = new Set(productIds);
    const subcategoryIdSet = new Set(
      products.filter(p => p.category?.parentId).map(p => p.categoryId),
    );
    const categoryIdSet = new Set(
      products.map(p => p.category?.parentId ?? p.categoryId),
    );

    const mappedRules = rules.map(mapRule);

    const productRules = mappedRules.filter(
      rule =>
        rule.scope === 'product' &&
        rule.products?.some(prod => productIdSet.has(prod.productId)),
    );
    if (productRules.length > 0) {
      return {
        label: insideDhaka ? INSIDE_DHAKA_LABEL : OUTSIDE_DHAKA_LABEL,
        fee: pickHighestRule(productRules).charge,
      };
    }

    const subcategoryRules = mappedRules.filter(
      rule =>
        rule.scope === 'subcategory' &&
        rule.categories?.some(cat => subcategoryIdSet.has(cat.categoryId)),
    );
    if (subcategoryRules.length > 0) {
      return {
        label: insideDhaka ? INSIDE_DHAKA_LABEL : OUTSIDE_DHAKA_LABEL,
        fee: pickHighestRule(subcategoryRules).charge,
      };
    }

    const categoryRules = mappedRules.filter(
      rule =>
        rule.scope === 'category' &&
        rule.categories?.some(cat => categoryIdSet.has(cat.categoryId)),
    );
    if (categoryRules.length > 0) {
      return {
        label: insideDhaka ? INSIDE_DHAKA_LABEL : OUTSIDE_DHAKA_LABEL,
        fee: pickHighestRule(categoryRules).charge,
      };
    }
  }

  return insideDhaka
    ? { label: INSIDE_DHAKA_LABEL, fee: config.insideDhaka }
    : { label: OUTSIDE_DHAKA_LABEL, fee: config.outsideDhaka };
};

const resolveDeliveryCharge = async (
  shippingAddress: TShippingAddress,
  items: Array<{ productId: string }>,
): Promise<TResolvedDeliveryCharge> => {
  const config = await ensureDeliveryChargeConfig();
  const insideDhaka = isInsideDhakaAddress(shippingAddress);
  const zone = insideDhaka ? 'inside' : 'outside';

  const productIds = items.map(item => item.productId).filter(Boolean);
  if (productIds.length > 0) {
    const [rules, products] = await Promise.all([
      prisma.deliveryChargeRule.findMany({
        where: { zone, isActive: true },
        include: deliveryChargeRuleInclude,
      }),
      prisma.product.findMany({
        where: { id: { in: productIds } },
        select: {
          id: true,
          categoryId: true,
          category: { select: { id: true, parentId: true } },
        },
      }),
    ]);

    const productIdSet = new Set(productIds);
    const subcategoryIdSet = new Set(
      products.filter(p => p.category?.parentId).map(p => p.categoryId),
    );
    const categoryIdSet = new Set(
      products.map(p => p.category?.parentId ?? p.categoryId),
    );

    const mappedRules = rules.map(mapRule);
    const productRules = mappedRules.filter(
      rule =>
        rule.scope === 'product' &&
        rule.products?.some(prod => productIdSet.has(prod.productId)),
    );
    if (productRules.length > 0) {
      const matched = pickHighestRule(productRules);
      return {
        label: insideDhaka ? INSIDE_DHAKA_LABEL : OUTSIDE_DHAKA_LABEL,
        fee: matched.charge,
      };
    }

    const subcategoryRules = mappedRules.filter(
      rule =>
        rule.scope === 'subcategory' &&
        rule.categories?.some(cat => subcategoryIdSet.has(cat.categoryId)),
    );
    if (subcategoryRules.length > 0) {
      const matched = pickHighestRule(subcategoryRules);
      return {
        label: insideDhaka ? INSIDE_DHAKA_LABEL : OUTSIDE_DHAKA_LABEL,
        fee: matched.charge,
      };
    }

    const categoryRules = mappedRules.filter(
      rule =>
        rule.scope === 'category' &&
        rule.categories?.some(cat => categoryIdSet.has(cat.categoryId)),
    );
    if (categoryRules.length > 0) {
      const matched = pickHighestRule(categoryRules);
      return {
        label: insideDhaka ? INSIDE_DHAKA_LABEL : OUTSIDE_DHAKA_LABEL,
        fee: matched.charge,
      };
    }
  }

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
  createDeliveryChargeRuleIntoDB,
  getAllDeliveryChargeRulesFromDB,
  updateDeliveryChargeRuleInDB,
  deleteDeliveryChargeRuleFromDB,
  resolveDeliveryCharge,
  resolveDeliveryChargeByZone,
};
