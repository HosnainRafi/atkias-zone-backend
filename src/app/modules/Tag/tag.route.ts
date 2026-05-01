import express from 'express';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { ADMIN_ROLE } from '../Admin/admin.constants';
import { TagController } from './tag.controller';
import { TagValidation } from './tag.validation';

const router = express.Router();

router.post(
  '/',
  auth(ADMIN_ROLE.SUPER_ADMIN, ADMIN_ROLE.ADMIN, ADMIN_ROLE.EDITOR),
  validateRequest(TagValidation.createTagZodSchema),
  TagController.createTag,
);

router.get('/', TagController.getAllTags);
router.get('/:id', TagController.getSingleTag);

router.patch(
  '/:id',
  auth(ADMIN_ROLE.SUPER_ADMIN, ADMIN_ROLE.ADMIN, ADMIN_ROLE.EDITOR),
  validateRequest(TagValidation.updateTagZodSchema),
  TagController.updateTag,
);

router.delete(
  '/:id',
  auth(ADMIN_ROLE.SUPER_ADMIN, ADMIN_ROLE.ADMIN, ADMIN_ROLE.EDITOR),
  TagController.deleteTag,
);

export const TagRoutes = router;
