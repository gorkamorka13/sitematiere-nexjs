import prisma from '@/lib/prisma';
import { hash } from 'bcrypt-ts';

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
      console.log('Admin user created: admin@sitematiere.com / admin123');
    }
  } catch (error) {
    console.error('Error seeding admin user:', error);
  }
}
