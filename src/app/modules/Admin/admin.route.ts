// src/app/modules/Admin/admin.route.ts
import express from 'express';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { ADMIN_ROLE } from '../Admin/admin.constants';
import { AdminController } from './admin.controller';
import { AdminValidation } from './admin.validation';

const router = express.Router();

router.post(
  '/login',
  validateRequest(AdminValidation.loginAdminZodSchema),
  AdminController.loginAdmin,
);

router.get(
  '/me',
  auth(ADMIN_ROLE.SUPER_ADMIN, ADMIN_ROLE.ADMIN, ADMIN_ROLE.EDITOR),
  AdminController.getMe,
);

router.get(
  '/',
  auth(ADMIN_ROLE.SUPER_ADMIN, ADMIN_ROLE.ADMIN),
  AdminController.getAllAdmins,
);

router.post(
  '/create',
  auth(ADMIN_ROLE.SUPER_ADMIN),
  validateRequest(AdminValidation.createAdminZodSchema),
  AdminController.createAdmin,
);

router.patch(
  '/change-password',
  auth(ADMIN_ROLE.SUPER_ADMIN, ADMIN_ROLE.ADMIN, ADMIN_ROLE.EDITOR),
  AdminController.changePassword,
);

router.patch(
  '/profile',
  auth(ADMIN_ROLE.SUPER_ADMIN, ADMIN_ROLE.ADMIN, ADMIN_ROLE.EDITOR),
  validateRequest(AdminValidation.updateProfileZodSchema),
  AdminController.updateProfile,
);

router.patch(
  '/:id',
  auth(ADMIN_ROLE.SUPER_ADMIN, ADMIN_ROLE.ADMIN),
  AdminController.updateAdmin,
);

router.delete(
  '/:id',
  auth(ADMIN_ROLE.SUPER_ADMIN),
  AdminController.deleteAdmin,
);

export const AdminRoutes = router;
