import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { hash } from 'bcrypt-ts';
import { logger } from '@/lib/logger';

export async function seedAdminUser() {
  try {
    const [existingAdmin] = await db
      .select()
      .from(users)
      .where(eq(users.email, 'admin@sitematiere.com'))
      .limit(1);

    if (!existingAdmin) {
      const hashedPassword = await hash('admin123', 12);
      await db.insert(users).values({
        email: 'admin@sitematiere.com',
        name: 'admin',
        passwordHash: hashedPassword,
        role: 'ADMIN',
        username: 'admin',
      });
      logger.info('Admin user created: admin@sitematiere.com / admin123');
    }
  } catch (error) {
    logger.error('Error seeding admin user:', error);
  }
}