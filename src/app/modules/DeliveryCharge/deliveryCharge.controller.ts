import { Request, Response } from 'express';
import httpStatus from 'http-status';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { DeliveryChargeService } from './deliveryCharge.service';

const getDeliveryChargeConfig = catchAsync(
  async (_req: Request, res: Response) => {
    const result =
      await DeliveryChargeService.getDeliveryChargeConfigFromDB();

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Delivery charge configuration retrieved!',
      data: result,
    });
  },
);

const updateDeliveryChargeConfig = catchAsync(
  async (req: Request, res: Response) => {
    const result = await DeliveryChargeService.updateDeliveryChargeConfigInDB(
      req.body,
    );

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Delivery charge configuration updated!',
      data: result,
    });
  },
);

export const DeliveryChargeController = {
  getDeliveryChargeConfig,
  updateDeliveryChargeConfig,
};