import { Request, Response } from 'express';
import httpStatus from 'http-status';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { DeliveryChargeService } from './deliveryCharge.service';
import {
  TDeliveryChargeRule,
  TResolvedDeliveryCharge,
} from './deliveryCharge.interface';

const getDeliveryChargeConfig = catchAsync(
  async (_req: Request, res: Response) => {
    const result = await DeliveryChargeService.getDeliveryChargeConfigFromDB();

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
  resolveDeliveryChargePreview: catchAsync(
    async (req: Request, res: Response) => {
      const {
        zone,
        productIds = [],
        orderAmount,
      } = req.body as {
        zone: 'inside' | 'outside';
        productIds?: string[];
        orderAmount?: number;
      };

      const result = await DeliveryChargeService.resolveDeliveryChargeByZone(
        zone,
        productIds,
        orderAmount,
      );

      sendResponse<TResolvedDeliveryCharge>(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: 'Delivery charge resolved!',
        data: result,
      });
    },
  ),
  createDeliveryChargeRule: catchAsync(async (req: Request, res: Response) => {
    const result = await DeliveryChargeService.createDeliveryChargeRuleIntoDB(
      req.body,
    );

    sendResponse<TDeliveryChargeRule>(res, {
      statusCode: httpStatus.CREATED,
      success: true,
      message: 'Delivery charge rule created!',
      data: result,
    });
  }),
  getAllDeliveryChargeRules: catchAsync(
    async (_req: Request, res: Response) => {
      const result =
        await DeliveryChargeService.getAllDeliveryChargeRulesFromDB();

      sendResponse<TDeliveryChargeRule[]>(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: 'Delivery charge rules retrieved!',
        data: result,
      });
    },
  ),
  updateDeliveryChargeRule: catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params;
    const result = await DeliveryChargeService.updateDeliveryChargeRuleInDB(
      id,
      req.body,
    );

    sendResponse<TDeliveryChargeRule>(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Delivery charge rule updated!',
      data: result,
    });
  }),
  deleteDeliveryChargeRule: catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params;
    const result =
      await DeliveryChargeService.deleteDeliveryChargeRuleFromDB(id);

    sendResponse<TDeliveryChargeRule>(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Delivery charge rule deleted!',
      data: result,
    });
  }),
};
