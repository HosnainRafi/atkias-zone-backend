import express from 'express';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { ADMIN_ROLE } from '../Admin/admin.constants';
import { TagController } from './tag.controller';
import { TagValidation } from './tag.validation';

const router = express.Router();
 
router.post(
  '/',
  auth(ADMIN_ROLE.ADMIN),
  validateRequest(TagValidation.createTagZodSchema),
  TagController.createTag,
);

router.get('/', TagController.getAllTags);
router.get('/:id', TagController.getSingleTag);

router.patch(
  '/:id',
  auth(ADMIN_ROLE.ADMIN),
  validateRequest(TagValidation.updateTagZodSchema),
  TagController.updateTag,
);

router.delete('/:id', auth(ADMIN_ROLE.ADMIN), TagController.deleteTag);

export const TagRoutes = router;
