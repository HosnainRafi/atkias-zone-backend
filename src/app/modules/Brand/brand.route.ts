// src/app/modules/Brand/brand.route.ts
import express from "express";
import auth from "../../middlewares/auth";
import validateRequest from "../../middlewares/validateRequest";
import { ADMIN_ROLE } from "../Admin/admin.constants";
import { BrandController } from "./brand.controller";
import { BrandValidation } from "./brand.validation";

const router = express.Router();

router.post(
  "/",
  auth(ADMIN_ROLE.ADMIN),
  validateRequest(BrandValidation.createBrandZodSchema),
  BrandController.createBrand,
);
router.get("/", BrandController.getAllBrands);
router.get("/:id", BrandController.getSingleBrand);
router.patch(
  "/:id",
  auth(ADMIN_ROLE.ADMIN),
  validateRequest(BrandValidation.updateBrandZodSchema),
  BrandController.updateBrand,
);
router.delete("/:id", auth(ADMIN_ROLE.ADMIN), BrandController.deleteBrand);

export const BrandRoutes = router;
