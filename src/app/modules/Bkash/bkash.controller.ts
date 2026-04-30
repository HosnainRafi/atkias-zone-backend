// src/app/modules/Bkash/bkash.controller.ts
import { Request, Response } from "express";
import httpStatus from "http-status";
import config from "../../../config";
import ApiError from "../../../errors/ApiError";
import catchAsync from "../../../shared/catchAsync";
import prisma from "../../../shared/prisma";
import sendResponse from "../../../shared/sendResponse";
import { BkashService } from "./bkash.service";

/**
 * POST /api/v1/bkash/create-payment
 * Body: { orderId: string }
 * Creates a bKash payment session for an existing pending order and returns
 * the hosted payment URL for the frontend to redirect the user to.
 */
const initiatePayment = catchAsync(async (req: Request, res: Response) => {
  const { orderId } = req.body as { orderId: string };

  if (!orderId) {
    throw new ApiError(httpStatus.BAD_REQUEST, "orderId is required");
  }

  const order = await prisma.order.findUnique({ where: { id: orderId } });

  if (!order) {
    throw new ApiError(httpStatus.NOT_FOUND, "Order not found");
  }

  if (order.paymentMethod !== "BKASH") {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Order payment method is not bKash",
    );
  }

  if (order.paymentStatus === "paid") {
    throw new ApiError(httpStatus.CONFLICT, "Order is already paid");
  }

  const amount = Number(order.totalAmount);
  const { bkashURL, paymentID } = await BkashService.createPayment(
    orderId,
    amount,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "bKash payment initiated successfully",
    data: { bkashURL, paymentID },
  });
});

/**
 * GET /api/v1/bkash/callback
 * Called by bKash after the user completes, cancels, or fails payment.
 * Executes the payment on success; updates order paymentStatus accordingly;
 * then redirects the browser to the appropriate frontend page.
 */
const handleCallback = async (req: Request, res: Response) => {
  const { paymentID, status } = req.query as {
    paymentID: string;
    status: string;
  };

  const frontendUrl = config.frontendUrl;

  if (!paymentID) {
    return res.redirect(
      `${frontendUrl}/checkout?bkashError=missing_payment_id`,
    );
  }

  if (status === "cancel" || status === "failure") {
    // Find the pending order for this paymentID and mark it cancelled.
    const order = await prisma.order.findFirst({
      where: { transactionId: paymentID },
    });

    if (order) {
      await prisma.order.update({
        where: { id: order.id },
        data: {
          status: "cancelled",
          paymentStatus: "failed",
        },
      });
    }

    // Send the user back to checkout so they can retry with their cart intact.
    const errorKey = status === "cancel" ? "payment_cancel" : "payment_failure";
    return res.redirect(`${frontendUrl}/checkout?bkashError=${errorKey}`);
  }

  // status === 'success' — execute (capture) the payment
  try {
    const executeResponse = await BkashService.executePayment(paymentID);

    if (executeResponse.transactionStatus === "Completed") {
      const orderId = executeResponse.merchantInvoiceNumber;

      const updatedOrder = await prisma.order.update({
        where: { id: orderId },
        data: {
          paymentStatus: "paid",
          transactionId: executeResponse.trxID,
          paymentGatewayResponse: JSON.stringify(executeResponse),
        },
      });

      const trackingParam = updatedOrder.trackingNumber
        ? `&trackingNumber=${encodeURIComponent(updatedOrder.trackingNumber)}`
        : "";

      return res.redirect(
        `${frontendUrl}/order-success?orderId=${orderId}${trackingParam}`,
      );
    }

    // bKash returned success status but execute says not completed — send back to checkout.
    const order = await prisma.order.findFirst({
      where: { transactionId: paymentID },
    });

    if (order) {
      await prisma.order.update({
        where: { id: order.id },
        data: {
          status: "cancelled",
          paymentStatus: "failed",
          paymentGatewayResponse: JSON.stringify(executeResponse),
        },
      });
    }

    return res.redirect(
      `${frontendUrl}/checkout?bkashError=execute_incomplete`,
    );
  } catch (error) {
    console.error("bKash execute payment failed:", error);

    // Attempt to mark order as failed
    const order = await prisma.order.findFirst({
      where: { transactionId: paymentID },
    });

    if (order) {
      await prisma.order
        .update({
          where: { id: order.id },
          data: { status: "cancelled", paymentStatus: "failed" },
        })
        .catch((updateErr) =>
          console.error("Failed to mark order as cancelled:", updateErr),
        );
    }

    return res.redirect(`${frontendUrl}/checkout?bkashError=execute_failed`);
  }
};

export const BkashController = {
  initiatePayment,
  handleCallback,
};
