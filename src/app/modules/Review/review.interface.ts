// src/app/modules/Review/review.interface.ts

export type TReview = {
  id?: string;
  productId: string;
  orderId: string;
  customerName: string;
  rating: number; // 1-5
  comment: string;
  isApproved: boolean;
  showOnHomepage: boolean;
  createdAt?: Date;
  updatedAt?: Date;
};

// This type matches the Zod validation input from req.body
export type TCreateReviewPayload = {
  productId: string;
  orderId: string;
  customerName: string;
  rating: number;
  comment: string;
};
