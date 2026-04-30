// src/app/modules/Bkash/bkash.route.ts
import express from "express";
import { BkashController } from "./bkash.controller";

const router = express.Router();

// Called by the frontend after order creation to start the bKash flow.
router.post("/create-payment", BkashController.initiatePayment);

// Called by bKash after the user completes, cancels, or fails payment.
// Returns a redirect to the frontend — not a JSON response.
router.get("/callback", BkashController.handleCallback);

export const BkashRoutes = router;
