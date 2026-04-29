// src/app/modules/Analytics/analytics.route.ts
import express from 'express';
import auth from '../../middlewares/auth';
import { AnalyticsController } from './analytics.controller';

const router = express.Router();

router.get(
  '/dashboard',
  auth('ADMIN'),
  AnalyticsController.getDashboardSummary,
);
router.get('/statistics', auth('ADMIN'), AnalyticsController.getStatistics);

export const AnalyticsRoutes = router;
