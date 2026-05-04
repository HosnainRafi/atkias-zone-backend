import express from 'express';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { ADMIN_ROLE } from '../Admin/admin.constants';
import { DeliveryChargeController } from './deliveryCharge.controller';
import { DeliveryChargeValidation } from './deliveryCharge.validation';

const router = express.Router();

router.get('/', DeliveryChargeController.getDeliveryChargeConfig);

router.patch(
  '/',
  auth(ADMIN_ROLE.SUPER_ADMIN, ADMIN_ROLE.ADMIN),
  validateRequest(DeliveryChargeValidation.updateDeliveryChargeConfigZodSchema),
  DeliveryChargeController.updateDeliveryChargeConfig,
);

export const DeliveryChargeRoutes = router;