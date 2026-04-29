// src/app/modules/Visitor/visitor.route.ts
import express from 'express';
import auth from '../../middlewares/auth';
import { VisitorController } from './visitor.controller';

const router = express.Router();

// Public route - called from frontend to track page visits
router.post('/track', VisitorController.trackVisitor);

// Admin route - get visitor analytics
router.get('/stats', auth('ADMIN'), VisitorController.getVisitorStats);

export const VisitorRoutes = router;
