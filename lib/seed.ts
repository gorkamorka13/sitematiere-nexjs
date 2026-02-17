import prisma from '@/lib/prisma';
import { hash } from 'bcrypt-ts';
import { logger } from '@/lib/logger';

export async function seedAdminUser() {
  try {
    // Check if admin user exists
    const existingAdmin = await prisma.user.findUnique({
      where: { email: 'admin@sitematiere.com' }
    });

    if (!existingAdmin) {
      // Create admin user
      const hashedPassword = await hash('admin123', 12);
      await prisma.user.create({
        data: {
          email: 'admin@sitematiere.com',
          name: 'admin',
          passwordHash: hashedPassword,
          role: 'ADMIN'
        }
      });
      logger.info('Admin user created: admin@sitematiere.com / admin123');
    }
  } catch (error) {
    logger.error('Error seeding admin user:', error);
  }
}
