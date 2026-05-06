// src/app/modules/Order/order.route.ts
import express from 'express';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { ADMIN_ROLE } from '../Admin/admin.constants';
import { OrderController } from './order.controller';
import { OrderValidation } from './order.validation';

const router = express.Router();

// Public route for placing an order
router.post(
  '/',
  validateRequest(OrderValidation.createOrderZodSchema),
  OrderController.createOrder,
);

router.post(
  '/track',
  validateRequest(OrderValidation.trackOrderZodSchema),
  OrderController.trackOrder,
);

// Public route for users to view their order details (e.g., on order success page)
router.get('/:id', OrderController.getSingleOrder);

// --- Admin-Only Routes ---

router.get(
  '/admin/all',
  auth(ADMIN_ROLE.SUPER_ADMIN, ADMIN_ROLE.ADMIN),
  OrderController.getAllOrders,
);

router.get(
  '/admin/sales-report',
  auth(ADMIN_ROLE.SUPER_ADMIN, ADMIN_ROLE.ADMIN),
  OrderController.getSalesReport,
);

router.post(
  '/admin/manual',
  auth(ADMIN_ROLE.SUPER_ADMIN, ADMIN_ROLE.ADMIN),
  validateRequest(OrderValidation.createManualOrderZodSchema),
  OrderController.createManualOrder,
);

router.post(
  '/admin/:id/steadfast',
  auth(ADMIN_ROLE.SUPER_ADMIN),
  validateRequest(OrderValidation.createSteadfastParcelZodSchema),
  OrderController.createSteadfastParcel,
);

router.post(
  '/admin/steadfast/bulk',
  auth(ADMIN_ROLE.SUPER_ADMIN),
  validateRequest(OrderValidation.createSteadfastBulkParcelZodSchema),
  OrderController.createSteadfastBulkParcels,
);

router.post(
  '/admin/:id/steadfast/return-request',
  auth(ADMIN_ROLE.SUPER_ADMIN),
  validateRequest(OrderValidation.createSteadfastReturnRequestZodSchema),
  OrderController.createSteadfastReturnRequest,
);

router.get(
  '/admin/steadfast/returns',
  auth(ADMIN_ROLE.SUPER_ADMIN),
  OrderController.getSteadfastReturnRequests,
);

router.get(
  '/admin/steadfast/returns/:returnId',
  auth(ADMIN_ROLE.SUPER_ADMIN),
  OrderController.getSteadfastReturnRequest,
);

router.get(
  '/admin/steadfast/balance',
  auth(ADMIN_ROLE.SUPER_ADMIN),
  OrderController.getSteadfastBalance,
);

router.get(
  '/admin/steadfast/status/:consignmentId',
  auth(ADMIN_ROLE.SUPER_ADMIN),
  OrderController.getSteadfastStatusByConsignmentId,
);

router.get(
  '/admin/steadfast/trackings/:invoice',
  auth(ADMIN_ROLE.SUPER_ADMIN),
  OrderController.getSteadfastTrackingsByInvoice,
);

router.post(
  '/admin/steadfast/fraud-check',
  auth(ADMIN_ROLE.SUPER_ADMIN),
  validateRequest(OrderValidation.createSteadfastFraudCheckZodSchema),
  OrderController.checkSteadfastFraud,
);

router.post(
  '/admin/:id/steadfast/sync',
  auth(ADMIN_ROLE.SUPER_ADMIN),
  OrderController.syncSteadfastParcelStatus,
);

router.patch(
  '/admin/:id',
  auth(ADMIN_ROLE.SUPER_ADMIN, ADMIN_ROLE.ADMIN),
  validateRequest(OrderValidation.updateOrderZodSchema),
  OrderController.updateOrder,
);

// Route for admin to update order status
router.patch(
  '/admin/:id/status',
  auth(ADMIN_ROLE.SUPER_ADMIN, ADMIN_ROLE.ADMIN),
  validateRequest(OrderValidation.updateOrderStatusZodSchema),
  OrderController.updateOrderStatus,
);

export const OrderRoutes = router;
