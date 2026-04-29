// src/app/modules/Visitor/visitor.controller.ts
import { Request, Response } from 'express';
import httpStatus from 'http-status';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { VisitorService } from './visitor.service';

const trackVisitor = catchAsync(async (req: Request, res: Response) => {
  const ip =
    (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
    req.socket.remoteAddress ||
    undefined;

  await VisitorService.trackVisitor({
    ip,
    userAgent: req.headers['user-agent'],
    page: req.body.page || undefined,
    referrer: req.body.referrer || req.headers.referer || undefined,
  });

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Visitor tracked',
    data: null,
  });
});

const getVisitorStats = catchAsync(async (_req: Request, res: Response) => {
  const result = await VisitorService.getVisitorStats();
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Visitor stats retrieved successfully!',
    data: result,
  });
});

export const VisitorController = {
  trackVisitor,
  getVisitorStats,
};
