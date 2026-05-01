// src/app/modules/HomepageSection/homepageSection.route.ts
import express from 'express';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { ADMIN_ROLE } from '../Admin/admin.constants';
import { HomepageSectionController } from './homepageSection.controller';
import { HomepageSectionValidation } from './homepageSection.validation';

const router = express.Router();

const adminRoles = [
  ADMIN_ROLE.SUPER_ADMIN,
  ADMIN_ROLE.ADMIN,
  ADMIN_ROLE.EDITOR,
];

router.post(
  '/',
  auth(...adminRoles),
  validateRequest(HomepageSectionValidation.createSectionZodSchema),
  HomepageSectionController.createSection,
);
router.get('/', HomepageSectionController.getAllSections);
router.get('/:id', HomepageSectionController.getSingleSection);
router.patch(
  '/:id',
  auth(...adminRoles),
  validateRequest(HomepageSectionValidation.updateSectionZodSchema),
  HomepageSectionController.updateSection,
);
router.delete(
  '/:id',
  auth(ADMIN_ROLE.SUPER_ADMIN, ADMIN_ROLE.ADMIN),
  HomepageSectionController.deleteSection,
);

// Section items
router.post(
  '/:sectionId/items',
  auth(...adminRoles),
  validateRequest(HomepageSectionValidation.addItemZodSchema),
  HomepageSectionController.addItem,
);
router.patch(
  '/items/:itemId',
  auth(...adminRoles),
  validateRequest(HomepageSectionValidation.updateItemZodSchema),
  HomepageSectionController.updateItem,
);
router.delete(
  '/items/:itemId',
  auth(ADMIN_ROLE.SUPER_ADMIN, ADMIN_ROLE.ADMIN),
  HomepageSectionController.deleteItem,
);

export const HomepageSectionRoutes = router;
