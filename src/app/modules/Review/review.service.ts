// src/app/modules/Review/review.service.ts
import httpStatus from "http-status";
import ApiError from "../../../errors/ApiError";
import prisma from "../../../shared/prisma";
import { TCreateReviewPayload, TReview } from "./review.interface";

// --- Helper: Calculate Average Rating ---
const calculateAverageRating = async (productId: string) => {
  const stats = await prisma.review.aggregate({
    where: {
      productId: productId,
      isApproved: true,
    },
    _avg: {
      rating: true,
    },
    _count: {
      rating: true,
    },
  });

  const reviewCount = stats._count.rating;
  const averageRating = stats._avg.rating
    ? parseFloat(stats._avg.rating.toFixed(1))
    : 0;

  await prisma.product.update({
    where: { id: productId },
    data: {
      reviewCount,
      averageRating,
    },
  });
};

// --- Create Review (Public) ---
const createReviewIntoDB = async (
  payload: TCreateReviewPayload
): Promise<TReview> => {
  const { orderId, productId, customerName, rating, comment } = payload;

  // 1. Verify the order
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });

  if (!order) {
    throw new ApiError(httpStatus.NOT_FOUND, "Order not found.");
  }

  // 2. Check if order is delivered
  if (order.status !== "delivered") {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "You can only review delivered orders."
    );
  }

  // 3. Verify the product exists in the order
  const productInOrder = order.items.find(
    (item) => item.productId === productId
  );
  if (!productInOrder) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "This product was not found in your order."
    );
  }

  // 4. Check for duplicate review
  const existingReview = await prisma.review.findUnique({
    where: {
      productId_orderId: {
        productId,
        orderId,
      },
    },
  });

  if (existingReview) {
    throw new ApiError(
      httpStatus.CONFLICT,
      "You have already reviewed this product for this order."
    );
  }

  // 5. Create the review
  const result = await prisma.review.create({
    data: {
      productId,
      orderId,
      customerName,
      rating,
      comment,
      isApproved: false, // Admin must approve
    },
  });

  // Note: We don't calculate average rating here because it's not approved yet.

  return result as unknown as TReview;
};

// --- Get Approved Reviews for a Product (Public) ---
const getApprovedReviewsForProduct = async (
  productId: string
): Promise<TReview[]> => {
  const result = await prisma.review.findMany({
    where: {
      productId,
      isApproved: true,
    },
    orderBy: { createdAt: "desc" },
  });
  return result as unknown as TReview[];
};

// --- Get All Reviews (Admin) ---
const getAllReviewsFromDB = async (): Promise<TReview[]> => {
  const result = await prisma.review.findMany({
    include: {
      product: {
        select: {
          title: true,
          slug: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
  return result as unknown as TReview[];
};

// --- Update Review (Admin) ---
const updateReviewInDB = async (
  reviewId: string,
  payload: Partial<Pick<TReview, "isApproved" | "comment">>
): Promise<TReview | null> => {
  const review = await prisma.review.findUnique({ where: { id: reviewId } });
  if (!review) {
    throw new ApiError(httpStatus.NOT_FOUND, "Review not found.");
  }

  const result = await prisma.review.update({
    where: { id: reviewId },
    data: payload,
  });

  // Recalculate average rating if approval status changed
  if (payload.isApproved !== undefined) {
    await calculateAverageRating(review.productId);
  }

  return result as unknown as TReview;
};

// --- Delete Review (Admin) ---
const deleteReviewFromDB = async (id: string): Promise<TReview | null> => {
  const review = await prisma.review.findUnique({ where: { id } });
  if (!review) {
    throw new ApiError(httpStatus.NOT_FOUND, "Review not found.");
  }

  const result = await prisma.review.delete({
    where: { id },
  });

  // Recalculate average rating
  await calculateAverageRating(review.productId);

  return result as unknown as TReview;
};

export const ReviewService = {
  createReviewIntoDB,
  getApprovedReviewsForProduct,
  getAllReviewsFromDB,
  updateReviewInDB,
  deleteReviewFromDB,
};
