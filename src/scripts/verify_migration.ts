import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function verify() {
  try {
    const adminCount = await prisma.admin.count();
    const categoryCount = await prisma.category.count();
    const productCount = await prisma.product.count();
    const orderCount = await prisma.order.count();
    const orderItemCount = await prisma.orderItem.count();

    console.log("--- Verification ---");
    console.log(`Admins: ${adminCount}`);
    console.log(`Categories: ${categoryCount}`);
    console.log(`Products: ${productCount}`);
    console.log(`Orders: ${orderCount}`);
    console.log(`OrderItems: ${orderItemCount}`);

    const lastOrder = await prisma.order.findFirst({
      orderBy: { createdAt: "desc" },
      include: { statusHistories: true },
    });

    if (lastOrder) {
      console.log("\nLast Order:");
      console.log(`ID: ${lastOrder.id}`);
      console.log(`Customer: ${lastOrder.customerName}`);
      console.log(
        `History: ${(lastOrder as any).statusHistories?.length ?? 0}`,
      );
    }
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

verify();
