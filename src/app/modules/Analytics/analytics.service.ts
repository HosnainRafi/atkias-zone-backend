// src/app/modules/Analytics/analytics.service.ts
import prisma from '../../../shared/prisma';

export interface DashboardSummary {
  totalOrders: number;
  totalRevenue: number;
  totalProducts: number;
  totalCategories: number;
  totalBrands: number;
  totalCustomers: number;
  totalCoupons: number;
  pendingOrders: number;
  processingOrders: number;
  shippedOrders: number;
  deliveredOrders: number;
  cancelledOrders: number;
  refundedOrders: number;
  paidOrders: number;
  averageOrderValue: number;
  revenueToday: number;
  ordersToday: number;
}

export interface RevenueByDate {
  date: string;
  revenue: number;
  orders: number;
}

export interface OrdersByStatus {
  status: string;
  count: number;
}

export interface PaymentMethodBreakdown {
  method: string;
  count: number;
  revenue: number;
}

export interface TopProduct {
  productId: string;
  title: string;
  image: string;
  totalSold: number;
  totalRevenue: number;
}

export interface RecentOrder {
  id: string;
  trackingNumber: string;
  customerName: string;
  totalAmount: number;
  status: string;
  paymentStatus: string;
  createdAt: Date;
}

export interface StatisticsData {
  revenueByDate: RevenueByDate[];
  ordersByStatus: OrdersByStatus[];
  paymentMethodBreakdown: PaymentMethodBreakdown[];
  topProducts: TopProduct[];
  revenueByMonth: RevenueByDate[];
  ordersByDayOfWeek: { day: string; orders: number }[];
  categoryDistribution: { category: string; products: number }[];
  deliveryZoneBreakdown: { zone: string; orders: number; revenue: number }[];
}

const getDashboardSummary = async (): Promise<{
  summary: DashboardSummary;
  recentOrders: RecentOrder[];
  revenueChart: RevenueByDate[];
  ordersByStatus: OrdersByStatus[];
}> => {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [
    totalOrders,
    totalProducts,
    totalCategories,
    totalBrands,
    totalCoupons,
    orderStatusCounts,
    revenueAgg,
    todayStats,
    paidOrders,
    recentOrders,
    last30DaysOrders,
    uniqueCustomers,
  ] = await Promise.all([
    prisma.order.count(),
    prisma.product.count({ where: { isActive: true } }),
    prisma.category.count(),
    prisma.brand.count(),
    prisma.coupon.count(),
    prisma.order.groupBy({
      by: ['status'],
      _count: { id: true },
    }),
    prisma.order.aggregate({
      _sum: { totalAmount: true },
      _avg: { totalAmount: true },
    }),
    prisma.order.aggregate({
      where: { createdAt: { gte: todayStart } },
      _count: { id: true },
      _sum: { totalAmount: true },
    }),
    prisma.order.count({ where: { paymentStatus: 'paid' } }),
    prisma.order.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        trackingNumber: true,
        customerName: true,
        totalAmount: true,
        status: true,
        paymentStatus: true,
        createdAt: true,
      },
    }),
    prisma.order.findMany({
      where: { createdAt: { gte: thirtyDaysAgo } },
      select: {
        totalAmount: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.order.findMany({
      distinct: ['mobile'],
      select: { mobile: true },
    }),
  ]);

  const statusMap: Record<string, number> = {};
  orderStatusCounts.forEach(s => {
    statusMap[s.status] = s._count.id;
  });

  const summary: DashboardSummary = {
    totalOrders,
    totalRevenue: Number(revenueAgg._sum.totalAmount ?? 0),
    totalProducts,
    totalCategories,
    totalBrands,
    totalCustomers: uniqueCustomers.length,
    totalCoupons,
    pendingOrders: statusMap['pending'] ?? 0,
    processingOrders: statusMap['processing'] ?? 0,
    shippedOrders: statusMap['shipped'] ?? 0,
    deliveredOrders: statusMap['delivered'] ?? 0,
    cancelledOrders: statusMap['cancelled'] ?? 0,
    refundedOrders: statusMap['refunded'] ?? 0,
    paidOrders,
    averageOrderValue: Number(revenueAgg._avg.totalAmount ?? 0),
    revenueToday: Number(todayStats._sum.totalAmount ?? 0),
    ordersToday: todayStats._count.id,
  };

  // Build 30-day revenue chart
  const revenueMap = new Map<string, { revenue: number; orders: number }>();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const key = d.toISOString().slice(0, 10);
    revenueMap.set(key, { revenue: 0, orders: 0 });
  }
  last30DaysOrders.forEach(order => {
    const key = new Date(order.createdAt).toISOString().slice(0, 10);
    const existing = revenueMap.get(key);
    if (existing) {
      existing.revenue += Number(order.totalAmount);
      existing.orders += 1;
    }
  });
  const revenueChart: RevenueByDate[] = Array.from(revenueMap.entries()).map(
    ([date, val]) => ({ date, revenue: val.revenue, orders: val.orders }),
  );

  const ordersByStatus: OrdersByStatus[] = orderStatusCounts.map(s => ({
    status: s.status,
    count: s._count.id,
  }));

  return { summary, recentOrders, revenueChart, ordersByStatus };
};

const getStatistics = async (): Promise<StatisticsData> => {
  const now = new Date();
  const sixMonthsAgo = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);

  const [ordersForStats, orderItems, categories, paymentMethodAgg] =
    await Promise.all([
      prisma.order.findMany({
        where: { createdAt: { gte: sixMonthsAgo } },
        select: {
          totalAmount: true,
          status: true,
          paymentMethod: true,
          deliveryChargeZone: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.orderItem.groupBy({
        by: ['productId'],
        _sum: { quantity: true, totalPrice: true },
        orderBy: { _sum: { quantity: 'desc' } },
        take: 10,
      }),
      prisma.category.findMany({
        include: { _count: { select: { products: true } } },
      }),
      prisma.order.groupBy({
        by: ['paymentMethod'],
        _count: { id: true },
        _sum: { totalAmount: true },
      }),
    ]);

  // Top products with details
  const topProductIds = orderItems.map(i => i.productId);
  const topProductDetails = await prisma.product.findMany({
    where: { id: { in: topProductIds } },
    select: { id: true, title: true, images: true },
  });
  const productMap = new Map(topProductDetails.map(p => [p.id, p]));

  const topProducts: TopProduct[] = orderItems.map(item => {
    const product = productMap.get(item.productId);
    return {
      productId: item.productId,
      title: product?.title ?? 'Unknown',
      image: product?.images?.[0] ?? '',
      totalSold: item._sum.quantity ?? 0,
      totalRevenue: Number(item._sum.totalPrice ?? 0),
    };
  });

  // Revenue by month (last 6 months)
  const monthMap = new Map<string, { revenue: number; orders: number }>();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = d.toISOString().slice(0, 7);
    monthMap.set(key, { revenue: 0, orders: 0 });
  }
  ordersForStats.forEach(order => {
    const key = new Date(order.createdAt).toISOString().slice(0, 7);
    const existing = monthMap.get(key);
    if (existing) {
      existing.revenue += Number(order.totalAmount);
      existing.orders += 1;
    }
  });
  const revenueByMonth = Array.from(monthMap.entries()).map(([date, val]) => ({
    date,
    revenue: val.revenue,
    orders: val.orders,
  }));

  // Orders by day of week
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const dayMap = new Map<number, number>();
  for (let i = 0; i < 7; i++) dayMap.set(i, 0);
  ordersForStats.forEach(order => {
    const day = new Date(order.createdAt).getDay();
    dayMap.set(day, (dayMap.get(day) ?? 0) + 1);
  });
  const ordersByDayOfWeek = dayNames.map((day, i) => ({
    day,
    orders: dayMap.get(i) ?? 0,
  }));

  // Orders by status
  const statusCountMap = new Map<string, number>();
  ordersForStats.forEach(o => {
    statusCountMap.set(o.status, (statusCountMap.get(o.status) ?? 0) + 1);
  });
  const ordersByStatus = Array.from(statusCountMap.entries()).map(
    ([status, count]) => ({ status, count }),
  );

  // Revenue by date (last 30 days)
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const dateMap = new Map<string, { revenue: number; orders: number }>();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const key = d.toISOString().slice(0, 10);
    dateMap.set(key, { revenue: 0, orders: 0 });
  }
  ordersForStats
    .filter(o => new Date(o.createdAt) >= thirtyDaysAgo)
    .forEach(order => {
      const key = new Date(order.createdAt).toISOString().slice(0, 10);
      const existing = dateMap.get(key);
      if (existing) {
        existing.revenue += Number(order.totalAmount);
        existing.orders += 1;
      }
    });
  const revenueByDate = Array.from(dateMap.entries()).map(([date, val]) => ({
    date,
    revenue: val.revenue,
    orders: val.orders,
  }));

  // Payment method breakdown
  const paymentMethodBreakdown = paymentMethodAgg.map(p => ({
    method: p.paymentMethod,
    count: p._count.id,
    revenue: Number(p._sum.totalAmount ?? 0),
  }));

  // Category distribution
  const categoryDistribution = categories.map(c => ({
    category: c.name,
    products: c._count.products,
  }));

  // Delivery zone breakdown
  const zoneMap = new Map<string, { orders: number; revenue: number }>();
  ordersForStats.forEach(o => {
    const zone = o.deliveryChargeZone || 'Unknown';
    const existing = zoneMap.get(zone) ?? { orders: 0, revenue: 0 };
    existing.orders += 1;
    existing.revenue += Number(o.totalAmount);
    zoneMap.set(zone, existing);
  });
  const deliveryZoneBreakdown = Array.from(zoneMap.entries()).map(
    ([zone, val]) => ({ zone, ...val }),
  );

  return {
    revenueByDate,
    ordersByStatus,
    paymentMethodBreakdown,
    topProducts,
    revenueByMonth,
    ordersByDayOfWeek,
    categoryDistribution,
    deliveryZoneBreakdown,
  };
};

export const AnalyticsService = {
  getDashboardSummary,
  getStatistics,
};
