// src/app/modules/Analytics/analytics.controller.ts
import { Request, Response } from 'express';
import httpStatus from 'http-status';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { AnalyticsService } from './analytics.service';

const getDashboardSummary = catchAsync(async (_req: Request, res: Response) => {
  const result = await AnalyticsService.getDashboardSummary();
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Dashboard summary retrieved successfully!',
    data: result,
  });
});

const getStatistics = catchAsync(async (_req: Request, res: Response) => {
  const result = await AnalyticsService.getStatistics();
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Statistics retrieved successfully!',
    data: result,
  });
});

export const AnalyticsController = {
  getDashboardSummary,
  getStatistics,
};
