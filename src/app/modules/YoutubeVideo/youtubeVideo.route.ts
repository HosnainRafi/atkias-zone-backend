// src/app/modules/YoutubeVideo/youtubeVideo.route.ts
import express from 'express';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { ADMIN_ROLE } from '../Admin/admin.constants';
import { YoutubeVideoController } from './youtubeVideo.controller';
import { YoutubeVideoValidation } from './youtubeVideo.validation';

const router = express.Router();

router.post(
  '/',
  auth(ADMIN_ROLE.SUPER_ADMIN, ADMIN_ROLE.ADMIN, ADMIN_ROLE.EDITOR),
  validateRequest(YoutubeVideoValidation.createYoutubeVideoZodSchema),
  YoutubeVideoController.createVideo,
);
router.get('/', YoutubeVideoController.getAllVideos);
router.get('/:id', YoutubeVideoController.getSingleVideo);
router.patch(
  '/:id',
  auth(ADMIN_ROLE.SUPER_ADMIN, ADMIN_ROLE.ADMIN, ADMIN_ROLE.EDITOR),
  validateRequest(YoutubeVideoValidation.updateYoutubeVideoZodSchema),
  YoutubeVideoController.updateVideo,
);
router.delete(
  '/:id',
  auth(ADMIN_ROLE.SUPER_ADMIN, ADMIN_ROLE.ADMIN, ADMIN_ROLE.EDITOR),
  YoutubeVideoController.deleteVideo,
);

export const YoutubeVideoRoutes = router;
