// src/app/modules/Analytics/analytics.route.ts
import express from 'express';
import auth from '../../middlewares/auth';
import { ADMIN_ROLE } from '../Admin/admin.constants';
import { AnalyticsController } from './analytics.controller';

const router = express.Router();

router.get(
  '/dashboard',
  auth(ADMIN_ROLE.SUPER_ADMIN, ADMIN_ROLE.ADMIN, ADMIN_ROLE.EDITOR),
  AnalyticsController.getDashboardSummary,
);
router.get(
  '/statistics',
  auth(ADMIN_ROLE.SUPER_ADMIN, ADMIN_ROLE.ADMIN, ADMIN_ROLE.EDITOR),
  AnalyticsController.getStatistics,
);

export const AnalyticsRoutes = router;
