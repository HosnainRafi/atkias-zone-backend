// src/app/modules/Banner/banner.route.ts
import express from "express";
import auth from "../../middlewares/auth";
import validateRequest from "../../middlewares/validateRequest";
import { ADMIN_ROLE } from "../Admin/admin.constants";
import { BannerController } from "./banner.controller";
import { BannerValidation } from "./banner.validation";

const router = express.Router();

router.post(
  "/",
  auth(ADMIN_ROLE.ADMIN),
  validateRequest(BannerValidation.createBannerZodSchema),
  BannerController.createBanner,
);
router.get("/", BannerController.getAllBanners);
router.get(
  "/admin/all",
  auth(ADMIN_ROLE.ADMIN, ADMIN_ROLE.EDITOR),
  BannerController.getAllBannersAdmin,
);
router.get("/:id", BannerController.getSingleBanner);
router.patch(
  "/:id",
  auth(ADMIN_ROLE.ADMIN),
  validateRequest(BannerValidation.updateBannerZodSchema),
  BannerController.updateBanner,
);
router.delete("/:id", auth(ADMIN_ROLE.ADMIN), BannerController.deleteBanner);

export const BannerRoutes = router;
