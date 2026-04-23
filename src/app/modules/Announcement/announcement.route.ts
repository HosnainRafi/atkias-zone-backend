// src/app/modules/Announcement/announcement.route.ts
import express from "express";
import auth from "../../middlewares/auth";
import validateRequest from "../../middlewares/validateRequest";
import { ADMIN_ROLE } from "../Admin/admin.constants";
import { AnnouncementController } from "./announcement.controller";
import { AnnouncementValidation } from "./announcement.validation";

const router = express.Router();

router.post(
  "/",
  auth(ADMIN_ROLE.ADMIN, ADMIN_ROLE.EDITOR),
  validateRequest(AnnouncementValidation.createAnnouncementZodSchema),
  AnnouncementController.createAnnouncement,
);
router.get("/", AnnouncementController.getAllAnnouncements);
router.get("/:id", AnnouncementController.getSingleAnnouncement);
router.patch(
  "/:id",
  auth(ADMIN_ROLE.ADMIN, ADMIN_ROLE.EDITOR),
  validateRequest(AnnouncementValidation.updateAnnouncementZodSchema),
  AnnouncementController.updateAnnouncement,
);
router.delete(
  "/:id",
  auth(ADMIN_ROLE.ADMIN),
  AnnouncementController.deleteAnnouncement,
);

export const AnnouncementRoutes = router;
