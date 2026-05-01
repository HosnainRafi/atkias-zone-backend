// src/scripts/seed.ts
import { AdminRole, PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import config from '../config';

const prisma = new PrismaClient();

async function seedAdmin() {
  try {
    console.log('🌱 Starting admin seeding...');

    const defaultPassword = 'password123';
    const hashedPassword = await bcrypt.hash(
      defaultPassword,
      Number(config.bcrypt_salt_rounds),
    );

    const accounts = [
      {
        name: 'Super Admin',
        email: 'superadmin@atkiaszone.com',
        password: hashedPassword,
        role: AdminRole.SUPER_ADMIN,
        mustChangePassword: false,
      },
      {
        name: 'Admin',
        email: 'admin@atkiaszone.com',
        password: hashedPassword,
        role: AdminRole.ADMIN,
        mustChangePassword: false,
      },
      {
        name: 'Editor',
        email: 'editor@atkiaszone.com',
        password: hashedPassword,
        role: AdminRole.EDITOR,
        mustChangePassword: false,
      },
    ];

    for (const account of accounts) {
      const existing = await prisma.admin.findUnique({
        where: { email: account.email },
      });

      if (existing) {
        // Update existing account role and password
        await prisma.admin.update({
          where: { email: account.email },
          data: {
            role: account.role,
            password: account.password,
            mustChangePassword: false,
            isBlocked: false,
          },
        });
        console.log(`🔄 Updated ${account.role}: ${account.email}`);
      } else {
        await prisma.admin.create({ data: account });
        console.log(`✅ Created ${account.role}: ${account.email}`);
      }
    }

    console.log('\n🎉 Admin seeding completed!');
    console.log('─────────────────────────────────────');
    console.log('📧 superadmin@atkiaszone.com  → SUPER_ADMIN');
    console.log('📧 admin@atkiaszone.com       → ADMIN');
    console.log('📧 editor@atkiaszone.com      → EDITOR');
    console.log('🔑 Password for all: password123');
    console.log('─────────────────────────────────────');
  } catch (error) {
    console.error('❌ Error seeding admin:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seed function
if (require.main === module) {
  seedAdmin()
    .then(() => {
      console.log('✅ Seed script completed');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Seed script failed:', error);
      process.exit(1);
    });
}

export default seedAdmin;
