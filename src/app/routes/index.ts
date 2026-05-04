// src/app/routes/index.ts
import express from "express";
import { AdminRoutes } from "../modules/Admin/admin.route";
import { AnalyticsRoutes } from "../modules/Analytics/analytics.route";
import { AnnouncementRoutes } from "../modules/Announcement/announcement.route";
import { BannerRoutes } from "../modules/Banner/banner.route";
import { BkashRoutes } from "../modules/Bkash/bkash.route";
import { BrandRoutes } from "../modules/Brand/brand.route";
import { CategoryRoutes } from "../modules/Category/category.route";
import { CouponRoutes } from "../modules/Coupon/coupon.route";
import { DeliveryChargeRoutes } from "../modules/DeliveryCharge/deliveryCharge.route";
import { HomepageSectionRoutes } from "../modules/HomepageSection/homepageSection.route";
import { OrderRoutes } from "../modules/Order/order.route";
import { ProductRoutes } from "../modules/Product/product.route";
import { ReviewRoutes } from "../modules/Review/review.route";
import { TagRoutes } from "../modules/Tag/tag.route";
import { UploadRoutes } from "../modules/Upload/upload.routes";
import { VisitorRoutes } from "../modules/Visitor/visitor.route";
import { YoutubeVideoRoutes } from "../modules/YoutubeVideo/youtubeVideo.route";

const router = express.Router();

const moduleRoutes = [
  { path: "/admin", route: AdminRoutes },
  { path: "/analytics", route: AnalyticsRoutes },
  { path: "/categories", route: CategoryRoutes },
  { path: "/products", route: ProductRoutes },
  { path: "/brands", route: BrandRoutes },
  { path: "/coupons", route: CouponRoutes },
  { path: "/delivery-charge", route: DeliveryChargeRoutes },
  { path: "/orders", route: OrderRoutes },
  { path: "/reviews", route: ReviewRoutes },
  { path: "/tags", route: TagRoutes },
  { path: "/banners", route: BannerRoutes },
  { path: "/homepage-sections", route: HomepageSectionRoutes },
  { path: "/youtube-videos", route: YoutubeVideoRoutes },
  { path: "/announcements", route: AnnouncementRoutes },
  { path: "/upload", route: UploadRoutes },
  { path: "/visitors", route: VisitorRoutes },
  { path: "/bkash", route: BkashRoutes },
];

moduleRoutes.forEach((route) => router.use(route.path, route.route));

export default router;
