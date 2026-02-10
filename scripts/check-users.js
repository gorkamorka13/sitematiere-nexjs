const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function checkAndCreateUser() {
  try {
    // Check if users exist
    const userCount = await prisma.user.count();
    console.log(`Found ${userCount} users in database`);
    
    if (userCount === 0) {
      console.log('Creating default admin user...');
      
      const hashedPassword = await bcrypt.hash('admin123', 12);
      
      const user = await prisma.user.create({
        data: {
          email: 'admin@sitematiere.com',
          name: 'Admin User',
          passwordHash: hashedPassword,
          role: 'ADMIN'
        }
      });
      
      console.log('Created admin user:', user.email);
      console.log('Password: admin123');
      console.log('Please change this password after first login!');
    } else {
      const users = await prisma.user.findMany({
        select: { id: true, email: true, name: true, role: true }
      });
      console.log('Existing users:');
      users.forEach(user => {
        console.log(`- ${user.email} (${user.role})`);
      });
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAndCreateUser();