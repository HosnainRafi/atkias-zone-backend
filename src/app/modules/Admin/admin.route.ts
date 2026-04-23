// src/app/modules/Admin/admin.route.ts
import express from "express";
import auth from "../../middlewares/auth";
import validateRequest from "../../middlewares/validateRequest";
import { ADMIN_ROLE } from "../Admin/admin.constants";
import { AdminController } from "./admin.controller";
import { AdminValidation } from "./admin.validation";

const router = express.Router();

router.post(
  "/register",
  auth(ADMIN_ROLE.ADMIN),
  validateRequest(AdminValidation.createAdminZodSchema),
  AdminController.createAdmin,
);

router.post(
  "/login",
  validateRequest(AdminValidation.loginAdminZodSchema),
  AdminController.loginAdmin,
);

router.get(
  "/me",
  auth(ADMIN_ROLE.ADMIN, ADMIN_ROLE.EDITOR),
  AdminController.getMe,
);

router.get("/", auth(ADMIN_ROLE.ADMIN), AdminController.getAllAdmins);

router.patch(
  "/change-password",
  auth(ADMIN_ROLE.ADMIN, ADMIN_ROLE.EDITOR),
  AdminController.changePassword,
);

router.patch("/:id", auth(ADMIN_ROLE.ADMIN), AdminController.updateAdmin);

export const AdminRoutes = router;
