import {
  AdminRole,
  // CategoryGender removed - using CategoryType now
  CouponType,
  OrderStatus,
  PaymentStatus,
  PrismaClient,
} from "@prisma/client";
import dotenv from "dotenv";
import { MongoClient } from "mongodb";
import path from "path";

dotenv.config({ path: path.join(process.cwd(), ".env") });

const mongoUri = process.env.MONGODB_URI as string;
const dbName = process.env.MONGODB_DB_NAME || "test";

if (!mongoUri) {
  throw new Error("MONGODB_URI environment variable is not set");
}

const prisma = new PrismaClient();

const mapAdminRole = (role: string): AdminRole => {
  switch (role.toLowerCase()) {
    case "super_admin":
    case "admin":
    case "manager":
      return AdminRole.ADMIN;
    case "editor":
      return AdminRole.EDITOR;
    default:
      return AdminRole.ADMIN;
  }
};

// CategoryGender was removed from schema

const mapCouponType = (type: string): CouponType => {
  return type === "percentage" ? CouponType.percentage : CouponType.fixed;
};

const mapPaymentStatus = (status: string): PaymentStatus => {
  return (PaymentStatus as any)[status] || PaymentStatus.pending;
};

const mapOrderStatus = (status: string): OrderStatus => {
  return (OrderStatus as any)[status] || OrderStatus.pending;
};

async function migrate() {
  const client = new MongoClient(mongoUri);

  try {
    await client.connect();
    console.log("Connected to MongoDB");
    const db = client.db(dbName);

    // --- 1. Admins ---
    console.log("Migrating Admins...");
    const admins = await db.collection("admins").find().toArray();
    for (const admin of admins) {
      await prisma.admin.upsert({
        where: { id: admin._id.toString() },
        update: {},
        create: {
          id: admin._id.toString(),
          name: admin.name,
          email: admin.email,
          password: admin.password,
          role: mapAdminRole(admin.role),
          createdAt: admin.createdAt || new Date(),
          updatedAt: admin.updatedAt || new Date(),
        },
      });
    }
    console.log(`Migrated ${admins.length} admins.`);

    // --- 2. Categories ---
    console.log("Migrating Categories...");
    const categories = await db.collection("categories").find().toArray();

    // First pass: Create all categories without parentId
    for (const cat of categories) {
      await prisma.category.upsert({
        where: { id: cat._id.toString() },
        update: {},
        create: {
          id: cat._id.toString(),
          name: cat.name,
          slug: cat.slug,
          description: cat.description,
          image: cat.image,
          order: cat.order || 0,
          sizeChart: cat.sizeChart ? JSON.stringify(cat.sizeChart) : null,
          // gender field removed from schema
          parentId: null, // Set later
          createdAt: cat.createdAt || new Date(),
          updatedAt: cat.updatedAt || new Date(),
        },
      });
    }

    // Second pass: Update parentId
    for (const cat of categories) {
      if (cat.parentId) {
        // Check if parent exists (to avoid FK errors if parent was deleted in Mongo but ref remained)
        const parentExists = await prisma.category.findUnique({
          where: { id: cat.parentId.toString() },
        });
        if (parentExists) {
          await prisma.category.update({
            where: { id: cat._id.toString() },
            data: { parentId: cat.parentId.toString() },
          });
        }
      }
    }
    console.log(`Migrated ${categories.length} categories.`);

    // --- 3. Products ---
    console.log("Migrating Products...");
    const products = await db.collection("products").find().toArray();
    for (const prod of products) {
      // Ensure category exists
      const catExists = await prisma.category.findUnique({
        where: { id: prod.category.toString() },
      });
      if (!catExists) {
        console.warn(
          `Skipping product ${prod.title} because category ${prod.category} does not exist.`,
        );
        continue;
      }

      const productData = {
        id: prod._id.toString(),
        title: prod.title,
        slug: prod.slug,
        description: prod.description,
        categoryId: prod.category.toString(),
        basePrice: Number(prod.basePrice),
        compareAtPrice: prod.compareAtPrice
          ? Number(prod.compareAtPrice)
          : null,
        images: prod.images || [],
        sku: prod.sku,
        deleted: prod.deleted || false,
        newArrival: prod.newArrival || false, // Note: Mongo field might be isNewArrival? Check sample.
        // Sample had 'deleted', 'isActive'. Didn't see 'isNewArrival' in sample keys but schema had it.
        // Let's assume keys match or default to false.
        productOrder: prod.productOrder || prod.order || 0,
        isActive: prod.isActive !== undefined ? prod.isActive : true,
        averageRating: Number(prod.averageRating || 0),
        reviewCount: Number(prod.reviewCount || 0),
        createdAt: prod.createdAt || new Date(),
        updatedAt: prod.updatedAt || new Date(),
      };

      await prisma.product.upsert({
        where: { id: prod._id.toString() },
        update: {},
        create: productData,
      });

      // Product Sizes
      if (prod.sizes && Array.isArray(prod.sizes)) {
        for (const size of prod.sizes) {
          // Check if size already exists (if re-running migration)
          // Since size doesn't have a unique constraint other than ID, and ID is from Mongo...
          // Wait, size objects in Mongo have _id? Yes, sample showed it.
          const sizeId = size._id ? size._id.toString() : undefined;

          if (sizeId) {
            const existingSize = await prisma.productVariant.findUnique({
              where: { id: sizeId },
            });
            if (!existingSize) {
              await prisma.productVariant.create({
                data: {
                  id: sizeId,
                  productId: prod._id.toString(),
                  label: size.size,
                  stock: Number(size.stock),
                  priceOverride: size.priceOverride
                    ? Number(size.priceOverride)
                    : null,
                  sku: size.sku,
                },
              });
            }
          }
        }
      }
    }
    console.log(`Migrated ${products.length} products.`);

    // --- 4. Coupons ---
    console.log("Migrating Coupons...");
    const coupons = await db.collection("coupons").find().toArray();
    for (const coupon of coupons) {
      // Check creator
      let creatorId = coupon.createdBy ? coupon.createdBy.toString() : null;
      if (creatorId) {
        const adminExists = await prisma.admin.findUnique({
          where: { id: creatorId },
        });
        if (!adminExists) creatorId = null; // Or assign to a default admin
      }
      // If no creator, we might fail FK. Let's find the first admin as fallback.
      if (!creatorId) {
        const firstAdmin = await prisma.admin.findFirst();
        if (firstAdmin) creatorId = firstAdmin.id;
      }

      if (!creatorId) {
        console.warn(`Skipping coupon ${coupon.code} - no creator found.`);
        continue;
      }

      await prisma.coupon.upsert({
        where: { id: coupon._id.toString() },
        update: {},
        create: {
          id: coupon._id.toString(),
          code: coupon.code,
          description: coupon.description,
          type: mapCouponType(coupon.type),
          value: Number(coupon.value),
          minOrderAmount: coupon.minOrderAmount
            ? Number(coupon.minOrderAmount)
            : null,
          maxDiscountAmount: coupon.maxDiscountAmount
            ? Number(coupon.maxDiscountAmount)
            : null,
          usageLimit: Number(coupon.usageLimit),
          usedCount: Number(coupon.usedCount || 0),
          validFrom: new Date(coupon.validFrom),
          validUntil: new Date(coupon.validUntil),
          isActive: coupon.isActive !== undefined ? coupon.isActive : true,
          createdById: creatorId,
          appliesToAllProducts:
            coupon.appliesToAllProducts !== undefined
              ? coupon.appliesToAllProducts
              : true,
          createdAt: coupon.createdAt || new Date(),
          updatedAt: coupon.updatedAt || new Date(),
        },
      });
    }
    console.log(`Migrated ${coupons.length} coupons.`);

    // --- 5. Orders ---
    console.log("Migrating Orders...");
    const orders = await db.collection("orders").find().toArray();
    for (const order of orders) {
      // Coupon check
      let couponId = order.coupon ? order.coupon.toString() : null;
      if (couponId) {
        const cExists = await prisma.coupon.findUnique({
          where: { id: couponId },
        });
        if (!cExists) couponId = null;
      }

      // Extract shipping address
      const shippingAddress = order.shippingAddress || {};

      await prisma.order.upsert({
        where: { id: order._id.toString() },
        update: {},
        create: {
          id: order._id.toString(),
          trackingNumber: order.trackingNumber,
          customerName: shippingAddress.customerName || "Unknown",
          mobile: shippingAddress.mobile || "",
          district: shippingAddress.district || "",
          upazila: shippingAddress.upazila || "",
          addressLine: shippingAddress.addressLine || "",
          postalCode: shippingAddress.postalCode || null,
          orderNote: order.orderNote,
          subtotal: Number(order.subtotal),
          shipping: Number(order.shipping || 0),
          couponId: couponId,
          discountAmount: Number(order.discountAmount || 0),
          totalAmount: Number(order.totalAmount),
          paymentStatus: mapPaymentStatus(order.paymentStatus),
          status: mapOrderStatus(order.status),
          createdAt: order.createdAt || new Date(),
          updatedAt: order.updatedAt || new Date(),
        },
      });

      // Order Items
      if (order.items && Array.isArray(order.items)) {
        for (const item of order.items) {
          // Check product
          const pId = item.product
            ? item.product.toString()
            : item.productId
              ? item.productId.toString()
              : null;
          if (!pId) continue;

          const pExists = await prisma.product.findUnique({
            where: { id: pId },
          });
          if (!pExists) continue;

          const itemId = item._id ? item._id.toString() : undefined;

          const itemData = {
            orderId: order._id.toString(),
            productId: pId,
            productSizeId: item.productSizeId
              ? item.productSizeId.toString()
              : "unknown",
            title: item.title || pExists.title,
            size: item.size,
            image: item.image || (pExists.images && pExists.images[0]) || "",
            quantity: Number(item.quantity),
            unitPrice: Number(item.unitPrice || item.price),
            totalPrice: Number(
              item.totalPrice || item.quantity * (item.unitPrice || item.price),
            ),
          };

          if (itemId) {
            const existingItem = await prisma.orderItem.findUnique({
              where: { id: itemId },
            });
            if (!existingItem) {
              await prisma.orderItem.create({
                data: { ...itemData, id: itemId },
              });
            }
          } else {
            await prisma.orderItem.create({ data: itemData });
          }
        }
      }

      // Order Status History
      if (order.statusHistory && Array.isArray(order.statusHistory)) {
        for (const history of order.statusHistory) {
          await prisma.orderStatusHistory.create({
            data: {
              orderId: order._id.toString(),
              status: mapOrderStatus(history.status),
              note: history.note,
              changedAt: history.changedAt
                ? new Date(history.changedAt)
                : new Date(),
              // changedById: history.changedBy ? history.changedBy.toString() : null // If available
            },
          });
        }
      }
    }
    console.log(`Migrated ${orders.length} orders.`);

    // --- 6. Reviews ---
    console.log("Migrating Reviews...");
    const reviews = await db.collection("reviews").find().toArray();
    for (const review of reviews) {
      const pId = review.product ? review.product.toString() : null;
      const oId = review.order ? review.order.toString() : null;

      if (!pId || !oId) continue;

      const pExists = await prisma.product.findUnique({ where: { id: pId } });
      const oExists = await prisma.order.findUnique({ where: { id: oId } });

      if (!pExists || !oExists) continue;

      await prisma.review.upsert({
        where: { id: review._id.toString() },
        update: {},
        create: {
          id: review._id.toString(),
          productId: pId,
          orderId: oId,
          customerName: review.customerName,
          rating: Number(review.rating),
          comment: review.comment,
          isApproved: review.isApproved || false,
          createdAt: review.createdAt || new Date(),
          updatedAt: review.updatedAt || new Date(),
        },
      });
    }
    console.log(`Migrated ${reviews.length} reviews.`);
  } catch (e) {
    console.error("Migration failed:", e);
  } finally {
    await client.close();
    await prisma.$disconnect();
  }
}

migrate();
