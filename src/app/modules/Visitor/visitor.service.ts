// src/app/modules/Visitor/visitor.service.ts
import prisma from '../../../shared/prisma';

interface TrackVisitorPayload {
  ip?: string;
  userAgent?: string;
  page?: string;
  referrer?: string;
}

function detectDevice(userAgent?: string): string {
  if (!userAgent) return 'unknown';
  const ua = userAgent.toLowerCase();
  if (/mobile|android|iphone|ipad|ipod/.test(ua)) return 'mobile';
  if (/tablet|ipad/.test(ua)) return 'tablet';
  return 'desktop';
}

const trackVisitor = async (payload: TrackVisitorPayload) => {
  const device = detectDevice(payload.userAgent);

  await prisma.visitor.create({
    data: {
      ip: payload.ip || null,
      userAgent: payload.userAgent || null,
      page: payload.page || null,
      referrer: payload.referrer || null,
      device,
    },
  });
};

const getVisitorStats = async () => {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [
    totalVisitors,
    todayVisitors,
    last7DaysVisitors,
    last30DaysVisitors,
    uniqueVisitorsToday,
    deviceBreakdown,
    last30DaysDaily,
    topPages,
  ] = await Promise.all([
    prisma.visitor.count(),
    prisma.visitor.count({ where: { createdAt: { gte: todayStart } } }),
    prisma.visitor.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
    prisma.visitor.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
    prisma.visitor.groupBy({
      by: ['ip'],
      where: { createdAt: { gte: todayStart }, ip: { not: null } },
    }),
    prisma.visitor.groupBy({
      by: ['device'],
      _count: { id: true },
      where: { createdAt: { gte: thirtyDaysAgo } },
    }),
    prisma.$queryRaw<{ date: string; count: bigint }[]>`
      SELECT DATE("createdAt") as date, COUNT(*)::bigint as count
      FROM visitors
      WHERE "createdAt" >= ${thirtyDaysAgo}
      GROUP BY DATE("createdAt")
      ORDER BY date ASC
    `,
    prisma.visitor.groupBy({
      by: ['page'],
      _count: { id: true },
      where: { createdAt: { gte: thirtyDaysAgo }, page: { not: null } },
      orderBy: { _count: { id: 'desc' } },
      take: 10,
    }),
  ]);

  return {
    totalVisitors,
    todayVisitors,
    uniqueVisitorsToday: uniqueVisitorsToday.length,
    last7DaysVisitors,
    last30DaysVisitors,
    deviceBreakdown: deviceBreakdown.map(d => ({
      device: d.device || 'unknown',
      count: d._count.id,
    })),
    dailyVisitors: last30DaysDaily.map(d => ({
      date:
        typeof d.date === 'string'
          ? d.date
          : new Date(d.date).toISOString().split('T')[0],
      count: Number(d.count),
    })),
    topPages: topPages.map(p => ({
      page: p.page || '/',
      count: p._count.id,
    })),
  };
};

export const VisitorService = {
  trackVisitor,
  getVisitorStats,
};
