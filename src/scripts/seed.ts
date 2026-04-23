// src/scripts/seed.ts
import { AdminRole, PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import config from "../config";

const prisma = new PrismaClient();

async function seedAdmin() {
  try {
    console.log("🌱 Starting admin seeding...");

    // Check if super admin already exists
    const existingSuperAdmin = await prisma.admin.findFirst({
      where: {
        role: AdminRole.ADMIN,
      },
    });

    if (existingSuperAdmin) {
      console.log("✅ Super admin already exists, skipping seeding");
      return;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(
      "password123", // Default password - should be changed in production
      Number(config.bcrypt_salt_rounds),
    );

    // Create super admin
    const superAdmin = await prisma.admin.create({
      data: {
        name: "Super Admin",
        email: "admin@example.com",
        password: hashedPassword,
        role: AdminRole.ADMIN,
      },
    });

    console.log("✅ Super admin created successfully!");
    console.log("📧 Email: admin@example.com");
    console.log("🔑 Password: password123");
    console.log("⚠️  Please change the default password after first login!");

    // Optionally create additional admin accounts
    const adminAccounts = [
      {
        name: "Admin User",
        email: "admin@atkiaszone.com",
        password: "admin123",
        role: AdminRole.ADMIN,
      },
      {
        name: "Editor User",
        email: "editor@atkiaszone.com",
        password: "editor123",
        role: AdminRole.EDITOR,
      },
    ];

    for (const account of adminAccounts) {
      const existingAccount = await prisma.admin.findUnique({
        where: { email: account.email },
      });

      if (!existingAccount) {
        const hashedPassword = await bcrypt.hash(
          account.password,
          Number(config.bcrypt_salt_rounds),
        );

        await prisma.admin.create({
          data: {
            ...account,
            password: hashedPassword,
          },
        });

        console.log(`✅ ${account.role} created: ${account.email}`);
      } else {
        console.log(`⏭️  ${account.role} already exists: ${account.email}`);
      }
    }

    console.log("🎉 Admin seeding completed successfully!");
  } catch (error) {
    console.error("❌ Error seeding admin:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seed function
if (require.main === module) {
  seedAdmin()
    .then(() => {
      console.log("✅ Seed script completed");
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ Seed script failed:", error);
      process.exit(1);
    });
}

export default seedAdmin;
