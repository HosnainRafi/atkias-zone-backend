// src/app/modules/Order/order.route.ts
import express from "express";
import auth from "../../middlewares/auth";
import validateRequest from "../../middlewares/validateRequest";
import { ADMIN_ROLE } from "../Admin/admin.constants";
import { OrderController } from "./order.controller";
import { OrderValidation } from "./order.validation";

const router = express.Router();

// Public route for placing an order
router.post(
  "/",
  validateRequest(OrderValidation.createOrderZodSchema),
  OrderController.createOrder
);

router.post(
  "/track",
  validateRequest(OrderValidation.trackOrderZodSchema),
  OrderController.trackOrder
);

// --- Admin-Only Routes ---

router.get(
  "/",
  auth(ADMIN_ROLE.ADMIN, ADMIN_ROLE.SUPER_ADMIN),
  OrderController.getAllOrders
);

router.get(
  "/:id",
  auth(ADMIN_ROLE.ADMIN, ADMIN_ROLE.SUPER_ADMIN),
  OrderController.getSingleOrder
);

// Route for admin to update order status
router.patch(
  "/:id/status",
  auth(ADMIN_ROLE.ADMIN, ADMIN_ROLE.SUPER_ADMIN),
  validateRequest(OrderValidation.updateOrderStatusZodSchema),
  OrderController.updateOrderStatus
);

export const OrderRoutes = router;
