import express from 'express';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { ADMIN_ROLE } from '../Admin/admin.constants';
import { DeliveryChargeController } from './deliveryCharge.controller';
import { DeliveryChargeValidation } from './deliveryCharge.validation';

const router = express.Router();

router.get('/', DeliveryChargeController.getDeliveryChargeConfig);

// Public route — resolve delivery charge for a cart preview
router.post(
  '/resolve',
  validateRequest(DeliveryChargeValidation.resolveDeliveryChargeZodSchema),
  DeliveryChargeController.resolveDeliveryChargePreview,
);

router.patch(
  '/',
  auth(ADMIN_ROLE.SUPER_ADMIN),
  validateRequest(DeliveryChargeValidation.updateDeliveryChargeConfigZodSchema),
  DeliveryChargeController.updateDeliveryChargeConfig,
);

router.get(
  '/rules',
  auth(ADMIN_ROLE.SUPER_ADMIN),
  DeliveryChargeController.getAllDeliveryChargeRules,
);

router.post(
  '/rules',
  auth(ADMIN_ROLE.SUPER_ADMIN),
  validateRequest(DeliveryChargeValidation.createDeliveryChargeRuleZodSchema),
  DeliveryChargeController.createDeliveryChargeRule,
);

router.patch(
  '/rules/:id',
  auth(ADMIN_ROLE.SUPER_ADMIN),
  validateRequest(DeliveryChargeValidation.updateDeliveryChargeRuleZodSchema),
  DeliveryChargeController.updateDeliveryChargeRule,
);

router.delete(
  '/rules/:id',
  auth(ADMIN_ROLE.SUPER_ADMIN),
  DeliveryChargeController.deleteDeliveryChargeRule,
);

export const DeliveryChargeRoutes = router;
