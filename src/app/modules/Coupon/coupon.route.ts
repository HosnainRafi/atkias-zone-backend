// src/app/modules/Coupon/coupon.route.ts
import express from "express";
import auth from "../../middlewares/auth";
import validateRequest from "../../middlewares/validateRequest";
import { ADMIN_ROLE } from "../Admin/admin.constants";
import { CouponController } from "./coupon.controller";
import { CouponValidation } from "./coupon.validation";

const router = express.Router();

// Public route for applying a coupon
router.post(
  "/apply",
  validateRequest(CouponValidation.applyCouponZodSchema),
  CouponController.applyCoupon
);

// --- Admin-Only Routes ---

router.post(
  "/",
  auth(ADMIN_ROLE.ADMIN, ADMIN_ROLE.SUPER_ADMIN),
  validateRequest(CouponValidation.createCouponZodSchema),
  CouponController.createCoupon
);

router.get("/", CouponController.getAllCoupons);

router.get(
  "/:id",
  auth(ADMIN_ROLE.ADMIN, ADMIN_ROLE.SUPER_ADMIN),
  CouponController.getSingleCoupon
);

router.patch(
  "/:id",
  auth(ADMIN_ROLE.ADMIN, ADMIN_ROLE.SUPER_ADMIN),
  validateRequest(CouponValidation.updateCouponZodSchema),
  CouponController.updateCoupon
);

router.delete(
  "/:id",
  auth(ADMIN_ROLE.ADMIN, ADMIN_ROLE.SUPER_ADMIN),
  CouponController.deleteCoupon
);

export const CouponRoutes = router;
